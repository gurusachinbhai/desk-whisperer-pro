import { useEffect, useMemo, useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, DollarSign, Trophy, Plus, RotateCcw, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";

type SalesRow = {
  id: string;
  company_id: string;
  product_name: string;
  seller_user_id: string | null;
  seller_name: string;
  buyer_name: string;
  buyer_contact: string | null;
  amount: number;
  currency: string;
  entry_type: "sale" | "return";
  sale_date: string;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
};

type Props = {
  companyId: string | null;
  meUserId: string | null;
  meName: string | null;
};

const FALLBACK_CURRENCY = "INR";

export default function SalesTeamPanel({ companyId, meUserId, meName }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [canAdd, setCanAdd] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [hasAnyAccess, setHasAnyAccess] = useState(true);

  const [product, setProduct] = useState("");
  const [buyer, setBuyer] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(FALLBACK_CURRENCY);
  const [entryType, setEntryType] = useState<"sale" | "return">("sale");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [teamUserIds, setTeamUserIds] = useState<Set<string>>(new Set());

  // Determine if current user is part of Sales department
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!companyId || !meUserId) { setAccessChecked(true); return; }
      const { data, error } = await supabase
        .from("employee_profiles")
        .select("department_id, departments:department_id(name)")
        .eq("user_id", meUserId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (!alive) return;
      if (!error && data) {
        const deptName = (data as any).departments?.name?.toLowerCase?.() ?? "";
        setCanAdd(deptName === "sales");
      }
      setAccessChecked(true);
    })();
    return () => { alive = false; };
  }, [companyId, meUserId]);

  const fetchRows = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_entries")
      .select("*")
      .eq("company_id", companyId)
      .order("sale_date", { ascending: false })
      .limit(500);
    if (error) {
      // PostgREST permission/empty -> no access
      setHasAnyAccess(false);
      setRows([]);
    } else {
      setHasAnyAccess(true);
      setRows((data ?? []) as SalesRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); /* eslint-disable-next-line */ }, [companyId]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!companyId || !meUserId) return;
    if (!product.trim() || !buyer.trim() || !amount) {
      toast.error("Please fill product, buyer and amount");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("sales_entries").insert({
      company_id: companyId,
      product_name: product.trim(),
      seller_user_id: meUserId,
      seller_name: meName ?? "Sales rep",
      buyer_name: buyer.trim(),
      buyer_contact: buyerContact.trim() || null,
      amount: Number(amount),
      currency: currency.trim().toUpperCase() || FALLBACK_CURRENCY,
      entry_type: entryType,
      sale_date: saleDate,
      notes: notes.trim() || null,
      created_by: meUserId,
      created_by_name: meName ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Could not save entry");
      return;
    }
    toast.success(entryType === "sale" ? "Sale recorded" : "Return recorded");
    setProduct(""); setBuyer(""); setBuyerContact(""); setAmount(""); setNotes("");
    fetchRows();
  };

  const stats = useMemo(() => {
    const totals = new Map<string, { name: string; sales: number; returns: number; net: number }>();
    let totalSales = 0, totalReturns = 0;
    for (const r of rows) {
      const key = r.seller_user_id ?? r.seller_name;
      const e = totals.get(key) ?? { name: r.seller_name, sales: 0, returns: 0, net: 0 };
      if (r.entry_type === "sale") { e.sales += Number(r.amount); totalSales += Number(r.amount); }
      else { e.returns += Number(r.amount); totalReturns += Number(r.amount); }
      e.net = e.sales - e.returns;
      totals.set(key, e);
    }
    const ranked = Array.from(totals.values());
    const topSellers = [...ranked].sort((a, b) => b.sales - a.sales).slice(0, 8);
    const topReturns = [...ranked].sort((a, b) => b.returns - a.returns).slice(0, 8);
    const topNet = [...ranked].sort((a, b) => b.net - a.net)[0] ?? null;
    return { totalSales, totalReturns, topSellers, topReturns, topNet };
  }, [rows]);

  if (!companyId) {
    return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Join a company to use the Sales workspace.</div>;
  }

  if (accessChecked && !canAdd && !hasAnyAccess) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-display text-lg font-extrabold">Sales workspace</p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              This section is available to the Sales department and managers. Ask your admin to assign you to the Sales department.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sales team</p>
            <h2 className="font-display text-2xl font-extrabold">Pipeline & performance</h2>
          </div>
          <button onClick={fetchRows} className="rounded-xl border border-border px-3 py-2 text-xs font-extrabold hover:bg-muted">
            <RotateCcw className="mr-1 inline h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard icon={<DollarSign className="h-4 w-4" />} label="Total sales" value={stats.totalSales} tone="primary" />
          <StatCard icon={<TrendingDown className="h-4 w-4" />} label="Total returns" value={stats.totalReturns} tone="destructive" />
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Top performer" valueText={stats.topNet?.name ?? "—"} sub={stats.topNet ? `Net ${stats.topNet.net.toLocaleString()}` : "No data yet"} tone="success" />
        </div>
      </div>

      {canAdd && (
        <form onSubmit={handleAdd} className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <p className="font-display text-lg font-extrabold">Add sale or return</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Product">
              <input value={product} onChange={(e) => setProduct(e.target.value)} className={inputCls} placeholder="Product / service" />
            </Field>
            <Field label="Buyer name">
              <input value={buyer} onChange={(e) => setBuyer(e.target.value)} className={inputCls} placeholder="Customer name" />
            </Field>
            <Field label="Buyer contact">
              <input value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} className={inputCls} placeholder="Email or phone (optional)" />
            </Field>
            <Field label="Amount">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" className={inputCls} placeholder="0.00" />
            </Field>
            <Field label="Currency">
              <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls} maxLength={6} />
            </Field>
            <Field label="Date">
              <input value={saleDate} onChange={(e) => setSaleDate(e.target.value)} type="date" className={inputCls} />
            </Field>
            <Field label="Type">
              <select value={entryType} onChange={(e) => setEntryType(e.target.value as any)} className={inputCls}>
                <option value="sale">Sale</option>
                <option value="return">Return</option>
              </select>
            </Field>
            <Field label="Seller">
              <input value={meName ?? ""} readOnly className={`${inputCls} opacity-70`} />
            </Field>
            <Field label="Notes" className="lg:col-span-3">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="Optional notes" />
            </Field>
          </div>
          <button disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground shadow-glow disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save entry
          </button>
        </form>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Top sellers" icon={<TrendingUp className="h-4 w-4 text-primary" />}>
          {stats.topSellers.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.topSellers}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="net" name="Net" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Highest returns" icon={<TrendingDown className="h-4 w-4 text-destructive" />}>
          {stats.topReturns.every((r) => r.returns === 0) ? <Empty label="No returns recorded" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.topReturns}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="returns" name="Returns" radius={[6, 6, 0, 0]}>
                  {stats.topReturns.map((_, i) => <Cell key={i} fill="hsl(var(--destructive))" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <p className="font-display text-lg font-extrabold">Recent entries</p>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No sales entries yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Date</th><th className="p-3">Product</th><th className="p-3">Seller</th>
                  <th className="p-3">Buyer</th><th className="p-3">Type</th><th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3">{r.sale_date}</td>
                    <td className="p-3 font-semibold">{r.product_name}</td>
                    <td className="p-3">{r.seller_name}</td>
                    <td className="p-3">{r.buyer_name}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.entry_type === "sale" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {r.entry_type}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold">{r.currency} {Number(r.amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon, label, value, valueText, sub, tone }: { icon: React.ReactNode; label: string; value?: number; valueText?: string; sub?: string; tone: "primary" | "destructive" | "success" }) {
  const toneCls = tone === "primary" ? "text-primary" : tone === "destructive" ? "text-destructive" : "text-emerald-600";
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${toneCls}`}>{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-extrabold">{valueText ?? (value ?? 0).toLocaleString()}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-extrabold">{icon}{title}</div>
      {children}
    </div>
  );
}

function Empty({ label = "No data yet" }: { label?: string }) {
  return <div className="grid h-[260px] place-items-center text-sm text-muted-foreground">{label}</div>;
}
