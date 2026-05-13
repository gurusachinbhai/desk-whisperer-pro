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
  Ticket as TicketIcon,
  Pencil,
  Search,
  CreditCard,
  X,
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
  approved_by: string | null;
  subscription_plan: string | null;
  subscription_status: string;
  subscription_seats: number | null;
  subscription_amount: number | null;
  subscription_currency: string | null;
  subscription_started_at: string | null;
  subscription_renews_at: string | null;
  subscribed_by: string | null;
};

type EmployeeRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  company_id: string;
  user_id: string | null;
  employee_code: string | null;
  department_id: string | null;
  project_id: string | null;
  manager_id: string | null;
  created_at: string;
};

type RoleRow = { id: string; user_id: string; role: string; company_id: string | null };
type NameRow = { user_id: string; email: string | null; display_name: string | null };
type DeptRow = { id: string; name: string };
type ProjRow = { id: string; name: string };
type TicketRow = { id: string; status: string; priority: string };
type AuditRow = {
  id: string;
  company_id: string | null;
  target_user_id: string;
  action: "granted" | "revoked";
  performed_by: string | null;
  performed_at: string;
};

type Stats = {
  companies_total: number;
  companies_approved: number;
  companies_pending: number;
  companies_suspended: number;
  employees_total: number;
  employees_pending: number;
};

const formatCurrency = (n: number, ccy = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n);

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [namesByUserId, setNamesByUserId] = useState<Record<string, NameRow>>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<"overview" | "companies" | "employees" | "admins" | "audit">("overview");
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "suspended">("all");
  const [grantEmail, setGrantEmail] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [editingCompany, setEditingCompany] = useState<CompanyRow | null>(null);
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [projects, setProjects] = useState<ProjRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const loadAll = async () => {
    const [{ data: cData, error: cErr }, { data: eData, error: eErr }, statsRes, rolesRes, deptRes, projRes, tickRes, auditRes] = await Promise.all([
      supabase.from("company_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("employee_profiles").select("*").order("created_at", { ascending: false }),
      supabase.rpc("get_platform_stats"),
      supabase.from("user_roles").select("id, user_id, role, company_id"),
      supabase.from("departments").select("id,name"),
      supabase.from("projects").select("id,name"),
      supabase.from("support_tickets").select("id,status,priority"),
      supabase.from("admin_role_audit").select("*").order("performed_at", { ascending: false }).limit(200),
    ]);
    if (cErr) toast.error("Failed to load companies", { description: cErr.message });
    if (eErr) toast.error("Failed to load employees", { description: eErr.message });
    const cList = (cData ?? []) as CompanyRow[];
    const eList = (eData ?? []) as EmployeeRow[];
    const rList = (rolesRes.data ?? []) as RoleRow[];
    setCompanies(cList);
    setEmployees(eList);
    setRoles(rList);
    setDepartments((deptRes.data ?? []) as DeptRow[]);
    setProjects((projRes.data ?? []) as ProjRow[]);
    setTickets((tickRes.data ?? []) as TicketRow[]);
    const aList = (auditRes.data ?? []) as AuditRow[];
    setAuditLog(aList);
    if (statsRes.data) setStats(statsRes.data as unknown as Stats);

    // Resolve names for super admins, approvers, subscribers, audit actors/targets
    const ids = new Set<string>();
    rList.filter((r) => r.role === "super_admin").forEach((r) => ids.add(r.user_id));
    cList.forEach((c) => {
      if (c.approved_by) ids.add(c.approved_by);
      if (c.subscribed_by) ids.add(c.subscribed_by);
    });
    aList.forEach((a) => {
      if (a.performed_by) ids.add(a.performed_by);
      if (a.target_user_id) ids.add(a.target_user_id);
    });
    if (ids.size > 0) {
      const { data: names } = await supabase.rpc("lookup_user_names", { _user_ids: Array.from(ids) });
      const map: Record<string, NameRow> = {};
      ((names ?? []) as NameRow[]).forEach((n) => (map[n.user_id] = n));
      setNamesByUserId(map);
    }
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
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "super_admin");
      const isSuper = (rolesData ?? []).length > 0;
      if (cancelled) return;
      setAuthorized(isSuper);
      if (isSuper) await loadAll();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const superAdminRoles = useMemo(() => roles.filter((r) => r.role === "super_admin"), [roles]);

  const adminUserIdsByCompany = useMemo(() => {
    const map = new Map<string, string[]>();
    roles
      .filter((r) => r.role === "admin" && r.company_id)
      .forEach((r) => {
        const arr = map.get(r.company_id!) ?? [];
        arr.push(r.user_id);
        map.set(r.company_id!, arr);
      });
    return map;
  }, [roles]);

  const employeesByUserId = useMemo(() => {
    const map = new Map<string, EmployeeRow>();
    employees.forEach((e) => {
      if (e.user_id) map.set(e.user_id, e);
    });
    return map;
  }, [employees]);

  const userRolesByUserId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    roles.forEach((r) => {
      const s = map.get(r.user_id) ?? new Set<string>();
      s.add(r.role);
      map.set(r.user_id, s);
    });
    return map;
  }, [roles]);

  const resolveName = (uid: string | null | undefined): string => {
    if (!uid) return "—";
    const n = namesByUserId[uid];
    if (n?.display_name) return n.display_name;
    const ep = employeesByUserId.get(uid);
    if (ep?.display_name) return ep.display_name;
    return n?.email ?? uid.slice(0, 8);
  };

  const filteredCompanies = useMemo(() => {
    let list = companies;
    if (filter !== "all") list = list.filter((c) => c.status === filter);
    const q = companySearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.organization_code.toLowerCase().includes(q) ||
          (c.domain ?? "").toLowerCase().includes(q) ||
          (c.contact_email ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [companies, filter, companySearch]);

  const filteredEmployees = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const company = companies.find((c) => c.id === e.company_id);
      return (
        e.display_name.toLowerCase().includes(q) ||
        (e.email ?? "").toLowerCase().includes(q) ||
        (company?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [employees, userSearch, companies]);

  const employeeCountByCompany = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((e) => map.set(e.company_id, (map.get(e.company_id) ?? 0) + 1));
    return map;
  }, [employees]);

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);
  const projById = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const ticketStats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let openCount = 0;
    let closedCount = 0;
    const openSet = new Set(["new", "open", "in_progress", "on_hold", "pending"]);
    const closedSet = new Set(["resolved", "closed", "cancelled"]);
    tickets.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
      if (openSet.has(t.status)) openCount++;
      else if (closedSet.has(t.status)) closedCount++;
    });
    return { byStatus, byPriority, openCount, closedCount, total: tickets.length };
  }, [tickets]);

  const revenuePerEmployee = 9;
  const activeEmployees = employees.filter(
    (e) => e.status === "approved" && companies.find((c) => c.id === e.company_id)?.status === "approved",
  ).length;
  const mrr = activeEmployees * revenuePerEmployee;
  const arr = mrr * 12;
  const forecast6mo = Math.round(mrr * 6 * 1.18);

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
  const handleAddAdmin = async (employee: EmployeeRow) => {
    if (!employee.user_id) return toast.error("This user hasn't signed in yet, so they can't be made an admin.");
    const currentAdmins = (adminUserIdsByCompany.get(employee.company_id) ?? []).length;
    if (currentAdmins >= 3) return toast.error("Limit reached", { description: "A company can have at most 3 admins." });
    const { error } = await supabase.from("user_roles").insert({ user_id: employee.user_id, role: "admin", company_id: employee.company_id });
    if (error) return toast.error("Couldn't add admin", { description: error.message });
    toast.success(`${employee.display_name} is now an admin`);
    loadAll();
  };
  const handleRemoveAdmin = async (employee: EmployeeRow) => {
    if (!employee.user_id) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", employee.user_id)
      .eq("role", "admin")
      .eq("company_id", employee.company_id);
    if (error) return toast.error("Couldn't remove admin", { description: error.message });
    toast.success(`${employee.display_name} is no longer an admin`);
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
          <div className="flex items-center gap-2">
            <Link
              to="/tickets"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold"
            >
              <TicketIcon className="h-4 w-4" /> Support tickets
            </Link>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-extrabold"
            >
              <ArrowLeft className="h-4 w-4" /> Back to app
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-xs font-bold">
          {[
            { id: "overview", label: "Overview", icon: TrendingUp },
            { id: "companies", label: "Companies", icon: Building2 },
            { id: "employees", label: "Users", icon: Users },
            { id: "admins", label: "Super admins", icon: ShieldCheck },
            { id: "audit", label: "Admin audit", icon: Clock3 },
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
              <StatCard icon={ShieldCheck} label="Super admins" value={superAdminRoles.length} hint="Platform managers" />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <RevCard label="MRR (mock)" value={formatCurrency(mrr)} hint={`@ ${formatCurrency(revenuePerEmployee)} / user / mo`} icon={DollarSign} />
              <RevCard label="ARR (mock)" value={formatCurrency(arr)} hint="Run-rate annual" icon={TrendingUp} />
              <RevCard label="6-mo forecast" value={formatCurrency(forecast6mo)} hint="+18% projected growth" icon={TrendingUp} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TicketIcon className="h-4 w-4 text-primary" />
                  <h3 className="font-display text-sm font-extrabold">Support tickets</h3>
                </div>
                <Link to="/tickets" className="text-[11px] font-extrabold uppercase tracking-wide text-primary hover:underline">
                  Open queue →
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={TicketIcon} label="Total tickets" value={ticketStats.total} hint="All time" />
                <StatCard icon={Clock3} label="Open" value={ticketStats.openCount} hint="New / in progress / on hold" tone="warn" />
                <StatCard icon={CheckCircle2} label="Closed" value={ticketStats.closedCount} hint="Resolved or closed" />
                <StatCard
                  icon={AlertTriangle}
                  label="Critical (P1)"
                  value={ticketStats.byPriority["P1"] ?? 0}
                  hint={`P2: ${ticketStats.byPriority["P2"] ?? 0} · P3: ${ticketStats.byPriority["P3"] ?? 0} · P4: ${ticketStats.byPriority["P4"] ?? 0}`}
                  tone="warn"
                />
              </div>
              {Object.keys(ticketStats.byStatus).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(ticketStats.byStatus).map(([s, n]) => (
                    <span key={s} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-extrabold uppercase text-muted-foreground">
                      {s.replace(/_/g, " ")}: <span className="text-foreground">{n}</span>
                    </span>
                  ))}
                </div>
              )}
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Search company, code, domain…"
                  className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredCompanies.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No companies match this view.
                </p>
              )}
              {filteredCompanies.map((c) => {
                const empCount = employeeCountByCompany.get(c.id) ?? 0;
                const adminIds = adminUserIdsByCompany.get(c.id) ?? [];
                const adminNames = adminIds.map(resolveName);
                const addr = [c.address_line1, c.address_line2, c.city, c.state, c.postal_code, c.country].filter(Boolean).join(", ");
                return (
                  <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-base font-extrabold">{c.name}</h4>
                          <StatusBadge status={c.status} />
                          {c.subscription_plan && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-primary">
                              {c.subscription_plan} · {c.subscription_status}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Code: {c.organization_code} · {empCount} user{empCount === 1 ? "" : "s"}
                          {c.domain ? ` · ${c.domain}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setEditingCompany(c)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-extrabold"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
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
                      <InfoRow label="Approved by (Super Admin)" value={resolveName(c.approved_by)} />
                      <InfoRow label={`Admins (${adminNames.length}/3)`} value={adminNames.length ? adminNames.join(", ") : "—"} />
                      <InfoRow
                        label="Subscription"
                        value={
                          c.subscription_plan
                            ? `${c.subscription_plan} · ${c.subscription_status}${
                                c.subscription_amount ? ` · ${formatCurrency(Number(c.subscription_amount), c.subscription_currency ?? "USD")}` : ""
                              }${c.subscription_seats ? ` · ${c.subscription_seats} seats` : ""}`
                            : "—"
                        }
                      />
                      <InfoRow label="Subscribed by" value={resolveName(c.subscribed_by)} />
                      <InfoRow label="Renews" value={c.subscription_renews_at ? new Date(c.subscription_renews_at).toLocaleDateString() : "—"} />
                      <InfoRow label="Address" value={addr || "—"} />
                      <InfoRow label="Contact" value={c.contact_name || "—"} />
                      <InfoRow label="Email" value={c.contact_email || "—"} />
                      <InfoRow label="Phone" value={c.contact_phone || "—"} />
                      <InfoRow label="Registered" value={new Date(c.created_at).toLocaleDateString()} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "employees" && (
          <div className="space-y-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user name, email, or company…"
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm"
              />
            </div>

            {filteredEmployees.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No users match this view.
              </p>
            )}
            {filteredEmployees.map((e) => {
              const company = companies.find((c) => c.id === e.company_id);
              const userRoles = e.user_id ? userRolesByUserId.get(e.user_id) ?? new Set<string>() : new Set<string>();
              const isAdmin = userRoles.has("admin");
              const isUser = userRoles.has("user");
              const roleLabel = isAdmin && isUser ? "Admin + Employee" : isAdmin ? "Admin" : isUser ? "Employee" : "Pending";
              const deptName = e.department_id ? deptById.get(e.department_id) ?? "—" : "—";
              const projName = e.project_id ? projById.get(e.project_id) ?? "—" : "—";
              const manager = e.manager_id ? employeeById.get(e.manager_id) : null;
              const adminCount = (adminUserIdsByCompany.get(e.company_id) ?? []).length;
              const canAddAdmin = !!e.user_id && !isAdmin && adminCount < 3;
              return (
                <div key={e.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-display text-sm font-extrabold">{e.display_name}</h4>
                        <StatusBadge status={e.status} />
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {roleLabel}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {e.email ?? "—"} · {company?.name ?? "Unknown company"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isAdmin ? (
                        <button
                          onClick={() => handleRemoveAdmin(e)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-extrabold text-destructive"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Remove admin
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddAdmin(e)}
                          disabled={!canAddAdmin}
                          title={!e.user_id ? "User hasn't signed in yet" : adminCount >= 3 ? "Max 3 admins per company" : ""}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-extrabold text-primary disabled:opacity-50"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Add admin
                        </button>
                      )}
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
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <InfoRow label="Employee ID" value={e.employee_code ?? "—"} />
                    <InfoRow label="Department" value={deptName} />
                    <InfoRow label="Current project" value={projName} />
                    <InfoRow label="Lead / Manager" value={manager?.display_name ?? "—"} />
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
              {superAdminRoles.map((a) => {
                const n = namesByUserId[a.user_id];
                const name = resolveName(a.user_id);
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-extrabold">{name}</p>
                        <p className="text-[11px] text-muted-foreground">{n?.email ?? a.user_id}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRevokeSuperAdmin(a.user_id)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-extrabold text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Revoke
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "audit" && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="font-display text-sm font-extrabold">Admin role changes</h3>
              <p className="text-[11px] text-muted-foreground">
                Records every time admin access is granted or removed, including who performed the action.
              </p>
            </div>
            {auditLog.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-xs text-muted-foreground">
                No admin role changes logged yet.
              </div>
            ) : (
              <div className="space-y-2">
                {auditLog.map((a) => {
                  const company = companies.find((c) => c.id === a.company_id);
                  const target = namesByUserId[a.target_user_id];
                  const actor = a.performed_by ? namesByUserId[a.performed_by] : null;
                  const targetLabel = target?.display_name || target?.email || a.target_user_id;
                  const actorLabel = a.performed_by
                    ? actor?.display_name || actor?.email || a.performed_by
                    : "System";
                  return (
                    <div key={a.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              a.action === "granted"
                                ? "bg-primary/10 text-primary"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {a.action}
                          </span>
                          <p className="text-sm font-extrabold">{targetLabel}</p>
                          {company && (
                            <span className="text-[11px] text-muted-foreground">· {company.name}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(a.performed_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        By <span className="font-bold text-foreground">{actorLabel}</span>
                        {actor?.email && actor.email !== actorLabel ? ` (${actor.email})` : ""}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {editingCompany && (
        <EditCompanyDialog
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onSaved={() => {
            setEditingCompany(null);
            loadAll();
          }}
        />
      )}
    </main>
  );
}

function EditCompanyDialog({
  company,
  onClose,
  onSaved,
}: {
  company: CompanyRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: company.name ?? "",
    domain: company.domain ?? "",
    address_line1: company.address_line1 ?? "",
    address_line2: company.address_line2 ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    postal_code: company.postal_code ?? "",
    country: company.country ?? "",
    contact_name: company.contact_name ?? "",
    contact_email: company.contact_email ?? "",
    contact_phone: company.contact_phone ?? "",
    subscription_plan: company.subscription_plan ?? "",
    subscription_status: company.subscription_status ?? "inactive",
    subscription_seats: company.subscription_seats?.toString() ?? "",
    subscription_amount: company.subscription_amount?.toString() ?? "",
    subscription_currency: company.subscription_currency ?? "USD",
    subscription_started_at: company.subscription_started_at?.slice(0, 10) ?? "",
    subscription_renews_at: company.subscription_renews_at?.slice(0, 10) ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.rpc("update_company_profile", {
      _company_id: company.id,
      _name: form.name,
      _domain: form.domain,
      _address_line1: form.address_line1,
      _address_line2: form.address_line2,
      _city: form.city,
      _state: form.state,
      _postal_code: form.postal_code,
      _country: form.country,
      _contact_name: form.contact_name,
      _contact_email: form.contact_email,
      _contact_phone: form.contact_phone,
      _subscription_plan: form.subscription_plan,
      _subscription_status: form.subscription_status,
      _subscription_seats: form.subscription_seats ? Number(form.subscription_seats) : null,
      _subscription_amount: form.subscription_amount ? Number(form.subscription_amount) : null,
      _subscription_currency: form.subscription_currency,
      _subscription_started_at: form.subscription_started_at || null,
      _subscription_renews_at: form.subscription_renews_at || null,
    });
    setSaving(false);
    if (error) return toast.error("Save failed", { description: error.message });
    toast.success("Company updated");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-extrabold">Edit company · {company.organization_code}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company name" value={form.name} onChange={(v) => set("name", v)} required />
            <Field label="Domain" value={form.domain} onChange={(v) => set("domain", v)} placeholder="example.com" />
            <Field label="Contact name" value={form.contact_name} onChange={(v) => set("contact_name", v)} />
            <Field label="Contact email" type="email" value={form.contact_email} onChange={(v) => set("contact_email", v)} />
            <Field label="Contact phone" value={form.contact_phone} onChange={(v) => set("contact_phone", v)} />
            <Field label="Address line 1" value={form.address_line1} onChange={(v) => set("address_line1", v)} />
            <Field label="Address line 2" value={form.address_line2} onChange={(v) => set("address_line2", v)} />
            <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
            <Field label="State" value={form.state} onChange={(v) => set("state", v)} />
            <Field label="Postal code" value={form.postal_code} onChange={(v) => set("postal_code", v)} />
            <Field label="Country" value={form.country} onChange={(v) => set("country", v)} />
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" /> Subscription
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Plan" value={form.subscription_plan} onChange={(v) => set("subscription_plan", v)} placeholder="Starter / Pro / Enterprise" />
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">Status</label>
                <select
                  value={form.subscription_status}
                  onChange={(e) => set("subscription_status", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  {["inactive", "trial", "active", "past_due", "cancelled"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <Field label="Seats" type="number" value={form.subscription_seats} onChange={(v) => set("subscription_seats", v)} />
              <Field label="Amount" type="number" value={form.subscription_amount} onChange={(v) => set("subscription_amount", v)} />
              <Field label="Currency" value={form.subscription_currency} onChange={(v) => set("subscription_currency", v)} />
              <Field label="Started" type="date" value={form.subscription_started_at} onChange={(v) => set("subscription_started_at", v)} />
              <Field label="Renews" type="date" value={form.subscription_renews_at} onChange={(v) => set("subscription_renews_at", v)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-extrabold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground disabled:opacity-50">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
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
