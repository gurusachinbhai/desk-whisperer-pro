import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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

const PAGE_SIZE = 1000;       // Supabase per-request cap
const PREVIEW_LIMIT = 1000;   // table preview only

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "");
const num = (n: number | null, d = 6) => (n == null ? "" : Number(n).toFixed(d));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function AdminAttendancePanel({ companyId }: { companyId: string }) {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // export progress
  const [exporting, setExporting] = useState<null | { kind: "csv" | "pdf"; done: number; total: number }>(null);
  const cancelRef = useRef(false);

  const load = async () => {
    setLoading(true);
    // preview: head=true count for the full range, then fetch first page only
    const { count } = await supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("work_date", from)
      .lte("work_date", to);
    setTotalCount(count ?? 0);

    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("company_id", companyId)
      .gte("work_date", from)
      .lte("work_date", to)
      .order("work_date", { ascending: false })
      .order("user_name", { ascending: true })
      .range(0, PREVIEW_LIMIT - 1);
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

  /**
   * Pages through Supabase using `.range()` so the export never tries to load
   * more than PAGE_SIZE rows in a single request — avoids gateway timeouts on
   * wide date ranges.
   */
  async function* streamRows(): AsyncGenerator<{ batch: Row[]; total: number }> {
    // total first
    const { count, error: cErr } = await supabase
      .from("attendance_records")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("work_date", from)
      .lte("work_date", to);
    if (cErr) throw cErr;
    const total = count ?? 0;
    if (total === 0) return;

    const q = search.trim().toLowerCase();
    let offset = 0;
    while (offset < total) {
      if (cancelRef.current) return;
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("company_id", companyId)
        .gte("work_date", from)
        .lte("work_date", to)
        .order("work_date", { ascending: false })
        .order("user_name", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      let batch = (data ?? []) as Row[];
      if (q) {
        batch = batch.filter(
          (r) =>
            r.user_name?.toLowerCase().includes(q) ||
            r.check_in_address?.toLowerCase().includes(q) ||
            r.check_out_address?.toLowerCase().includes(q),
        );
      }
      yield { batch, total };
      offset += PAGE_SIZE;
      // yield to the event loop so the UI stays responsive
      await sleep(0);
    }
  }

  const startExport = (kind: "csv" | "pdf") => {
    cancelRef.current = false;
    setExporting({ kind, done: 0, total: totalCount ?? 0 });
  };

  const finishExport = () => {
    setExporting(null);
    cancelRef.current = false;
  };

  const exportCsv = async () => {
    startExport("csv");
    try {
      const esc = (v: any) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const chunks: string[] = [headers.join(",") + "\n"];
      let done = 0;
      for await (const { batch, total } of streamRows()) {
        if (batch.length) {
          chunks.push(batch.map((r) => toRowArray(r).map(esc).join(",")).join("\n") + "\n");
        }
        done += batch.length;
        setExporting({ kind: "csv", done, total });
      }
      if (cancelRef.current) {
        toast.info("Export cancelled");
        return;
      }
      const blob = new Blob(chunks, { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${from}_to_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${done.toLocaleString()} record(s)`);
    } catch (e: any) {
      toast.error(`CSV export failed: ${e?.message ?? "unknown error"}`);
    } finally {
      finishExport();
    }
  };

  const exportPdf = async () => {
    startExport("pdf");
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(14);
      doc.text(`Attendance Report (${from} to ${to})`, 40, 30);
      doc.setFontSize(9);
      const generatedAt = new Date().toLocaleString();

      let done = 0;
      let firstPage = true;
      for await (const { batch, total } of streamRows()) {
        if (!batch.length) {
          setExporting({ kind: "pdf", done, total });
          continue;
        }
        // Append each page as its own autoTable block. lastAutoTable.finalY
        // continues the layout without keeping the whole dataset in one body.
        const startY = firstPage ? 60 : (doc as any).lastAutoTable?.finalY + 16 || 60;
        autoTable(doc, {
          startY,
          head: firstPage ? [headers] : undefined,
          body: batch.map(toRowArray),
          styles: { fontSize: 6, cellPadding: 2, overflow: "linebreak" },
          headStyles: { fillColor: [30, 41, 59], fontSize: 6 },
          columnStyles: { 7: { cellWidth: 90 }, 13: { cellWidth: 90 } },
        });
        firstPage = false;
        done += batch.length;
        setExporting({ kind: "pdf", done, total });
      }
      if (cancelRef.current) {
        toast.info("Export cancelled");
        return;
      }
      doc.setFontSize(8);
      doc.text(`Generated ${generatedAt} · ${done.toLocaleString()} records`, 40, 14);
      doc.save(`attendance_${from}_to_${to}.pdf`);
      toast.success(`Exported ${done.toLocaleString()} record(s)`);
    } catch (e: any) {
      toast.error(`PDF export failed: ${e?.message ?? "unknown error"}`);
    } finally {
      finishExport();
    }
  };

  const progressPct =
    exporting && exporting.total > 0
      ? Math.min(100, Math.round((exporting.done / exporting.total) * 100))
      : 0;

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
          <Button variant="outline" size="sm" onClick={load} disabled={loading || !!exporting}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={exportCsv} disabled={!!exporting || (totalCount ?? 0) === 0}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button size="sm" variant="secondary" onClick={exportPdf} disabled={!!exporting || (totalCount ?? 0) === 0}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </header>

      {exporting && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between font-semibold">
              <span>
                Exporting {exporting.kind.toUpperCase()} · {exporting.done.toLocaleString()} /{" "}
                {exporting.total.toLocaleString()}
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { cancelRef.current = true; }}
          >
            <X className="h-4 w-4" /> Cancel
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Showing {filtered.length.toLocaleString()} of{" "}
          {(totalCount ?? rows.length).toLocaleString()} record(s).
          {totalCount != null && totalCount > PREVIEW_LIMIT && (
            <> Preview capped at {PREVIEW_LIMIT.toLocaleString()} — exports include the full range.</>
          )}
        </span>
      </div>

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
