import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanFace, Fingerprint, ArrowRight, Clock, Users, CheckCircle2, AlertCircle, Loader2, Settings2, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type VerificationMode = "face" | "thumb" | "both" | "either";
type KioskSettings = {
  id?: string;
  company_id: string;
  verification_mode: VerificationMode;
  max_enrollment_attempts: number;
  max_verify_retries: number;
};

type KioskStats = {
  totalEnrolled: number;
  todayCheckIns: number;
  todayCheckOuts: number;
};

type KioskRecord = {
  id: string;
  user_name: string;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  notes: string | null;
};

export default function AdminHRAssistancePanel({ companyId }: { companyId: string }) {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<KioskStats>({ totalEnrolled: 0, todayCheckIns: 0, todayCheckOuts: 0 });
  const [recentRecords, setRecentRecords] = useState<KioskRecord[]>([]);
  const [settings, setSettings] = useState<KioskSettings>({
    company_id: companyId,
    verification_mode: "either",
    max_enrollment_attempts: 3,
    max_verify_retries: 3,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const todayKey = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    (async () => {
      try {
        // Count biometric enrollments for this company
        const { count: enrolledCount, error: e1 } = await supabase
          .from("biometric_enrollments")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId);

        // Count today's check-ins via kiosk
        const { count: checkInCount, error: e2 } = await supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("work_date", todayKey)
          .eq("location", "office-kiosk")
          .not("check_in_at", "is", null);

        // Count today's check-outs via kiosk
        const { count: checkOutCount, error: e3 } = await supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("work_date", todayKey)
          .eq("location", "office-kiosk")
          .not("check_out_at", "is", null);

        // Recent kiosk records
        const { data: records, error: e4 } = await supabase
          .from("attendance_records")
          .select("id,user_name,work_date,check_in_at,check_out_at,notes")
          .eq("company_id", companyId)
          .eq("location", "office-kiosk")
          .order("work_date", { ascending: false })
          .limit(10);

        if (e1) throw e1;
        if (e2) throw e2;
        if (e3) throw e3;
        if (e4) throw e4;

        // Load settings (optional row)
        const { data: s } = await supabase
          .from("hr_kiosk_settings")
          .select("id,company_id,verification_mode,max_enrollment_attempts,max_verify_retries")
          .eq("company_id", companyId)
          .maybeSingle();
        if (s) setSettings(s as KioskSettings);

        setStats({
          totalEnrolled: enrolledCount ?? 0,
          todayCheckIns: checkInCount ?? 0,
          todayCheckOuts: checkOutCount ?? 0,
        });
        setRecentRecords((records as KioskRecord[]) ?? []);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load kiosk data");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const payload = {
        company_id: companyId,
        verification_mode: settings.verification_mode,
        max_enrollment_attempts: settings.max_enrollment_attempts,
        max_verify_retries: settings.max_verify_retries,
        updated_by: auth?.user?.id ?? null,
      };
      const { data, error } = await supabase
        .from("hr_kiosk_settings")
        .upsert(payload, { onConflict: "company_id" })
        .select("id,company_id,verification_mode,max_enrollment_attempts,max_verify_retries")
        .single();
      if (error) throw error;
      setSettings(data as KioskSettings);
      toast.success("Kiosk settings saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight">HR Assistance</h2>
          <p className="text-sm text-muted-foreground">Office Kiosk · Face + Thumb biometric login</p>
        </div>
      </div>

      {/* Kiosk Launch Card */}
      <section className="rounded-3xl border border-border bg-surface-raised p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-extrabold">Office Kiosk</h3>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Employees can check-in and check-out using face recognition or thumb impression on any shared device.
              Ensure employees enroll their biometrics first.
            </p>
          </div>
          <button
            onClick={() => nav("/office-kiosk")}
            className="focus-premium inline-flex shrink-0 items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-card transition hover:opacity-90"
          >
            <ScanFace className="h-4 w-4" />
            Launch Kiosk
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-background/60 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Enrolled
            </div>
            <div className="mt-1 font-display text-2xl font-extrabold">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : stats.totalEnrolled}
            </div>
          </div>
          <div className="rounded-2xl bg-background/60 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Check-ins Today
            </div>
            <div className="mt-1 font-display text-2xl font-extrabold">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : stats.todayCheckIns}
            </div>
          </div>
          <div className="rounded-2xl bg-background/60 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-amber-500" /> Check-outs Today
            </div>
            <div className="mt-1 font-display text-2xl font-extrabold">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : stats.todayCheckOuts}
            </div>
          </div>
        </div>
      </section>

      {/* Quick guide */}
      <section className="rounded-3xl border border-border bg-card p-5">
        <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-muted-foreground">How it works</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-raised p-4">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-xs font-extrabold">1</span>
            </div>
            <p className="text-sm font-extrabold">Employee Enrollment</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Each employee enrolls their face and thumb once. Data is stored securely per-user.
            </p>
          </div>
          <div className="rounded-2xl bg-surface-raised p-4">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-xs font-extrabold">2</span>
            </div>
            <p className="text-sm font-extrabold">Verify Identity</p>
            <p className="mt-1 text-xs text-muted-foreground">
              At the kiosk, employees choose Face Attendance or Thumb Attendance to verify.
            </p>
          </div>
          <div className="rounded-2xl bg-surface-raised p-4">
            <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-xs font-extrabold">3</span>
            </div>
            <p className="text-sm font-extrabold">Log In / Out</p>
            <p className="mt-1 text-xs text-muted-foreground">
              After verification, employees tap Logged In or Logged Out. Attendance is recorded instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section className="rounded-3xl border border-border bg-card p-5">
        <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Recent Kiosk Activity</h3>
        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : recentRecords.length === 0 ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface-raised p-4 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" /> No kiosk activity yet.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4">Employee</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Check-in</th>
                  <th className="pb-2 pr-4">Check-out</th>
                  <th className="pb-2">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentRecords.map((r) => (
                  <tr key={r.id} className="text-foreground">
                    <td className="py-2 pr-4 font-bold">{r.user_name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.work_date}</td>
                    <td className="py-2 pr-4">
                      {r.check_in_at ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {format(new Date(r.check_in_at), "hh:mm a")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {r.check_out_at ? (
                        <span className="inline-flex items-center gap-1 text-amber-600">
                          <Clock className="h-3.5 w-3.5" /> {format(new Date(r.check_out_at), "hh:mm a")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-1 text-xs">
                        {r.notes?.includes("Face") ? (
                          <><ScanFace className="h-3.5 w-3.5" /> Face</>
                        ) : r.notes?.includes("Thumb") ? (
                          <><Fingerprint className="h-3.5 w-3.5" /> Thumb</>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
