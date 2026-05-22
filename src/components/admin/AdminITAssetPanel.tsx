import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Laptop, KeyRound, History, Plus, Search, AlertTriangle, UserCheck, UserMinus, PackageOpen, RotateCcw } from "lucide-react";

type Hardware = {
  id: string; company_id: string; asset_tag: string; asset_type: string; serial_number: string | null;
  device_model: string | null; manufacturer: string | null; order_date: string | null; in_service_date: string | null;
  warranty_expiry: string | null; purchase_cost: number | null; currency: string | null; vendor: string | null;
  status: string; condition: string | null; location: string | null;
  current_owner_employee_id: string | null; current_owner_name: string | null; department: string | null; notes: string | null;
};

type Software = {
  id: string; company_id: string; software_name: string; vendor: string | null; license_type: string;
  total_seats: number | null; license_key: string | null; start_date: string | null; expiry_date: string | null;
  duration_months: number | null; renewal_alert_days: number | null; cost: number | null; currency: string | null; notes: string | null;
};

type Assignment = {
  id: string; hardware_asset_id: string; action: string; employee_name: string | null; department: string | null;
  location: string | null; performed_at: string; condition_check: string | null; notes: string | null; performed_by_name: string | null;
};

type Employee = { id: string; display_name: string; department_id?: string | null };

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-800",
  assigned: "bg-blue-100 text-blue-800",
  released: "bg-amber-100 text-amber-800",
  returned: "bg-slate-200 text-slate-800",
  retired: "bg-red-100 text-red-800",
  maintenance: "bg-purple-100 text-purple-800",
};

export default function AdminITAssetPanel({ companyId, uploaderName, meUserId }: { companyId: string; uploaderName: string; meUserId?: string | null }) {
  const [tab, setTab] = useState("hardware");
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [software, setSoftware] = useState<Software[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hwSearch, setHwSearch] = useState("");
  const [swSearch, setSwSearch] = useState("");
  const [hwDialog, setHwDialog] = useState(false);
  const [swDialog, setSwDialog] = useState(false);
  const [editingHw, setEditingHw] = useState<Hardware | null>(null);
  const [editingSw, setEditingSw] = useState<Software | null>(null);
  const [actionDialog, setActionDialog] = useState<{ hw: Hardware; action: "assign" | "release" | "return" } | null>(null);
  const [historyFor, setHistoryFor] = useState<Hardware | null>(null);
  const [history, setHistory] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    setLoading(true);
    const [hwR, swR, empR] = await Promise.all([
      supabase.from("it_hardware_assets").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("it_software_licenses").select("*").eq("company_id", companyId).order("expiry_date", { ascending: true, nullsFirst: false }),
      supabase.from("employee_profiles").select("id, display_name, department_id").eq("company_id", companyId).order("display_name"),
    ]);
    if (hwR.error) toast.error(hwR.error.message); else setHardware(hwR.data as any);
    if (swR.error) toast.error(swR.error.message); else setSoftware(swR.data as any);
    if (!empR.error) setEmployees(empR.data as any);
    setLoading(false);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [companyId]);

  const filteredHw = useMemo(() => {
    const q = hwSearch.trim().toLowerCase();
    if (!q) return hardware;
    return hardware.filter(h =>
      [h.asset_tag, h.serial_number, h.device_model, h.manufacturer, h.current_owner_name, h.vendor, h.status]
        .filter(Boolean).some(v => v!.toString().toLowerCase().includes(q))
    );
  }, [hardware, hwSearch]);

  const filteredSw = useMemo(() => {
    const q = swSearch.trim().toLowerCase();
    if (!q) return software;
    return software.filter(s =>
      [s.software_name, s.vendor, s.license_type, s.license_key].filter(Boolean).some(v => v!.toString().toLowerCase().includes(q))
    );
  }, [software, swSearch]);

  const expiringSoon = useMemo(() => software.filter(s => {
    if (!s.expiry_date) return false;
    const days = Math.ceil((new Date(s.expiry_date).getTime() - Date.now()) / 86400000);
    return days <= (s.renewal_alert_days ?? 30) && days >= 0;
  }), [software]);

  const expired = useMemo(() => software.filter(s => s.expiry_date && new Date(s.expiry_date) < new Date()), [software]);

  async function saveHardware(data: Partial<Hardware>) {
    const payload = { ...data, company_id: companyId, created_by: meUserId ?? undefined };
    const res = editingHw
      ? await supabase.from("it_hardware_assets").update(payload).eq("id", editingHw.id)
      : await supabase.from("it_hardware_assets").insert(payload as any);
    if (res.error) return toast.error(res.error.message);
    toast.success(editingHw ? "Asset updated" : "Asset added");
    setHwDialog(false); setEditingHw(null); loadAll();
  }

  async function deleteHardware(id: string) {
    if (!confirm("Delete this asset and its history?")) return;
    const { error } = await supabase.from("it_hardware_assets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadAll();
  }

  async function saveSoftware(data: Partial<Software>) {
    const payload = { ...data, company_id: companyId, created_by: meUserId ?? undefined };
    const res = editingSw
      ? await supabase.from("it_software_licenses").update(payload).eq("id", editingSw.id)
      : await supabase.from("it_software_licenses").insert(payload as any);
    if (res.error) return toast.error(res.error.message);
    toast.success(editingSw ? "License updated" : "License added");
    setSwDialog(false); setEditingSw(null); loadAll();
  }

  async function deleteSoftware(id: string) {
    if (!confirm("Delete this license?")) return;
    const { error } = await supabase.from("it_software_licenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); loadAll();
  }

  async function performAction(hw: Hardware, action: "assign" | "release" | "return", payload: { employee_id?: string; employee_name?: string; department?: string; location?: string; condition?: string; notes?: string }) {
    const updates: Partial<Hardware> = {};
    if (action === "assign") {
      updates.status = "assigned";
      updates.current_owner_employee_id = payload.employee_id ?? null;
      updates.current_owner_name = payload.employee_name ?? null;
      updates.department = payload.department ?? null;
      updates.location = payload.location ?? hw.location;
    } else if (action === "release") {
      updates.status = "released";
      updates.current_owner_employee_id = null;
      updates.current_owner_name = null;
    } else if (action === "return") {
      updates.status = "available";
      updates.current_owner_employee_id = null;
      updates.current_owner_name = null;
      updates.condition = payload.condition ?? hw.condition;
    }

    const upd = await supabase.from("it_hardware_assets").update(updates).eq("id", hw.id);
    if (upd.error) return toast.error(upd.error.message);

    const hist = await supabase.from("it_asset_assignments").insert({
      company_id: companyId,
      hardware_asset_id: hw.id,
      action,
      employee_id: payload.employee_id ?? null,
      employee_name: payload.employee_name ?? hw.current_owner_name,
      department: payload.department ?? hw.department,
      location: payload.location ?? hw.location,
      condition_check: payload.condition ?? null,
      notes: payload.notes ?? null,
      performed_by: meUserId ?? null,
      performed_by_name: uploaderName,
    } as any);
    if (hist.error) toast.error(hist.error.message);
    toast.success(`Asset ${action}ed`);
    setActionDialog(null);
    loadAll();
  }

  async function openHistory(hw: Hardware) {
    setHistoryFor(hw);
    const { data, error } = await supabase.from("it_asset_assignments")
      .select("*").eq("hardware_asset_id", hw.id).order("performed_at", { ascending: false });
    if (error) toast.error(error.message);
    else setHistory(data as any);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-lg font-extrabold">IT Asset Management</h2>
        <p className="text-sm text-muted-foreground">Track hardware, software licenses, and assignment lifecycle in one place.</p>

        {(expiringSoon.length > 0 || expired.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {expired.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" /> {expired.length} expired license{expired.length>1?"s":""}
              </div>
            )}
            {expiringSoon.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" /> {expiringSoon.length} expiring within renewal window
              </div>
            )}
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="hardware"><Laptop className="mr-1.5 h-4 w-4" /> Hardware</TabsTrigger>
          <TabsTrigger value="software"><KeyRound className="mr-1.5 h-4 w-4" /> Software & Licenses</TabsTrigger>
          <TabsTrigger value="lifecycle"><History className="mr-1.5 h-4 w-4" /> Lifecycle Log</TabsTrigger>
        </TabsList>

        <TabsContent value="hardware" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={hwSearch} onChange={e => setHwSearch(e.target.value)} placeholder="Search by tag, serial, owner..." className="pl-8" />
            </div>
            <Button onClick={() => { setEditingHw(null); setHwDialog(true); }}><Plus className="mr-1 h-4 w-4" /> Add Hardware</Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Asset Tag</th>
                  <th className="px-3 py-2 text-left">Device</th>
                  <th className="px-3 py-2 text-left">Serial</th>
                  <th className="px-3 py-2 text-left">Owner</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Warranty</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHw.map(h => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="px-3 py-2 font-bold">{h.asset_tag}</td>
                    <td className="px-3 py-2">{h.manufacturer ? `${h.manufacturer} ` : ""}{h.device_model || h.asset_type}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{h.serial_number || "—"}</td>
                    <td className="px-3 py-2">{h.current_owner_name || <span className="text-muted-foreground">Unassigned</span>}</td>
                    <td className="px-3 py-2">
                      <Badge className={STATUS_COLORS[h.status] || ""}>{h.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs">{h.warranty_expiry || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        {h.status !== "assigned" && (
                          <Button size="sm" variant="outline" onClick={() => setActionDialog({ hw: h, action: "assign" })}>
                            <UserCheck className="mr-1 h-3 w-3" />Assign
                          </Button>
                        )}
                        {h.status === "assigned" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setActionDialog({ hw: h, action: "release" })}>
                              <PackageOpen className="mr-1 h-3 w-3" />Release
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setActionDialog({ hw: h, action: "return" })}>
                              <RotateCcw className="mr-1 h-3 w-3" />Return
                            </Button>
                          </>
                        )}
                        {h.status === "released" && (
                          <Button size="sm" variant="outline" onClick={() => setActionDialog({ hw: h, action: "return" })}>
                            <RotateCcw className="mr-1 h-3 w-3" />Return
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openHistory(h)}><History className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingHw(h); setHwDialog(true); }}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteHardware(h.id)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filteredHw.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">No hardware assets yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="software" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={swSearch} onChange={e => setSwSearch(e.target.value)} placeholder="Search software..." className="pl-8" />
            </div>
            <Button onClick={() => { setEditingSw(null); setSwDialog(true); }}><Plus className="mr-1 h-4 w-4" /> Add License</Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Software</th>
                  <th className="px-3 py-2 text-left">Vendor</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Seats</th>
                  <th className="px-3 py-2 text-left">Start</th>
                  <th className="px-3 py-2 text-left">Expiry</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSw.map(s => {
                  const daysLeft = s.expiry_date ? Math.ceil((new Date(s.expiry_date).getTime() - Date.now()) / 86400000) : null;
                  const expiringFlag = daysLeft != null && daysLeft <= (s.renewal_alert_days ?? 30);
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-3 py-2 font-bold">{s.software_name}</td>
                      <td className="px-3 py-2">{s.vendor || "—"}</td>
                      <td className="px-3 py-2 text-xs">{s.license_type}</td>
                      <td className="px-3 py-2">{s.total_seats ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{s.start_date || "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        {s.expiry_date || "—"}
                        {expiringFlag && (
                          <Badge className={`ml-2 ${daysLeft! < 0 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                            {daysLeft! < 0 ? "Expired" : `${daysLeft}d`}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingSw(s); setSwDialog(true); }}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteSoftware(s.id)}>Delete</Button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filteredSw.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">No licenses yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="lifecycle">
          <LifecycleLog companyId={companyId} />
        </TabsContent>
      </Tabs>

      <HardwareDialog open={hwDialog} onOpenChange={(v) => { setHwDialog(v); if (!v) setEditingHw(null); }}
        initial={editingHw} onSave={saveHardware} />
      <SoftwareDialog open={swDialog} onOpenChange={(v) => { setSwDialog(v); if (!v) setEditingSw(null); }}
        initial={editingSw} onSave={saveSoftware} />
      {actionDialog && (
        <ActionDialog ctx={actionDialog} employees={employees}
          onClose={() => setActionDialog(null)}
          onConfirm={(payload) => performAction(actionDialog.hw, actionDialog.action, payload)} />
      )}
      {historyFor && (
        <Dialog open={!!historyFor} onOpenChange={(v) => !v && setHistoryFor(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>History · {historyFor.asset_tag}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {history.length === 0 && <p className="text-sm text-muted-foreground">No history yet.</p>}
              {history.map(h => (
                <div key={h.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <Badge className={STATUS_COLORS[h.action] || ""}>{h.action}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(h.performed_at).toLocaleString()}</span>
                  </div>
                  {h.employee_name && <p className="mt-1"><span className="font-bold">Employee:</span> {h.employee_name}</p>}
                  {h.department && <p className="text-xs text-muted-foreground">Dept: {h.department}</p>}
                  {h.location && <p className="text-xs text-muted-foreground">Location: {h.location}</p>}
                  {h.condition_check && <p className="text-xs">Condition: {h.condition_check}</p>}
                  {h.notes && <p className="mt-1 text-xs italic text-muted-foreground">{h.notes}</p>}
                  {h.performed_by_name && <p className="mt-1 text-[10px] text-muted-foreground">by {h.performed_by_name}</p>}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function LifecycleLog({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<(Assignment & { asset_tag?: string })[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("it_asset_assignments")
        .select("*, it_hardware_assets!inner(asset_tag)")
        .eq("company_id", companyId)
        .order("performed_at", { ascending: false })
        .limit(200);
      const mapped = (data || []).map((d: any) => ({ ...d, asset_tag: d.it_hardware_assets?.asset_tag }));
      setRows(mapped);
    })();
  }, [companyId]);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase">
          <tr>
            <th className="px-3 py-2 text-left">When</th>
            <th className="px-3 py-2 text-left">Asset</th>
            <th className="px-3 py-2 text-left">Action</th>
            <th className="px-3 py-2 text-left">Employee</th>
            <th className="px-3 py-2 text-left">By</th>
            <th className="px-3 py-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-3 py-2 text-xs">{new Date(r.performed_at).toLocaleString()}</td>
              <td className="px-3 py-2 font-bold">{r.asset_tag}</td>
              <td className="px-3 py-2"><Badge className={STATUS_COLORS[r.action] || ""}>{r.action}</Badge></td>
              <td className="px-3 py-2">{r.employee_name || "—"}</td>
              <td className="px-3 py-2 text-xs">{r.performed_by_name || "—"}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{r.notes || ""}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No activity yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function HardwareDialog({ open, onOpenChange, initial, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; initial: Hardware | null; onSave: (data: Partial<Hardware>) => void;
}) {
  const [f, setF] = useState<Partial<Hardware>>({});
  useEffect(() => { setF(initial ?? { asset_type: "Laptop", status: "available", currency: "INR" }); }, [initial, open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} Hardware Asset</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Asset Tag *"><Input value={f.asset_tag || ""} onChange={e => setF({ ...f, asset_tag: e.target.value })} placeholder="IT-LP-0402" /></Field>
          <Field label="Asset Type">
            <Select value={f.asset_type || "Laptop"} onValueChange={v => setF({ ...f, asset_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Laptop","Desktop","Monitor","Phone","Tablet","Accessory","Other"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Manufacturer"><Input value={f.manufacturer || ""} onChange={e => setF({ ...f, manufacturer: e.target.value })} placeholder="Apple / Dell" /></Field>
          <Field label="Model"><Input value={f.device_model || ""} onChange={e => setF({ ...f, device_model: e.target.value })} placeholder="MacBook Pro M3" /></Field>
          <Field label="Serial Number"><Input value={f.serial_number || ""} onChange={e => setF({ ...f, serial_number: e.target.value })} /></Field>
          <Field label="Vendor"><Input value={f.vendor || ""} onChange={e => setF({ ...f, vendor: e.target.value })} /></Field>
          <Field label="Order Date"><Input type="date" value={f.order_date || ""} onChange={e => setF({ ...f, order_date: e.target.value })} /></Field>
          <Field label="In-service Date"><Input type="date" value={f.in_service_date || ""} onChange={e => setF({ ...f, in_service_date: e.target.value })} /></Field>
          <Field label="Warranty Expiry"><Input type="date" value={f.warranty_expiry || ""} onChange={e => setF({ ...f, warranty_expiry: e.target.value })} /></Field>
          <Field label="Purchase Cost"><Input type="number" value={f.purchase_cost ?? ""} onChange={e => setF({ ...f, purchase_cost: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label="Currency"><Input value={f.currency || ""} onChange={e => setF({ ...f, currency: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={f.status || "available"} onValueChange={v => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["available","assigned","released","returned","retired","maintenance"].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Location"><Input value={f.location || ""} onChange={e => setF({ ...f, location: e.target.value })} placeholder="HQ / Remote" /></Field>
          <Field label="Condition"><Input value={f.condition || ""} onChange={e => setF({ ...f, condition: e.target.value })} /></Field>
          <div className="col-span-2"><Field label="Notes"><Textarea value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></Field></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (!f.asset_tag) return toast.error("Asset tag required"); onSave(f); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SoftwareDialog({ open, onOpenChange, initial, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; initial: Software | null; onSave: (data: Partial<Software>) => void;
}) {
  const [f, setF] = useState<Partial<Software>>({});
  useEffect(() => { setF(initial ?? { license_type: "per_user", total_seats: 1, renewal_alert_days: 30, currency: "INR" }); }, [initial, open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} Software License</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Software Name *"><Input value={f.software_name || ""} onChange={e => setF({ ...f, software_name: e.target.value })} placeholder="Microsoft 365" /></Field>
          <Field label="Vendor"><Input value={f.vendor || ""} onChange={e => setF({ ...f, vendor: e.target.value })} /></Field>
          <Field label="License Type">
            <Select value={f.license_type || "per_user"} onValueChange={v => setF({ ...f, license_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[
                { v: "per_user", l: "Per-user" }, { v: "per_device", l: "Per-device" },
                { v: "concurrent", l: "Concurrent" }, { v: "saas", l: "SaaS subscription" }, { v: "perpetual", l: "Perpetual" },
              ].map(x => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Total Seats"><Input type="number" value={f.total_seats ?? ""} onChange={e => setF({ ...f, total_seats: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label="License Key"><Input value={f.license_key || ""} onChange={e => setF({ ...f, license_key: e.target.value })} /></Field>
          <Field label="Cost"><Input type="number" value={f.cost ?? ""} onChange={e => setF({ ...f, cost: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label="Start Date"><Input type="date" value={f.start_date || ""} onChange={e => setF({ ...f, start_date: e.target.value })} /></Field>
          <Field label="Expiry Date"><Input type="date" value={f.expiry_date || ""} onChange={e => setF({ ...f, expiry_date: e.target.value })} /></Field>
          <Field label="Duration (months)"><Input type="number" value={f.duration_months ?? ""} onChange={e => setF({ ...f, duration_months: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label="Renewal Alert (days before)"><Input type="number" value={f.renewal_alert_days ?? ""} onChange={e => setF({ ...f, renewal_alert_days: e.target.value ? Number(e.target.value) : null })} /></Field>
          <div className="col-span-2"><Field label="Notes"><Textarea value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></Field></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (!f.software_name) return toast.error("Software name required"); onSave(f); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionDialog({ ctx, employees, onClose, onConfirm }: {
  ctx: { hw: Hardware; action: "assign" | "release" | "return" };
  employees: Employee[];
  onClose: () => void;
  onConfirm: (payload: any) => void;
}) {
  const [empId, setEmpId] = useState<string>("");
  const [empName, setEmpName] = useState("");
  const [dept, setDept] = useState("");
  const [location, setLocation] = useState(ctx.hw.location || "");
  const [condition, setCondition] = useState("");
  const [notes, setNotes] = useState("");
  const titles = { assign: "Assign asset", release: "Release asset", return: "Return asset" };
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{titles[ctx.action]} · {ctx.hw.asset_tag}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {ctx.action === "assign" && (
            <>
              <Field label="Employee">
                <Select value={empId} onValueChange={(v) => {
                  setEmpId(v);
                  const emp = employees.find(e => e.id === v);
                  if (emp) setEmpName(emp.display_name);
                }}>
                  <SelectTrigger><SelectValue placeholder="Pick employee" /></SelectTrigger>
                  <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.display_name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Department"><Input value={dept} onChange={e => setDept(e.target.value)} /></Field>
              <Field label="Location"><Input value={location} onChange={e => setLocation(e.target.value)} /></Field>
            </>
          )}
          {ctx.action === "return" && (
            <Field label="Physical condition check"><Input value={condition} onChange={e => setCondition(e.target.value)} placeholder="Good / Scratched / Damaged" /></Field>
          )}
          <Field label="Notes"><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm({
            employee_id: empId || undefined,
            employee_name: empName || undefined,
            department: dept || undefined,
            location: location || undefined,
            condition: condition || undefined,
            notes: notes || undefined,
          })}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-bold">{label}</Label>
      {children}
    </div>
  );
}
