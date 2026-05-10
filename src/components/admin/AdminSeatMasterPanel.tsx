import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Armchair, Plus, Trash2, Power } from "lucide-react";

type Seat = {
  id: string;
  floor: string | null;
  area: string | null;
  seat_label: string;
  is_active: boolean;
};

export default function AdminSeatMasterPanel({ companyId }: { companyId: string }) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [floor, setFloor] = useState("");
  const [area, setArea] = useState("");
  const [label, setLabel] = useState("");
  const [bulkPrefix, setBulkPrefix] = useState("");
  const [bulkFrom, setBulkFrom] = useState<number | "">("");
  const [bulkTo, setBulkTo] = useState<number | "">("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("desk_seats").select("*").eq("company_id", companyId)
      .order("floor").order("area").order("seat_label");
    if (error) toast.error("Load failed", { description: error.message });
    setSeats((data ?? []) as Seat[]);
    setLoading(false);
  };
  useEffect(() => { if (companyId) load(); }, [companyId]);

  const addOne = async (e: FormEvent) => {
    e.preventDefault();
    const lab = label.trim().toUpperCase();
    if (!lab) return;
    const { error } = await supabase.from("desk_seats").insert({
      company_id: companyId, floor: floor.trim() || null, area: area.trim().toUpperCase() || null, seat_label: lab,
    });
    if (error) return toast.error("Add failed", { description: error.message });
    toast.success("Seat added"); setLabel(""); load();
  };

  const addBulk = async () => {
    if (!bulkPrefix || bulkFrom === "" || bulkTo === "" || +bulkTo < +bulkFrom) {
      toast.error("Enter prefix, from and to (e.g. A-, 101, 120)");
      return;
    }
    const rows = [];
    for (let i = +bulkFrom; i <= +bulkTo; i++) {
      rows.push({
        company_id: companyId,
        floor: floor.trim() || null,
        area: area.trim().toUpperCase() || null,
        seat_label: `${bulkPrefix.toUpperCase()}${i}`,
      });
    }
    const { error } = await supabase.from("desk_seats").insert(rows);
    if (error) return toast.error("Bulk add failed", { description: error.message });
    toast.success(`${rows.length} seats added`);
    setBulkPrefix(""); setBulkFrom(""); setBulkTo(""); load();
  };

  const toggleActive = async (s: Seat) => {
    await supabase.from("desk_seats").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("desk_seats").delete().eq("id", id);
    toast.success("Seat removed"); load();
  };

  if (loading) return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>;

  // group by floor/area
  const grouped: Record<string, Seat[]> = {};
  seats.forEach((s) => {
    const k = `${s.floor ?? "—"} · ${s.area ?? "—"}`;
    (grouped[k] ??= []).push(s);
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Armchair className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-extrabold">Open desk · Seat master</h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Define alphanumeric seat labels (e.g. A-101, B2-15). These show up as picks in employee booking.</p>

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Floor (e.g. F1)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Area (e.g. NORTH)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </div>

      <form onSubmit={addOne} className="mb-3 grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-[1fr_auto]">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Seat label (e.g. A-101)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Add seat
        </button>
      </form>

      <div className="mb-4 grid gap-2 rounded-xl border border-dashed border-border bg-background p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <input value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} placeholder="Prefix (e.g. A-)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <input value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value === "" ? "" : +e.target.value)} type="number" placeholder="From"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <input value={bulkTo} onChange={(e) => setBulkTo(e.target.value === "" ? "" : +e.target.value)} type="number" placeholder="To"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <button onClick={addBulk} className="rounded-lg border border-border px-3 py-2 text-xs font-extrabold">Bulk add</button>
      </div>

      {Object.keys(grouped).length === 0 && <p className="text-sm text-muted-foreground">No seats yet.</p>}
      {Object.entries(grouped).map(([k, arr]) => (
        <div key={k} className="mb-3">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{k}</p>
          <div className="flex flex-wrap gap-1.5">
            {arr.map((s) => (
              <div key={s.id} className={`inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-mono ${s.is_active ? "bg-background" : "bg-muted text-muted-foreground line-through"}`}>
                {s.seat_label}
                <button onClick={() => toggleActive(s)} title="Toggle active" className="ml-1 text-muted-foreground hover:text-foreground"><Power className="h-3 w-3" /></button>
                <button onClick={() => remove(s.id)} title="Remove" className="text-destructive"><Trash2 className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
