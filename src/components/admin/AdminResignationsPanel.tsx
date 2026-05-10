import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, CheckCircle2 } from "lucide-react";

type Employee = {
  id: string;
  display_name: string;
  email: string | null;
  employee_code: string | null;
  resignation_date: string | null;
  last_working_day: string | null;
  exit_status: string | null;
  exit_checklist: any;
  status: string;
};

const CHECKLIST = [
  { key: "assets", label: "Assets returned" },
  { key: "fnf", label: "Full & Final settled" },
  { key: "exit_interview", label: "Exit interview done" },
  { key: "access_revoked", label: "System access revoked" },
];

export default function AdminResignationsPanel({ companyId }: { companyId: string }) {
  const [emps, setEmps] = useState<Employee[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "notice" | "exited">("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employee_profiles")
      .select("id,display_name,email,employee_code,resignation_date,last_working_day,exit_status,exit_checklist,status")
      .eq("company_id", companyId)
      .order("display_name");
    if (error) toast.error("Load failed", { description: error.message });
    setEmps((data ?? []) as Employee[]);
    setLoading(false);
  };

  useEffect(() => { if (companyId) load(); }, [companyId]);

  const update = async (id: string, patch: Partial<Employee>) => {
    const { error } = await supabase.from("employee_profiles").update(patch).eq("id", id);
    if (error) return toast.error("Update failed", { description: error.message });
    toast.success("Saved");
    load();
  };

  const toggleCheck = (e: Employee, key: string) => {
    const cur = (e.exit_checklist ?? {}) as Record<string, boolean>;
    update(e.id, { exit_checklist: { ...cur, [key]: !cur[key] } as any });
  };

  const filtered = emps.filter((e) => {
    if (filter === "all") return true;
    if (filter === "active") return !e.resignation_date;
    if (filter === "notice") return !!e.resignation_date && (!e.exit_status || e.exit_status === "notice");
    if (filter === "exited") return e.exit_status === "exited";
    return true;
  });

  if (loading) return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LogOut className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-extrabold">Resignation sign-off</h3>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-bold">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="notice">On notice</option>
          <option value="exited">Exited</option>
        </select>
      </div>
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No employees match.</p>}
        {filtered.map((e) => {
          const cur = (e.exit_checklist ?? {}) as Record<string, boolean>;
          const done = CHECKLIST.every((c) => cur[c.key]);
          return (
            <div key={e.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">{e.display_name} <span className="font-mono text-[10px] text-muted-foreground">{e.employee_code}</span></p>
                  <p className="truncate text-xs text-muted-foreground">{e.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  e.exit_status === "exited" ? "bg-destructive/10 text-destructive" :
                  e.resignation_date ? "bg-amber-500/10 text-amber-600" : "bg-success/10 text-success"
                }`}>
                  {e.exit_status === "exited" ? "Exited" : e.resignation_date ? "Notice" : "Active"}
                </span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Resignation date</span>
                  <input type="date" value={e.resignation_date ?? ""} onChange={(ev) => update(e.id, { resignation_date: ev.target.value || null })}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Last working day</span>
                  <input type="date" value={e.last_working_day ?? ""} onChange={(ev) => update(e.id, { last_working_day: ev.target.value || null })}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Status</span>
                  <select value={e.exit_status ?? ""} onChange={(ev) => update(e.id, { exit_status: ev.target.value || null })}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs">
                    <option value="">—</option>
                    <option value="notice">Notice period</option>
                    <option value="exited">Exited</option>
                    <option value="absconded">Absconded</option>
                  </select>
                </label>
              </div>
              {(e.resignation_date || e.exit_status) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {CHECKLIST.map((c) => (
                    <button key={c.key} onClick={() => toggleCheck(e, c.key)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${cur[c.key] ? "bg-success text-success-foreground" : "border border-border text-muted-foreground"}`}>
                      <CheckCircle2 className="h-3 w-3" /> {c.label}
                    </button>
                  ))}
                  {done && <span className="text-[10px] font-bold text-success">Sign-off complete</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
