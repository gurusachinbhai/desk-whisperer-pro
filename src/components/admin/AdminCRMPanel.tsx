import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Users, Briefcase, Pencil, X } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  status: string;
  source: string | null;
  owner_name: string | null;
  notes: string | null;
  last_contacted_at: string | null;
};

type Deal = {
  id: string;
  customer_id: string | null;
  title: string;
  stage: string;
  value: number;
  currency: string;
  expected_close_date: string | null;
  probability: number | null;
  owner_name: string | null;
  notes: string | null;
};

const STATUSES = ["lead", "contacted", "qualified", "active", "lost"];
const STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"];

export default function AdminCRMPanel({ companyId, uploaderName }: { companyId: string; uploaderName: string }) {
  const [tab, setTab] = useState<"customers" | "deals">("customers");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  async function load() {
    setLoading(true);
    const [c, d] = await Promise.all([
      supabase.from("crm_customers").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("crm_deals").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    ]);
    if (c.error) toast.error(c.error.message);
    else setCustomers((c.data ?? []) as Customer[]);
    if (d.error) toast.error(d.error.message);
    else setDeals((d.data ?? []) as Deal[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  async function saveCustomer(form: FormData) {
    const payload = {
      company_id: companyId,
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "") || null,
      phone: String(form.get("phone") || "") || null,
      company_name: String(form.get("company_name") || "") || null,
      status: String(form.get("status") || "lead"),
      source: String(form.get("source") || "") || null,
      owner_name: uploaderName,
      notes: String(form.get("notes") || "") || null,
    };
    if (!payload.name) return toast.error("Name required");
    const res = editingCustomer
      ? await supabase.from("crm_customers").update(payload).eq("id", editingCustomer.id)
      : await supabase.from("crm_customers").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editingCustomer ? "Customer updated" : "Customer added");
    setShowCustomerForm(false); setEditingCustomer(null); load();
  }

  async function deleteCustomer(id: string) {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("crm_customers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Customer deleted"); load();
  }

  async function saveDeal(form: FormData) {
    const payload = {
      company_id: companyId,
      customer_id: (String(form.get("customer_id") || "") || null) as string | null,
      title: String(form.get("title") || "").trim(),
      stage: String(form.get("stage") || "new"),
      value: Number(form.get("value") || 0),
      currency: String(form.get("currency") || "INR"),
      expected_close_date: (String(form.get("expected_close_date") || "") || null) as string | null,
      probability: Number(form.get("probability") || 50),
      owner_name: uploaderName,
      notes: String(form.get("notes") || "") || null,
    };
    if (!payload.title) return toast.error("Title required");
    const res = editingDeal
      ? await supabase.from("crm_deals").update(payload).eq("id", editingDeal.id)
      : await supabase.from("crm_deals").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editingDeal ? "Deal updated" : "Deal added");
    setShowDealForm(false); setEditingDeal(null); load();
  }

  async function deleteDeal(id: string) {
    if (!confirm("Delete this deal?")) return;
    const { error } = await supabase.from("crm_deals").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deal deleted"); load();
  }

  const totalPipeline = deals.filter((d) => !["won", "lost"].includes(d.stage)).reduce((a, b) => a + Number(b.value || 0), 0);
  const won = deals.filter((d) => d.stage === "won").reduce((a, b) => a + Number(b.value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold">CRM</h2>
            <p className="text-xs text-muted-foreground">Manage customers and deals.</p>
          </div>
          <div className="flex gap-2 text-xs">
            <div className="rounded-lg border border-border px-3 py-1.5"><span className="text-muted-foreground">Customers: </span><b>{customers.length}</b></div>
            <div className="rounded-lg border border-border px-3 py-1.5"><span className="text-muted-foreground">Pipeline: </span><b>₹{totalPipeline.toLocaleString()}</b></div>
            <div className="rounded-lg border border-border px-3 py-1.5"><span className="text-muted-foreground">Won: </span><b>₹{won.toLocaleString()}</b></div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button onClick={() => setTab("customers")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${tab === "customers" ? "bg-primary text-primary-foreground" : "border border-border"}`}><Users className="h-3.5 w-3.5" /> Customers</button>
          <button onClick={() => setTab("deals")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${tab === "deals" ? "bg-primary text-primary-foreground" : "border border-border"}`}><Briefcase className="h-3.5 w-3.5" /> Deals</button>
        </div>
      </div>

      {tab === "customers" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-extrabold">Customers</h3>
            <button onClick={() => { setEditingCustomer(null); setShowCustomerForm(true); }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Plus className="h-3.5 w-3.5" /> New customer</button>
          </div>

          {showCustomerForm && (
            <form onSubmit={(e) => { e.preventDefault(); saveCustomer(new FormData(e.currentTarget)); }} className="mb-4 grid gap-2 rounded-xl border border-border p-3 md:grid-cols-2">
              <input name="name" defaultValue={editingCustomer?.name ?? ""} placeholder="Full name *" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <input name="email" defaultValue={editingCustomer?.email ?? ""} placeholder="Email" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <input name="phone" defaultValue={editingCustomer?.phone ?? ""} placeholder="Phone" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <input name="company_name" defaultValue={editingCustomer?.company_name ?? ""} placeholder="Company" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <select name="status" defaultValue={editingCustomer?.status ?? "lead"} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input name="source" defaultValue={editingCustomer?.source ?? ""} placeholder="Source (referral, website…)" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <textarea name="notes" defaultValue={editingCustomer?.notes ?? ""} placeholder="Notes" className="md:col-span-2 rounded-md border border-input bg-background px-2 py-1.5 text-sm" rows={2} />
              <div className="md:col-span-2 flex gap-2">
                <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">{editingCustomer ? "Update" : "Save"}</button>
                <button type="button" onClick={() => { setShowCustomerForm(false); setEditingCustomer(null); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"><X className="inline h-3 w-3" /> Cancel</button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border"><th className="py-2 pr-2">Name</th><th className="py-2 pr-2">Company</th><th className="py-2 pr-2">Email</th><th className="py-2 pr-2">Phone</th><th className="py-2 pr-2">Status</th><th className="py-2 pr-2 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className="py-3 text-xs text-muted-foreground">Loading…</td></tr> :
                  customers.length === 0 ? <tr><td colSpan={6} className="py-3 text-xs text-muted-foreground">No customers yet.</td></tr> :
                    customers.map((c) => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="py-2 pr-2 font-medium">{c.name}</td>
                        <td className="py-2 pr-2">{c.company_name ?? "—"}</td>
                        <td className="py-2 pr-2">{c.email ?? "—"}</td>
                        <td className="py-2 pr-2">{c.phone ?? "—"}</td>
                        <td className="py-2 pr-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{c.status}</span></td>
                        <td className="py-2 pr-2 text-right">
                          <button onClick={() => { setEditingCustomer(c); setShowCustomerForm(true); }} className="mr-1 rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => deleteCustomer(c.id)} className="rounded p-1 text-destructive hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "deals" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-extrabold">Deals</h3>
            <button onClick={() => { setEditingDeal(null); setShowDealForm(true); }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Plus className="h-3.5 w-3.5" /> New deal</button>
          </div>

          {showDealForm && (
            <form onSubmit={(e) => { e.preventDefault(); saveDeal(new FormData(e.currentTarget)); }} className="mb-4 grid gap-2 rounded-xl border border-border p-3 md:grid-cols-2">
              <input name="title" defaultValue={editingDeal?.title ?? ""} placeholder="Deal title *" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <select name="customer_id" defaultValue={editingDeal?.customer_id ?? ""} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                <option value="">— No customer —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company_name ? ` · ${c.company_name}` : ""}</option>)}
              </select>
              <select name="stage" defaultValue={editingDeal?.stage ?? "new"} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input name="value" type="number" step="0.01" defaultValue={editingDeal?.value ?? 0} placeholder="Value" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <input name="currency" defaultValue={editingDeal?.currency ?? "INR"} placeholder="Currency" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <input name="expected_close_date" type="date" defaultValue={editingDeal?.expected_close_date ?? ""} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <input name="probability" type="number" min={0} max={100} defaultValue={editingDeal?.probability ?? 50} placeholder="Probability %" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
              <textarea name="notes" defaultValue={editingDeal?.notes ?? ""} placeholder="Notes" className="md:col-span-2 rounded-md border border-input bg-background px-2 py-1.5 text-sm" rows={2} />
              <div className="md:col-span-2 flex gap-2">
                <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">{editingDeal ? "Update" : "Save"}</button>
                <button type="button" onClick={() => { setShowDealForm(false); setEditingDeal(null); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"><X className="inline h-3 w-3" /> Cancel</button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border"><th className="py-2 pr-2">Title</th><th className="py-2 pr-2">Customer</th><th className="py-2 pr-2">Stage</th><th className="py-2 pr-2">Value</th><th className="py-2 pr-2">Close</th><th className="py-2 pr-2">Prob.</th><th className="py-2 pr-2 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="py-3 text-xs text-muted-foreground">Loading…</td></tr> :
                  deals.length === 0 ? <tr><td colSpan={7} className="py-3 text-xs text-muted-foreground">No deals yet.</td></tr> :
                    deals.map((d) => {
                      const cust = customers.find((c) => c.id === d.customer_id);
                      return (
                        <tr key={d.id} className="border-b border-border/50">
                          <td className="py-2 pr-2 font-medium">{d.title}</td>
                          <td className="py-2 pr-2">{cust?.name ?? "—"}</td>
                          <td className="py-2 pr-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{d.stage}</span></td>
                          <td className="py-2 pr-2">{d.currency} {Number(d.value).toLocaleString()}</td>
                          <td className="py-2 pr-2">{d.expected_close_date ?? "—"}</td>
                          <td className="py-2 pr-2">{d.probability ?? 0}%</td>
                          <td className="py-2 pr-2 text-right">
                            <button onClick={() => { setEditingDeal(d); setShowDealForm(true); }} className="mr-1 rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => deleteDeal(d.id)} className="rounded p-1 text-destructive hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
