import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Download, FileSpreadsheet, Undo2, Receipt, Wallet, ShoppingCart, TrendingUp } from "lucide-react";
import * as XLSX from "xlsx";

type Props = { companyId: string; uploaderName: string; meUserId?: string | null };

type Order = {
  id: string; order_number: string; client_name: string; client_email: string | null;
  order_date: string; total_amount: number; currency: string; status: string; notes: string | null;
};
type ReceiptRow = {
  id: string; receipt_number: string; order_id: string | null; client_name: string;
  payment_date: string; amount_received: number; currency: string; payment_method: string;
  reference: string | null; notes: string | null; is_reversal: boolean; reverses_receipt_id: string | null;
};
type Expense = {
  id: string; expense_number: string; vendor_name: string; expense_date: string;
  category: string; amount_spent: number; currency: string; payment_method: string;
  reference_invoice_no: string | null; receipt_attachment_url: string | null; notes: string | null;
  is_reversal: boolean; reverses_expense_id: string | null;
};

const ORDER_STATUS = ["pending", "invoiced", "fulfilled", "cancelled"];
const PAYMENT_METHODS = ["cash", "bank_transfer", "stripe", "upi", "cheque", "card", "other"];
const EXPENSE_CATEGORIES = ["rent", "salaries", "software", "inventory", "utilities", "travel", "marketing", "other"];

function fmtMoney(n: number, ccy = "INR") {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: ccy, maximumFractionDigits: 2 }).format(n || 0); }
  catch { return `${ccy} ${(n || 0).toFixed(2)}`; }
}
function csvEscape(v: any) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCsv(name: string, rows: any[], headers: string[]) {
  const body = [headers.join(","), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","))].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAccountingPanel({ companyId, uploaderName, meUserId }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [orders, setOrders] = useState<Order[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [o, r, e] = await Promise.all([
      supabase.from("acct_orders").select("*").eq("company_id", companyId).gte("order_date", from).lte("order_date", to).order("order_date", { ascending: false }),
      supabase.from("acct_receipts").select("*").eq("company_id", companyId).gte("payment_date", from).lte("payment_date", to).order("payment_date", { ascending: false }),
      supabase.from("acct_expenses").select("*").eq("company_id", companyId).gte("expense_date", from).lte("expense_date", to).order("expense_date", { ascending: false }),
    ]);
    if (o.error) toast.error(o.error.message); else setOrders((o.data as Order[]) || []);
    if (r.error) toast.error(r.error.message); else setReceipts((r.data as ReceiptRow[]) || []);
    if (e.error) toast.error(e.error.message); else setExpenses((e.data as Expense[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (companyId) load(); /* eslint-disable-next-line */ }, [companyId, from, to]);

  const totals = useMemo(() => {
    const rev = receipts.reduce((s, r) => s + Number(r.amount_received || 0) * (r.is_reversal ? -1 : 1), 0);
    const exp = expenses.reduce((s, e) => s + Number(e.amount_spent || 0) * (e.is_reversal ? -1 : 1), 0);
    const pending = orders.filter((o) => o.status === "pending" || o.status === "invoiced").reduce((s, o) => s + Number(o.total_amount || 0), 0);
    return { rev, exp, net: rev - exp, pending };
  }, [orders, receipts, expenses]);

  const nextNumber = async (prefix: "ORD" | "REC" | "EXP", table: string, column: string) => {
    const { data, error } = await supabase.rpc("acct_next_number", { _company: companyId, _prefix: prefix, _table: table, _column: column });
    if (error) throw error;
    return data as string;
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>Refresh</Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={<TrendingUp className="h-4 w-4" />} label="Revenue" value={fmtMoney(totals.rev)} tone="text-emerald-600" />
          <Stat icon={<Wallet className="h-4 w-4" />} label="Expenses" value={fmtMoney(totals.exp)} tone="text-rose-600" />
          <Stat icon={<Receipt className="h-4 w-4" />} label="Net profit" value={fmtMoney(totals.net)} tone={totals.net >= 0 ? "text-emerald-600" : "text-rose-600"} />
          <Stat icon={<ShoppingCart className="h-4 w-4" />} label="Pending pipeline" value={fmtMoney(totals.pending)} tone="text-amber-600" />
        </div>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="flex w-full flex-wrap gap-1">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="pl">P&amp;L Report</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <OrdersTab companyId={companyId} uploaderName={uploaderName} meUserId={meUserId ?? null} orders={orders} reload={load} nextNumber={nextNumber} />
        </TabsContent>
        <TabsContent value="receipts">
          <ReceiptsTab companyId={companyId} uploaderName={uploaderName} meUserId={meUserId ?? null} receipts={receipts} orders={orders} reload={load} nextNumber={nextNumber} />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpensesTab companyId={companyId} uploaderName={uploaderName} meUserId={meUserId ?? null} expenses={expenses} reload={load} nextNumber={nextNumber} />
        </TabsContent>
        <TabsContent value="pl">
          <ProfitLossTab from={from} to={to} totals={totals} receipts={receipts} expenses={expenses} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 text-lg font-extrabold ${tone}`}>{value}</div>
    </div>
  );
}

/* ---------------- Orders ---------------- */
function OrdersTab({ companyId, uploaderName, meUserId, orders, reload, nextNumber }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_name: "", client_email: "", order_date: new Date().toISOString().slice(0,10), total_amount: "", currency: "INR", status: "pending", notes: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.client_name) return toast.error("Client name required");
    setSaving(true);
    try {
      const num = await nextNumber("ORD", "acct_orders", "order_number");
      const { error } = await supabase.from("acct_orders").insert({
        company_id: companyId, order_number: num, client_name: form.client_name, client_email: form.client_email || null,
        order_date: form.order_date, total_amount: Number(form.total_amount || 0), currency: form.currency,
        status: form.status, notes: form.notes || null, created_by: meUserId, created_by_name: uploaderName,
      });
      if (error) throw error;
      toast.success(`Order ${num} created`);
      setOpen(false); setForm({ ...form, client_name: "", client_email: "", total_amount: "", notes: "" });
      reload();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("acct_orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status updated"); reload(); }
  };

  const exportCsv = () => downloadCsv(`orders_${Date.now()}.csv`, orders, ["order_number","order_date","client_name","client_email","total_amount","currency","status","notes"]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setOpen(!open)}><Plus className="mr-1 h-4 w-4" />New order</Button>
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
      </div>
      {open && (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-2">
          <div><Label>Client name</Label><Input value={form.client_name} onChange={(e)=>setForm({...form, client_name:e.target.value})} /></div>
          <div><Label>Client email</Label><Input value={form.client_email} onChange={(e)=>setForm({...form, client_email:e.target.value})} /></div>
          <div><Label>Order date</Label><Input type="date" value={form.order_date} onChange={(e)=>setForm({...form, order_date:e.target.value})} /></div>
          <div><Label>Total amount</Label><Input type="number" step="0.01" value={form.total_amount} onChange={(e)=>setForm({...form, total_amount:e.target.value})} /></div>
          <div><Label>Currency</Label><Input value={form.currency} onChange={(e)=>setForm({...form, currency:e.target.value.toUpperCase()})} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v)=>setForm({...form, status:v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ORDER_STATUS.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})} /></div>
          <div className="md:col-span-2 flex gap-2"><Button onClick={save} disabled={saving}>{saving?"Saving…":"Save order"}</Button><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button></div>
        </div>
      )}
      <div className="overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground"><tr>
            <th className="p-2 text-left">Order #</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Client</th>
            <th className="p-2 text-right">Amount</th><th className="p-2 text-left">Status</th><th className="p-2"></th>
          </tr></thead>
          <tbody>
            {orders.map((o: Order) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-2 font-mono text-xs">{o.order_number}</td>
                <td className="p-2">{o.order_date}</td>
                <td className="p-2">{o.client_name}</td>
                <td className="p-2 text-right font-bold">{fmtMoney(Number(o.total_amount), o.currency)}</td>
                <td className="p-2"><StatusBadge status={o.status} /></td>
                <td className="p-2">
                  <Select value={o.status} onValueChange={(v)=>updateStatus(o.id, v)}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ORDER_STATUS.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {orders.length===0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No orders in range.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string,string> = { pending: "bg-amber-100 text-amber-800", invoiced: "bg-blue-100 text-blue-800", fulfilled: "bg-emerald-100 text-emerald-800", cancelled: "bg-rose-100 text-rose-800" };
  return <Badge className={tone[status] || "bg-muted text-foreground"}>{status}</Badge>;
}

/* ---------------- Receipts ---------------- */
function ReceiptsTab({ companyId, uploaderName, meUserId, receipts, orders, reload, nextNumber }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ order_id: "", client_name: "", payment_date: new Date().toISOString().slice(0,10), amount_received: "", currency: "INR", payment_method: "bank_transfer", reference: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.client_name || !form.amount_received) return toast.error("Client & amount required");
    setSaving(true);
    try {
      const num = await nextNumber("REC", "acct_receipts", "receipt_number");
      const { error } = await supabase.from("acct_receipts").insert({
        company_id: companyId, receipt_number: num,
        order_id: form.order_id || null, client_name: form.client_name,
        payment_date: form.payment_date, amount_received: Number(form.amount_received),
        currency: form.currency, payment_method: form.payment_method,
        reference: form.reference || null, notes: form.notes || null,
        created_by: meUserId, created_by_name: uploaderName,
      });
      if (error) throw error;
      toast.success(`Receipt ${num} issued`);
      setOpen(false); setForm({...form, client_name:"", amount_received:"", reference:"", notes:"", order_id:""});
      reload();
    } catch (e:any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const reverse = async (r: ReceiptRow) => {
    if (!confirm(`Issue reversal for ${r.receipt_number}? Original receipt is retained for audit.`)) return;
    try {
      const num = await nextNumber("REC", "acct_receipts", "receipt_number");
      const { error } = await supabase.from("acct_receipts").insert({
        company_id: companyId, receipt_number: num, order_id: r.order_id, client_name: r.client_name,
        payment_date: new Date().toISOString().slice(0,10), amount_received: r.amount_received,
        currency: r.currency, payment_method: r.payment_method, reference: r.receipt_number,
        notes: `Reversal of ${r.receipt_number}`, is_reversal: true, reverses_receipt_id: r.id,
        created_by: meUserId, created_by_name: uploaderName,
      });
      if (error) throw error;
      toast.success(`Reversal ${num} issued`);
      reload();
    } catch (e:any) { toast.error(e.message); }
  };

  const exportCsv = () => downloadCsv(`receipts_${Date.now()}.csv`, receipts, ["receipt_number","payment_date","client_name","amount_received","currency","payment_method","reference","is_reversal","notes"]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={()=>setOpen(!open)}><Plus className="mr-1 h-4 w-4" />Record payment</Button>
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
      </div>
      {open && (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-2">
          <div>
            <Label>Link to order (optional)</Label>
            <Select value={form.order_id || "none"} onValueChange={(v)=>{
              const sel = orders.find((o:Order)=>o.id===v);
              setForm({...form, order_id: v==="none"?"":v, client_name: sel?.client_name || form.client_name, currency: sel?.currency || form.currency});
            }}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {orders.map((o:Order)=><SelectItem key={o.id} value={o.id}>{o.order_number} · {o.client_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Client name</Label><Input value={form.client_name} onChange={(e)=>setForm({...form, client_name:e.target.value})} /></div>
          <div><Label>Payment date</Label><Input type="date" value={form.payment_date} onChange={(e)=>setForm({...form, payment_date:e.target.value})} /></div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount_received} onChange={(e)=>setForm({...form, amount_received:e.target.value})} /></div>
          <div><Label>Currency</Label><Input value={form.currency} onChange={(e)=>setForm({...form, currency:e.target.value.toUpperCase()})} /></div>
          <div>
            <Label>Method</Label>
            <Select value={form.payment_method} onValueChange={(v)=>setForm({...form, payment_method:v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2"><Label>Reference / Txn ID</Label><Input value={form.reference} onChange={(e)=>setForm({...form, reference:e.target.value})} /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})} /></div>
          <div className="md:col-span-2 flex gap-2"><Button onClick={save} disabled={saving}>{saving?"Saving…":"Issue receipt"}</Button><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button></div>
        </div>
      )}
      <div className="overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground"><tr>
            <th className="p-2 text-left">Receipt #</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Client</th>
            <th className="p-2 text-left">Method</th><th className="p-2 text-right">Amount</th><th className="p-2"></th>
          </tr></thead>
          <tbody>
            {receipts.map((r: ReceiptRow) => (
              <tr key={r.id} className={`border-t border-border ${r.is_reversal?"bg-rose-50/40":""}`}>
                <td className="p-2 font-mono text-xs">{r.receipt_number}{r.is_reversal && <Badge className="ml-1 bg-rose-100 text-rose-800">reversal</Badge>}</td>
                <td className="p-2">{r.payment_date}</td>
                <td className="p-2">{r.client_name}</td>
                <td className="p-2">{r.payment_method}</td>
                <td className={`p-2 text-right font-bold ${r.is_reversal?"text-rose-600":""}`}>{r.is_reversal?"-":""}{fmtMoney(Number(r.amount_received), r.currency)}</td>
                <td className="p-2">{!r.is_reversal && <Button size="sm" variant="ghost" onClick={()=>reverse(r)}><Undo2 className="h-3 w-3" /></Button>}</td>
              </tr>
            ))}
            {receipts.length===0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No receipts in range.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Expenses ---------------- */
function ExpensesTab({ companyId, uploaderName, meUserId, expenses, reload, nextNumber }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vendor_name:"", expense_date: new Date().toISOString().slice(0,10), category:"other", amount_spent:"", currency:"INR", payment_method:"bank_transfer", reference_invoice_no:"", receipt_attachment_url:"", notes:"" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.vendor_name || !form.amount_spent) return toast.error("Vendor & amount required");
    setSaving(true);
    try {
      const num = await nextNumber("EXP", "acct_expenses", "expense_number");
      const { error } = await supabase.from("acct_expenses").insert({
        company_id: companyId, expense_number: num, vendor_name: form.vendor_name,
        expense_date: form.expense_date, category: form.category, amount_spent: Number(form.amount_spent),
        currency: form.currency, payment_method: form.payment_method,
        reference_invoice_no: form.reference_invoice_no || null, receipt_attachment_url: form.receipt_attachment_url || null,
        notes: form.notes || null, created_by: meUserId, created_by_name: uploaderName,
      });
      if (error) throw error;
      toast.success(`Expense ${num} logged`);
      setOpen(false); setForm({...form, vendor_name:"", amount_spent:"", reference_invoice_no:"", receipt_attachment_url:"", notes:""});
      reload();
    } catch(e:any){ toast.error(e.message); } finally { setSaving(false); }
  };

  const reverse = async (x: Expense) => {
    if (!confirm(`Issue reversal for ${x.expense_number}? Original is retained for audit.`)) return;
    try {
      const num = await nextNumber("EXP", "acct_expenses", "expense_number");
      const { error } = await supabase.from("acct_expenses").insert({
        company_id: companyId, expense_number: num, vendor_name: x.vendor_name,
        expense_date: new Date().toISOString().slice(0,10), category: x.category, amount_spent: x.amount_spent,
        currency: x.currency, payment_method: x.payment_method, reference_invoice_no: x.expense_number,
        notes: `Reversal of ${x.expense_number}`, is_reversal: true, reverses_expense_id: x.id,
        created_by: meUserId, created_by_name: uploaderName,
      });
      if (error) throw error;
      toast.success(`Reversal ${num} issued`); reload();
    } catch(e:any){ toast.error(e.message); }
  };

  const exportCsv = () => downloadCsv(`expenses_${Date.now()}.csv`, expenses, ["expense_number","expense_date","vendor_name","category","amount_spent","currency","payment_method","reference_invoice_no","receipt_attachment_url","is_reversal","notes"]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={()=>setOpen(!open)}><Plus className="mr-1 h-4 w-4" />Log expense</Button>
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
      </div>
      {open && (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-2">
          <div><Label>Vendor name</Label><Input value={form.vendor_name} onChange={(e)=>setForm({...form, vendor_name:e.target.value})} /></div>
          <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e)=>setForm({...form, expense_date:e.target.value})} /></div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v)=>setForm({...form, category:v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXPENSE_CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Amount</Label><Input type="number" step="0.01" value={form.amount_spent} onChange={(e)=>setForm({...form, amount_spent:e.target.value})} /></div>
          <div><Label>Currency</Label><Input value={form.currency} onChange={(e)=>setForm({...form, currency:e.target.value.toUpperCase()})} /></div>
          <div>
            <Label>Method</Label>
            <Select value={form.payment_method} onValueChange={(v)=>setForm({...form, payment_method:v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Vendor invoice #</Label><Input value={form.reference_invoice_no} onChange={(e)=>setForm({...form, reference_invoice_no:e.target.value})} /></div>
          <div><Label>Receipt attachment URL</Label><Input value={form.receipt_attachment_url} onChange={(e)=>setForm({...form, receipt_attachment_url:e.target.value})} /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})} /></div>
          <div className="md:col-span-2 flex gap-2"><Button onClick={save} disabled={saving}>{saving?"Saving…":"Log expense"}</Button><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button></div>
        </div>
      )}
      <div className="overflow-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground"><tr>
            <th className="p-2 text-left">Expense #</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Vendor</th>
            <th className="p-2 text-left">Category</th><th className="p-2 text-right">Amount</th><th className="p-2"></th>
          </tr></thead>
          <tbody>
            {expenses.map((x:Expense)=>(
              <tr key={x.id} className={`border-t border-border ${x.is_reversal?"bg-emerald-50/40":""}`}>
                <td className="p-2 font-mono text-xs">{x.expense_number}{x.is_reversal && <Badge className="ml-1 bg-emerald-100 text-emerald-800">reversal</Badge>}</td>
                <td className="p-2">{x.expense_date}</td>
                <td className="p-2">{x.vendor_name}</td>
                <td className="p-2">{x.category}</td>
                <td className={`p-2 text-right font-bold ${x.is_reversal?"text-emerald-600":""}`}>{x.is_reversal?"-":""}{fmtMoney(Number(x.amount_spent), x.currency)}</td>
                <td className="p-2">{!x.is_reversal && <Button size="sm" variant="ghost" onClick={()=>reverse(x)}><Undo2 className="h-3 w-3" /></Button>}</td>
              </tr>
            ))}
            {expenses.length===0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No expenses in range.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- P&L ---------------- */
function ProfitLossTab({ from, to, totals, receipts, expenses }: any) {
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e: Expense) => {
      const sign = e.is_reversal ? -1 : 1;
      map.set(e.category, (map.get(e.category) || 0) + Number(e.amount_spent) * sign);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const exportPl = () => {
    const rows = [
      { metric: "Total Revenue", amount: totals.rev },
      { metric: "Total Expenses", amount: -totals.exp },
      { metric: "Net Profit", amount: totals.net },
      { metric: "Pending Pipeline", amount: totals.pending },
      ...byCategory.map(([c,v])=>({ metric: `Expense · ${c}`, amount: -v })),
    ];
    downloadCsv(`pl_${from}_${to}.csv`, rows, ["metric","amount"]);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={exportPl}><Download className="mr-1 h-4 w-4" />Export P&amp;L</Button></div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Profit &amp; Loss · {from} → {to}</h3>
        <table className="w-full text-sm">
          <tbody>
            <PlRow label="Total Revenue (Payments received)" value={totals.rev} />
            <PlRow label="Total Expenses (Spent payments)" value={-totals.exp} />
            <tr className="border-t-2 border-border"><td className="p-2 font-extrabold">Net Profit</td><td className={`p-2 text-right font-extrabold ${totals.net>=0?"text-emerald-600":"text-rose-600"}`}>{fmtMoney(totals.net)}</td></tr>
            <PlRow label="Active Pending Pipeline" value={totals.pending} muted />
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-muted-foreground">Expenses by category</h3>
        <table className="w-full text-sm">
          <tbody>
            {byCategory.map(([c, v]) => <tr key={c} className="border-t border-border"><td className="p-2 capitalize">{c}</td><td className="p-2 text-right font-bold">{fmtMoney(v)}</td></tr>)}
            {byCategory.length===0 && <tr><td className="p-4 text-center text-muted-foreground" colSpan={2}>No expenses in range.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Receipts and expenses cannot be hard-deleted. Use the reversal action to correct mistakes — both entries are kept for audit.</p>
    </div>
  );
}
function PlRow({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return <tr className="border-t border-border"><td className={`p-2 ${muted?"text-muted-foreground":""}`}>{label}</td><td className={`p-2 text-right font-bold ${value<0?"text-rose-600":""}`}>{fmtMoney(value)}</td></tr>;
}
