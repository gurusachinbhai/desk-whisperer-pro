import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, ArrowDownToLine, ArrowUpFromLine, History, AlertTriangle } from "lucide-react";

type Item = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  quantity: number;
  reorder_level: number;
  unit_cost: number | null;
  currency: string;
  location: string | null;
  supplier: string | null;
};

type Movement = {
  id: string;
  item_id: string;
  movement_type: string;
  quantity: number;
  reference: string | null;
  notes: string | null;
  performed_by_name: string | null;
  performed_at: string;
};

export default function AdminInventoryPanel({ companyId, uploaderName }: { companyId: string; uploaderName: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [moveFor, setMoveFor] = useState<{ item: Item; type: "in" | "out" | "adjust" } | null>(null);
  const [historyFor, setHistoryFor] = useState<Item | null>(null);

  async function load() {
    setLoading(true);
    const [i, m] = await Promise.all([
      supabase.from("inventory_items").select("*").eq("company_id", companyId).order("name"),
      supabase.from("inventory_movements").select("*").eq("company_id", companyId).order("performed_at", { ascending: false }).limit(200),
    ]);
    if (i.error) toast.error(i.error.message); else setItems((i.data ?? []) as Item[]);
    if (m.error) toast.error(m.error.message); else setMovements((m.data ?? []) as Movement[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  async function saveItem(form: FormData) {
    const payload = {
      company_id: companyId,
      sku: String(form.get("sku") || "").trim(),
      name: String(form.get("name") || "").trim(),
      category: String(form.get("category") || "") || null,
      unit: String(form.get("unit") || "pcs"),
      quantity: editing ? editing.quantity : Number(form.get("quantity") || 0),
      reorder_level: Number(form.get("reorder_level") || 0),
      unit_cost: form.get("unit_cost") ? Number(form.get("unit_cost")) : null,
      currency: String(form.get("currency") || "INR"),
      location: String(form.get("location") || "") || null,
      supplier: String(form.get("supplier") || "") || null,
    };
    if (!payload.sku || !payload.name) return toast.error("SKU and name required");
    const res = editing
      ? await supabase.from("inventory_items").update(payload).eq("id", editing.id)
      : await supabase.from("inventory_items").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Item updated" : "Item added");
    setShowForm(false); setEditing(null); load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item? Movement history will remain.")) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Item deleted"); load();
  }

  async function submitMovement(form: FormData) {
    if (!moveFor) return;
    const qty = Number(form.get("quantity") || 0);
    if (!qty || qty <= 0) return toast.error("Quantity must be > 0");
    if (moveFor.type === "out" && qty > moveFor.item.quantity) return toast.error("Not enough stock");
    const { error } = await supabase.from("inventory_movements").insert({
      company_id: companyId,
      item_id: moveFor.item.id,
      movement_type: moveFor.type,
      quantity: qty,
      reference: String(form.get("reference") || "") || null,
      notes: String(form.get("notes") || "") || null,
      performed_by_name: uploaderName,
    });
    if (error) return toast.error(error.message);
    toast.success("Stock updated"); setMoveFor(null); load();
  }

  const lowStock = items.filter((i) => Number(i.quantity) <= Number(i.reorder_level));
  const totalValue = items.reduce((a, b) => a + Number(b.quantity || 0) * Number(b.unit_cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold">Inventory</h2>
            <p className="text-xs text-muted-foreground">Track stock items, receipts, issues and adjustments.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="rounded-lg border border-border px-3 py-1.5"><span className="text-muted-foreground">Items: </span><b>{items.length}</b></div>
            <div className="rounded-lg border border-border px-3 py-1.5"><span className="text-muted-foreground">Stock value: </span><b>₹{totalValue.toLocaleString()}</b></div>
            <div className={`rounded-lg border px-3 py-1.5 ${lowStock.length ? "border-destructive text-destructive" : "border-border"}`}>
              <AlertTriangle className="mr-1 inline h-3 w-3" /> Low stock: <b>{lowStock.length}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold">Items</h3>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Plus className="h-3.5 w-3.5" /> New item</button>
        </div>

        {showForm && (
          <form onSubmit={(e) => { e.preventDefault(); saveItem(new FormData(e.currentTarget)); }} className="mb-4 grid gap-2 rounded-xl border border-border p-3 md:grid-cols-3">
            <input name="sku" defaultValue={editing?.sku ?? ""} placeholder="SKU *" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <input name="name" defaultValue={editing?.name ?? ""} placeholder="Name *" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm md:col-span-2" />
            <input name="category" defaultValue={editing?.category ?? ""} placeholder="Category" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <input name="unit" defaultValue={editing?.unit ?? "pcs"} placeholder="Unit (pcs/kg/box)" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            {!editing && <input name="quantity" type="number" step="0.01" defaultValue={0} placeholder="Opening qty" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />}
            <input name="reorder_level" type="number" step="0.01" defaultValue={editing?.reorder_level ?? 0} placeholder="Reorder level" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <input name="unit_cost" type="number" step="0.01" defaultValue={editing?.unit_cost ?? ""} placeholder="Unit cost" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <input name="currency" defaultValue={editing?.currency ?? "INR"} placeholder="Currency" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <input name="location" defaultValue={editing?.location ?? ""} placeholder="Location" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <input name="supplier" defaultValue={editing?.supplier ?? ""} placeholder="Supplier" className="rounded-md border border-input bg-background px-2 py-1.5 text-sm md:col-span-2" />
            <div className="md:col-span-3 flex gap-2">
              <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">{editing ? "Update" : "Save"}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold"><X className="inline h-3 w-3" /> Cancel</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-2">SKU</th><th className="py-2 pr-2">Name</th><th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2 text-right">Qty</th><th className="py-2 pr-2 text-right">Reorder</th>
                <th className="py-2 pr-2 text-right">Cost</th><th className="py-2 pr-2">Location</th>
                <th className="py-2 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="py-3 text-xs text-muted-foreground">Loading…</td></tr> :
                items.length === 0 ? <tr><td colSpan={8} className="py-3 text-xs text-muted-foreground">No items yet.</td></tr> :
                  items.map((it) => {
                    const low = Number(it.quantity) <= Number(it.reorder_level);
                    return (
                      <tr key={it.id} className="border-b border-border/50">
                        <td className="py-2 pr-2 font-mono text-xs">{it.sku}</td>
                        <td className="py-2 pr-2 font-medium">{it.name}</td>
                        <td className="py-2 pr-2">{it.category ?? "—"}</td>
                        <td className={`py-2 pr-2 text-right font-bold ${low ? "text-destructive" : ""}`}>{Number(it.quantity)} {it.unit}</td>
                        <td className="py-2 pr-2 text-right">{Number(it.reorder_level)}</td>
                        <td className="py-2 pr-2 text-right">{it.unit_cost != null ? `${it.currency} ${Number(it.unit_cost).toLocaleString()}` : "—"}</td>
                        <td className="py-2 pr-2">{it.location ?? "—"}</td>
                        <td className="py-2 pr-2 text-right whitespace-nowrap">
                          <button title="Stock in" onClick={() => setMoveFor({ item: it, type: "in" })} className="mr-1 rounded p-1 text-emerald-600 hover:bg-muted"><ArrowDownToLine className="h-3.5 w-3.5" /></button>
                          <button title="Stock out" onClick={() => setMoveFor({ item: it, type: "out" })} className="mr-1 rounded p-1 text-orange-600 hover:bg-muted"><ArrowUpFromLine className="h-3.5 w-3.5" /></button>
                          <button title="History" onClick={() => setHistoryFor(it)} className="mr-1 rounded p-1 hover:bg-muted"><History className="h-3.5 w-3.5" /></button>
                          <button title="Edit" onClick={() => { setEditing(it); setShowForm(true); }} className="mr-1 rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                          <button title="Delete" onClick={() => deleteItem(it.id)} className="rounded p-1 text-destructive hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {moveFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setMoveFor(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); submitMovement(new FormData(e.currentTarget)); }}
            className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-background p-4">
            <h4 className="text-sm font-extrabold">
              {moveFor.type === "in" ? "Stock in" : moveFor.type === "out" ? "Stock out" : "Adjust stock"} · {moveFor.item.name}
            </h4>
            <p className="text-xs text-muted-foreground">Current: {Number(moveFor.item.quantity)} {moveFor.item.unit}</p>
            <input name="quantity" type="number" step="0.01" placeholder={moveFor.type === "adjust" ? "New total quantity" : "Quantity"} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" autoFocus />
            <input name="reference" placeholder="Reference (PO #, invoice…)" className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <textarea name="notes" placeholder="Notes" rows={2} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMoveFor(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold">Cancel</button>
              <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Confirm</button>
            </div>
          </form>
        </div>
      )}

      {historyFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setHistoryFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl space-y-3 rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold">History · {historyFor.name}</h4>
              <button onClick={() => setHistoryFor(null)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr className="border-b border-border"><th className="py-2 pr-2">When</th><th className="py-2 pr-2">Type</th><th className="py-2 pr-2 text-right">Qty</th><th className="py-2 pr-2">Ref</th><th className="py-2 pr-2">By</th></tr></thead>
                <tbody>
                  {movements.filter((m) => m.item_id === historyFor.id).map((m) => (
                    <tr key={m.id} className="border-b border-border/50">
                      <td className="py-2 pr-2 text-xs">{new Date(m.performed_at).toLocaleString()}</td>
                      <td className="py-2 pr-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{m.movement_type}</span></td>
                      <td className="py-2 pr-2 text-right font-bold">{Number(m.quantity)}</td>
                      <td className="py-2 pr-2">{m.reference ?? "—"}</td>
                      <td className="py-2 pr-2">{m.performed_by_name ?? "—"}</td>
                    </tr>
                  ))}
                  {movements.filter((m) => m.item_id === historyFor.id).length === 0 && (
                    <tr><td colSpan={5} className="py-3 text-xs text-muted-foreground">No movements yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
