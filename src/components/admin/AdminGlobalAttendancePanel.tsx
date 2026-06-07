import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Clock, Loader2, RefreshCw, ScanFace, Fingerprint, UserCheck, LogIn, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BiometricCheckIn from "@/components/BiometricCheckIn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Employee = {
  id: string;
  user_id: string | null;
  display_name: string;
  email: string | null;
  employee_code: string | null;
};

type AttRow = {
  id: string;
  user_id: string | null;
  user_name: string;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  notes: string | null;
  status: string | null;
};

type Verified = { employee: Employee; method: "face" | "thumb" } | null;

export default function AdminGlobalAttendancePanel({ companyId }: { companyId: string }) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Biometric attendance flow
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [verified, setVerified] = useState<Verified>(null);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: emps, error: e1 }, { data: atts, error: e2 }] = await Promise.all([
        supabase
          .from("employee_profiles")
          .select("id,user_id,display_name,email,employee_code")
          .eq("company_id", companyId)
          .order("display_name", { ascending: true }),
        supabase
          .from("attendance_records")
          .select("id,user_id,user_name,work_date,check_in_at,check_out_at,notes,status")
          .eq("company_id", companyId)
          .eq("work_date", date),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setEmployees((emps as Employee[]) ?? []);
      setRecords((atts as AttRow[]) ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, date]);

  const recordByUser = useMemo(() => {
    const map = new Map<string, AttRow>();
    records.forEach((r) => {
      if (r.user_id) map.set(r.user_id, r);
    });
    return map;
  }, [records]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.display_name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q),
    );
  }, [employees, search]);

  const presentCount = useMemo(
    () => records.filter((r) => !!r.check_in_at).length,
    [records],
  );

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId],
  );

  const stamp = async (kind: "in" | "out") => {
    if (!verified) return;
    const emp = verified.employee;
    setWorking(true);
    try {
      const now = new Date().toISOString();
      const methodNote = `Global Attendance · ${verified.method === "face" ? "Face" : "Thumb"} verified`;
      const todayKey = date;
      const existing = records.find(
        (r) => r.user_id === emp.user_id && r.work_date === todayKey,
      );

      if (kind === "in") {
        if (existing?.check_in_at) {
          toast.error("Already signed in for this date");
        } else if (existing) {
          const { data, error } = await supabase
            .from("attendance_records")
            .update({ check_in_at: now, notes: methodNote, status: "present" })
            .eq("id", existing.id)
            .select("id,user_id,user_name,work_date,check_in_at,check_out_at,notes,status")
            .single();
          if (error) throw error;
          setRecords((prev) => prev.map((r) => (r.id === existing.id ? (data as AttRow) : r)));
          toast.success(`${emp.display_name} logged in at ${format(new Date(), "hh:mm a")}`);
        } else {
          const { data, error } = await supabase
            .from("attendance_records")
            .insert({
              company_id: companyId,
              user_id: emp.user_id,
              user_name: emp.display_name,
              work_date: todayKey,
              check_in_at: now,
              status: "present",
              location: "global-attendance",
              notes: methodNote,
            })
            .select("id,user_id,user_name,work_date,check_in_at,check_out_at,notes,status")
            .single();
          if (error) throw error;
          setRecords((prev) => [...prev, data as AttRow]);
          toast.success(`${emp.display_name} logged in at ${format(new Date(), "hh:mm a")}`);
        }
      } else {
        if (!existing?.check_in_at) {
          toast.error("Sign in first");
        } else if (existing.check_out_at) {
          toast.error("Already signed out");
        } else {
          const { data, error } = await supabase
            .from("attendance_records")
            .update({ check_out_at: now, notes: methodNote })
            .eq("id", existing.id)
            .select("id,user_id,user_name,work_date,check_in_at,check_out_at,notes,status")
            .single();
          if (error) throw error;
          setRecords((prev) => prev.map((r) => (r.id === existing.id ? (data as AttRow) : r)));
          toast.success(`${emp.display_name} logged out at ${format(new Date(), "hh:mm a")}`);
        }
      }
      setVerified(null);
      setSelectedEmployeeId("");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not record attendance");
    } finally {
      setWorking(false);
    }
  };

  const onVerified = (method: "face" | "thumb") => {
    if (!selectedEmployee) {
      toast.error("Select an employee first");
      return;
    }
    setVerified({ employee: selectedEmployee, method });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight">Global Attendance</h2>
          <p className="text-sm text-muted-foreground">
            Admin / HR view of every employee's attendance. Mark via Face or Thumb impression.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-[10px] font-bold uppercase">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-44" />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Access notice */}
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 text-primary" />
        This module is restricted to Admin and HR roles via the Admin Console.
      </div>

      {/* Biometric attendance card */}
      <section className="rounded-3xl border border-border bg-surface-raised p-5 shadow-card">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <h3 className="font-display text-base font-extrabold">Mark Attendance · Face or Thumb</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Select the employee, verify with Face Recognition or Thumb Impression, then confirm Logged In or Logged Out.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-[10px] font-bold uppercase">Employee</Label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => { setSelectedEmployeeId(e.target.value); setVerified(null); }}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">— Select an employee —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.display_name}{e.employee_code ? ` · ${e.employee_code}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <Label className="text-[10px] font-bold uppercase">Verification</Label>
            <div className="mt-1">
              <BiometricCheckIn
                disabled={!selectedEmployee || !!verified || working}
                onVerified={(m) => onVerified(m)}
              />
            </div>
          </div>
        </div>

        {verified && (
          <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  {verified.method === "face" ? <ScanFace className="h-5 w-5" /> : <Fingerprint className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-extrabold">{verified.employee.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {verified.employee.employee_code ?? verified.employee.email ?? "Identity verified"} · via {verified.method === "face" ? "Face" : "Thumb"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={working}
                  onClick={() => stamp("in")}
                  className="focus-premium inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white shadow-card transition hover:opacity-90 disabled:opacity-40"
                >
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  Logged In
                </button>
                <button
                  disabled={working}
                  onClick={() => stamp("out")}
                  className="focus-premium inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2 text-sm font-extrabold text-white shadow-card transition hover:opacity-90 disabled:opacity-40"
                >
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Logged Out
                </button>
                <button
                  disabled={working}
                  onClick={() => setVerified(null)}
                  className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Per-employee attendance table */}
      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
            Employee Attendance · {date}
          </h3>
          <span className="text-xs font-bold text-muted-foreground">
            {presentCount} / {employees.length} present
          </span>
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Check-in</th>
                <th className="px-3 py-2">Check-out</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </td></tr>
              )}
              {!loading && filteredEmployees.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No employees match.</td></tr>
              )}
              {!loading && filteredEmployees.map((emp) => {
                const rec = emp.user_id ? recordByUser.get(emp.user_id) : undefined;
                const method = rec?.notes?.includes("Face")
                  ? "face"
                  : rec?.notes?.includes("Thumb")
                  ? "thumb"
                  : null;
                return (
                  <tr key={emp.id} className="text-foreground">
                    <td className="px-3 py-2 font-bold">{emp.display_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{emp.employee_code ?? "—"}</td>
                    <td className="px-3 py-2">
                      {rec?.check_in_at ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {format(new Date(rec.check_in_at), "hh:mm a")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {rec?.check_out_at ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(rec.check_out_at), "hh:mm a")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {rec?.check_in_at ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                          Present
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                          Absent
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {method === "face" ? (
                        <span className="inline-flex items-center gap-1"><ScanFace className="h-3.5 w-3.5" /> Face</span>
                      ) : method === "thumb" ? (
                        <span className="inline-flex items-center gap-1"><Fingerprint className="h-3.5 w-3.5" /> Thumb</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
