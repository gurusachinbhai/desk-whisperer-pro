import { useEffect, useMemo, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShieldCheck,
  Building2,
  Users,
  Clock3,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  TrendingUp,
  DollarSign,
  KeyRound,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import hrgreatlyLogo from "@/assets/hrgreatly-logo.png";

type CompanyRow = {
  id: string;
  name: string;
  organization_code: string;
  status: string;
  domain: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  approved_at: string | null;
};

type EmployeeRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  company_id: string;
  created_at: string;
};

type SuperAdminRow = {
  id: string;
  user_id: string;
  email?: string | null;
};

type Stats = {
  companies_total: number;
  companies_approved: number;
  companies_pending: number;
  companies_suspended: number;
  employees_total: number;
  employees_pending: number;
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<"overview" | "companies" | "employees" | "admins">("overview");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "suspended">("all");
  const [grantEmail, setGrantEmail] = useState("");
  const [admins, setAdmins] = useState<SuperAdminRow[]>([]);

  const loadAll = async () => {
    const [{ data: cData, error: cErr }, { data: eData, error: eErr }, statsRes, adminRes] = await Promise.all([
      supabase.from("company_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("employee_profiles").select("*").order("created_at", { ascending: false }),
      supabase.rpc("get_platform_stats"),
      supabase.from("user_roles").select("id, user_id, role").eq("role", "super_admin"),
    ]);
    if (cErr) toast.error("Failed to load companies", { description: cErr.message });
    if (eErr) toast.error("Failed to load employees", { description: eErr.message });
    setCompanies((cData ?? []) as CompanyRow[]);
    setEmployees((eData ?? []) as EmployeeRow[]);
    if (statsRes.data) setStats(statsRes.data as unknown as Stats);
    setAdmins(((adminRes.data ?? []) as Array<{ id: string; user_id: string }>).map((r) => ({ id: r.id, user_id: r.user_id })));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) {
        if (!cancelled) {
          setLoading(false);
          setAuthorized(false);
        }
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "super_admin");
      const isSuper = (roles ?? []).length > 0;
      if (cancelled) return;
      setAuthorized(isSuper);
      if (isSuper) await loadAll();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCompanies = useMemo(() => {
    if (filter === "all") return companies;
    return companies.filter((c) => c.status === filter);
  }, [companies, filter]);

  const employeeCountByCompany = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((e) => map.set(e.company_id, (map.get(e.company_id) ?? 0) + 1));
    return map;
  }, [employees]);

  // Mock revenue: $9 per active employee per month per approved company
  const revenuePerEmployee = 9;
  const activeEmployees = employees.filter(
    (e) => e.status === "approved" && companies.find((c) => c.id === e.company_id)?.status === "approved",
  ).length;
  const mrr = activeEmployees * revenuePerEmployee;
  const arr = mrr * 12;
  const forecast6mo = Math.round(mrr * 6 * 1.18); // assume 18% growth aggregate

  const handleApproveCompany = async (id: string) => {
    const { error } = await supabase.rpc("approve_company", { _company_id: id });
    if (error) return toast.error("Approval failed", { description: error.message });
    toast.success("Company approved");
    loadAll();
  };
  const handleSuspendCompany = async (id: string) => {
    const { error } = await supabase.rpc("suspend_company", { _company_id: id });
    if (error) return toast.error("Suspend failed", { description: error.message });
    toast.success("Company suspended");
    loadAll();
  };
  const handleApproveEmployee = async (id: string) => {
    const { error } = await supabase.rpc("approve_employee", { _employee_id: id });
    if (error) return toast.error("Approval failed", { description: error.message });
    toast.success("User approved");
    loadAll();
  };
  const handleSuspendEmployee = async (id: string) => {
    const { error } = await supabase.rpc("suspend_employee", { _employee_id: id });
    if (error) return toast.error("Suspend failed", { description: error.message });
    toast.success("User suspended");
    loadAll();
  };
  const handleGrantSuperAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    const { error } = await supabase.rpc("grant_super_admin", { _email: grantEmail.trim() });
    if (error) return toast.error("Grant failed", { description: error.message });
    toast.success(`Granted Super Admin to ${grantEmail.trim()}`);
    setGrantEmail("");
    loadAll();
  };
  const handleRevokeSuperAdmin = async (userId: string) => {
    const { error } = await supabase.rpc("revoke_super_admin", { _user_id: userId });
    if (error) return toast.error("Revoke failed", { description: error.message });
    toast.success("Super Admin revoked");
    loadAll();
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-foreground">
        <p className="text-sm font-semibold text-muted-foreground">Loading admin console…</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-card">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="mt-3 font-display text-xl font-extrabold">Restricted area</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page is reserved for HR Greatly platform administrators (Super Admins).
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={hrgreatlyLogo} alt="HR Greatly" className="h-10 w-auto object-contain" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Platform admin</p>
              <h1 className="font-display text-base font-extrabold leading-tight">HR Greatly Admin Console</h1>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold"
          >
            <ArrowLeft className="h-4 w-4" /> Back to app
          </button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-xs font-bold">
          {[
            { id: "overview", label: "Overview", icon: TrendingUp },
            { id: "companies", label: "Companies", icon: Building2 },
            { id: "employees", label: "Users", icon: Users },
            { id: "admins", label: "Super admins", icon: ShieldCheck },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Building2} label="Companies" value={stats?.companies_total ?? companies.length} hint={`${stats?.companies_approved ?? 0} approved`} />
              <StatCard icon={Clock3} label="Pending companies" value={stats?.companies_pending ?? 0} hint="Awaiting approval" tone="warn" />
              <StatCard icon={Users} label="Total users" value={stats?.employees_total ?? employees.length} hint={`${stats?.employees_pending ?? 0} pending`} />
              <StatCard icon={ShieldCheck} label="Super admins" value={admins.length} hint="Platform managers" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <RevCard label="MRR (mock)" value={formatCurrency(mrr)} hint={`@ ${formatCurrency(revenuePerEmployee)} / user / mo`} icon={DollarSign} />
              <RevCard label="ARR (mock)" value={formatCurrency(arr)} hint="Run-rate annual" icon={TrendingUp} />
              <RevCard label="6-mo forecast" value={formatCurrency(forecast6mo)} hint="+18% projected growth" icon={TrendingUp} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="font-display text-sm font-extrabold">Action required</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats?.companies_pending ?? 0} companies and {stats?.employees_pending ?? 0} users waiting for approval.
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { setTab("companies"); setFilter("pending"); }} className="rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground">
                  Review companies
                </button>
                <button onClick={() => setTab("employees")} className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold">
                  Review users
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "companies" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "approved", "suspended"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1.5 text-xs font-extrabold capitalize ${
                    filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filteredCompanies.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No companies in this view.
                </p>
              )}
              {filteredCompanies.map((c) => {
                const empCount = employeeCountByCompany.get(c.id) ?? 0;
                const addr = [c.address_line1, c.address_line2, c.city, c.state, c.postal_code, c.country]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-base font-extrabold">{c.name}</h4>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Code: {c.organization_code} · {empCount} user{empCount === 1 ? "" : "s"}
                          {c.domain ? ` · ${c.domain}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {c.status !== "approved" && (
                          <button onClick={() => handleApproveCompany(c.id)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {c.status !== "suspended" && (
                          <button onClick={() => handleSuspendCompany(c.id)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-extrabold text-destructive">
                            <XCircle className="h-3.5 w-3.5" /> Suspend
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <InfoRow label="Address" value={addr || "—"} />
                      <InfoRow label="Contact" value={c.contact_name || "—"} />
                      <InfoRow label="Email" value={c.contact_email || "—"} />
                      <InfoRow label="Phone" value={c.contact_phone || "—"} />
                      <InfoRow label="Registered" value={new Date(c.created_at).toLocaleDateString()} />
                      <InfoRow label="Approved" value={c.approved_at ? new Date(c.approved_at).toLocaleDateString() : "—"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "employees" && (
          <div className="space-y-3">
            {employees.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No users yet.
              </p>
            )}
            {employees.map((e) => {
              const company = companies.find((c) => c.id === e.company_id);
              return (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-sm font-extrabold">{e.display_name}</h4>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {e.email ?? "—"} · {company?.name ?? "Unknown company"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {e.status !== "approved" && (
                      <button onClick={() => handleApproveEmployee(e.id)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                    )}
                    {e.status !== "suspended" && (
                      <button onClick={() => handleSuspendEmployee(e.id)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-extrabold text-destructive">
                        <XCircle className="h-3.5 w-3.5" /> Suspend
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "admins" && (
          <div className="space-y-4">
            <form onSubmit={handleGrantSuperAdmin} className="rounded-2xl border border-border bg-card p-4">
              <label className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                Grant Super Admin
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="email"
                  required
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 min-w-[220px] rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground">
                  <KeyRound className="h-4 w-4" /> Grant
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                User must already have an HR Greatly account.
              </p>
            </form>

            <div className="space-y-2">
              {admins.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <code className="text-xs">{a.user_id}</code>
                  </div>
                  <button onClick={() => handleRevokeSuperAdmin(a.user_id)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-extrabold text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Revoke
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; hint?: string; tone?: "warn" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${tone === "warn" ? "text-destructive" : "text-primary"}`} />
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function RevCard({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-transparent p-4">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-extrabold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-primary/10 text-primary",
    pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    suspended: "bg-destructive/10 text-destructive",
  };
  const cls = map[status] ?? "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${cls}`}>{status}</span>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}
