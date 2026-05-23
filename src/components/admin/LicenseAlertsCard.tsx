import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, BellRing, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Alert = {
  id: string;
  license_id: string;
  software_name: string;
  expiry_date: string;
  days_remaining: number;
  severity: "expired" | "critical" | "warning" | string;
  message: string | null;
};

const SEVERITY: Record<string, { label: string; cls: string }> = {
  expired: { label: "Expired", cls: "bg-destructive/10 text-destructive border-destructive/30" },
  critical: { label: "Critical", cls: "bg-orange-100 text-orange-800 border-orange-300" },
  warning: { label: "Upcoming", cls: "bg-amber-100 text-amber-800 border-amber-300" },
};

export default function LicenseAlertsCard({ companyId }: { companyId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("it_license_alerts")
      .select("id, license_id, software_name, expiry_date, days_remaining, severity, message")
      .eq("company_id", companyId)
      .is("dismissed_at", null)
      .order("days_remaining", { ascending: true });
    if (error) toast.error(error.message);
    else setAlerts((data ?? []) as Alert[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  async function dismiss(id: string) {
    const { error } = await supabase
      .from("it_license_alerts")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setAlerts((a) => a.filter((x) => x.id !== id));
  }

  async function runScan() {
    setRefreshing(true);
    const { error } = await supabase.functions.invoke("license-expiry-reminders");
    if (error) toast.error(error.message);
    else toast.success("License scan complete");
    await load();
    setRefreshing(false);
  }

  if (loading && alerts.length === 0) return null;

  return (
    <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">License alerts</p>
            <h3 className="font-display text-lg font-extrabold">
              {alerts.length === 0 ? "All licenses up to date" : `${alerts.length} expiring or expired`}
            </h3>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={runScan} disabled={refreshing}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Scan now
        </Button>
      </div>

      {alerts.length > 0 && (
        <ul className="mt-3 space-y-2">
          {alerts.map((a) => {
            const s = SEVERITY[a.severity] ?? SEVERITY.warning;
            return (
              <li key={a.id} className={`flex items-start justify-between gap-3 rounded-2xl border px-3 py-2 ${s.cls}`}>
                <div className="flex min-w-0 items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{a.software_name}</p>
                    <p className="text-xs font-semibold opacity-90">
                      {s.label} · {a.message ?? `${a.days_remaining} day(s)`} · expires {a.expiry_date}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => dismiss(a.id)}
                  className="rounded-full p-1 opacity-70 hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
