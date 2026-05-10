import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";

type Row = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  employee_code: string | null;
  uan_number: string | null;
  resignation_date: string | null;
  last_working_day: string | null;
  exit_status: string | null;
  status: string;
  created_at: string;
};

export default function AdminEmployeeSearchPanel({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"all" | "current" | "exited">("all");

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("employee_profiles")
      .select("id,display_name,email,phone,employee_code,uan_number,resignation_date,last_working_day,exit_status,status,created_at")
      .eq("company_id", companyId)
      .order("display_name")
      .then(({ data }) => setRows((data ?? []) as Row[]));
  }, [companyId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (scope === "current" && r.exit_status === "exited") return false;
      if (scope === "exited" && r.exit_status !== "exited") return false;
      if (!needle) return true;
      return (
        r.display_name.toLowerCase().includes(needle) ||
        (r.email ?? "").toLowerCase().includes(needle) ||
        (r.employee_code ?? "").toLowerCase().includes(needle) ||
        (r.uan_number ?? "").toLowerCase().includes(needle) ||
        (r.phone ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, scope]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-extrabold">Employee search</h3>
      </div>
      <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, ID, UAN, phone…"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        <select value={scope} onChange={(e) => setScope(e.target.value as any)}
          className="rounded-lg border border-border bg-background px-2 py-2 text-xs font-bold">
          <option value="all">All</option>
          <option value="current">Current</option>
          <option value="exited">Old / Exited</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-1">Name</th><th className="px-2 py-1">Code</th><th className="px-2 py-1">Email</th>
              <th className="px-2 py-1">UAN</th><th className="px-2 py-1">Joined</th><th className="px-2 py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-2 py-3 text-center text-muted-foreground">No matches.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-2 py-2 font-bold">{r.display_name}</td>
                <td className="px-2 py-2 font-mono text-[10px]">{r.employee_code ?? "—"}</td>
                <td className="px-2 py-2">{r.email ?? "—"}</td>
                <td className="px-2 py-2 font-mono">{r.uan_number ?? "—"}</td>
                <td className="px-2 py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-2 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    r.exit_status === "exited" ? "bg-destructive/10 text-destructive" :
                    r.resignation_date ? "bg-amber-500/10 text-amber-600" : "bg-success/10 text-success"
                  }`}>
                    {r.exit_status === "exited" ? "Exited" : r.resignation_date ? "Notice" : (r.status ?? "active")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
