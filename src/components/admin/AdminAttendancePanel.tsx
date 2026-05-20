import { useEffect, useMemo, useState } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Row = {
  id: string;
  user_id: string;
  user_name: string;
  work_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_accuracy_m: number | null;
  check_in_distance_m: number | null;
  check_in_address: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_accuracy_m: number | null;
  check_out_distance_m: number | null;
  check_out_address: string | null;
  status: string;
  notes: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString() : "";
const num = (n: number | null, d = 6) =>
  n == null ? "" : Number(n).toFixed(d);

export default function AdminAttendancePanel({ companyId }: { companyId: string }) {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("company_id", companyId)
      .gte("work_date", from)
      .lte("work_date", to)
      .order("work_date", { ascending: false })
      .order("user_name", { ascending: true });
    if (!error && data) setRows(data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (companyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, from, to]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.user_name?.toLowerCase().includes(q) ||
        r.check_in_address?.toLowerCase().includes(q) ||
        r.check_out_address?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const headers = [
    "Employee", "Date", "Sign-in", "Sign-in Lat", "Sign-in Lng",
    "Sign-in Accuracy (m)", "Sign-in Distance (m)", "Sign-in Address",
    "Sign-out", "Sign-out Lat", "Sign-out Lng",
    "Sign-out Accuracy (m)", "Sign-out Distance (m)", "Sign-out Address",
    "Status", "Notes",
  ];

  const toRowArray = (r: Row) => [
    r.user_name, r.work_date, fmt(r.check_in_at),
    num(r.check_in_lat), num(r.check_in_lng),
    num(r.check_in_accuracy_m, 1), num(r.check_in_distance_m, 1),
    r.check_in_address ?? "",
    fmt(r.check_out_at), num(r.check_out_lat), num(r.check_out_lng),
    num(r.check_out_accuracy_m, 1), num(r.check_out_distance_m, 1),
    r.check_out_address ?? "",
    r.status, r.notes ?? "",
  ];

  const exportCsv = () => {
    const esc = (v: any) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(","),
      ...filtered.map((r) => toRowArray(r).map(esc).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text(`Attendance Report (${from} to ${to})`, 40, 30);
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString()} · ${filtered.length} records`, 40, 46);
    autoTable(doc, {
      startY: 60,
      head: [headers],
      body: filtered.map(toRowArray),
      styles: { fontSize: 6, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [30, 41, 59], fontSize: 6 },
      columnStyles: { 7: { cellWidth: 90 }, 13: { cellWidth: 90 } },
    });
    doc.save(`attendance_${from}_to_${to}.pdf`);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Attendance & Geo-tagging</h2>
          <p className="text-xs text-muted-foreground">
            Check-in/out timestamps with GPS coordinates and distance from office.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-[10px] font-bold uppercase">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase">Search</Label>
            <Input placeholder="Name or address" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-48" />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={exportPdf} disabled={!filtered.length}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </header>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1100px] text-xs">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-2 py-2">Employee</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Sign-in</th>
              <th className="px-2 py-2">In Coords</th>
              <th className="px-2 py-2">In Dist</th>
              <th className="px-2 py-2">Sign-out</th>
              <th className="px-2 py-2">Out Coords</th>
              <th className="px-2 py-2">Out Dist</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-2 py-6 text-center text-muted-foreground">No records.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-2 py-1.5 font-semibold">{r.user_name}</td>
                <td className="px-2 py-1.5">{r.work_date}</td>
                <td className="px-2 py-1.5">{fmt(r.check_in_at)}</td>
                <td className="px-2 py-1.5 font-mono text-[10px]">
                  {r.check_in_lat != null ? `${num(r.check_in_lat, 5)}, ${num(r.check_in_lng, 5)}` : "—"}
                </td>
                <td className="px-2 py-1.5">{r.check_in_distance_m != null ? `${num(r.check_in_distance_m, 0)} m` : "—"}</td>
                <td className="px-2 py-1.5">{fmt(r.check_out_at)}</td>
                <td className="px-2 py-1.5 font-mono text-[10px]">
                  {r.check_out_lat != null ? `${num(r.check_out_lat, 5)}, ${num(r.check_out_lng, 5)}` : "—"}
                </td>
                <td className="px-2 py-1.5">{r.check_out_distance_m != null ? `${num(r.check_out_distance_m, 0)} m` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
