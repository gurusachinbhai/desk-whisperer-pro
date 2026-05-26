import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, MessageSquare, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

type LogRow = {
  id: string;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  prompt: string;
  reply_preview: string | null;
  blocked: boolean;
  block_reason: string | null;
  message_count: number;
};

export default function AdminAssistantLogsPanel({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "blocked" | "answered">("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("ai_assistant_logs" as any)
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (filter === "blocked") q = q.eq("blocked", true);
    if (filter === "answered") q = q.eq("blocked", false);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows((data as any as LogRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, filter]);

  const visible = rows.filter((r) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.prompt?.toLowerCase().includes(s) ||
      r.reply_preview?.toLowerCase().includes(s) ||
      r.user_name?.toLowerCase().includes(s) ||
      r.user_email?.toLowerCase().includes(s)
    );
  });

  const blockedCount = rows.filter((r) => r.blocked).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">AI Assistant · Conversation Logs</h2>
            <p className="text-sm text-muted-foreground">
              Audit trail of employee questions. Sensitive values (emails, tokens, card numbers) are redacted.
            </p>
          </div>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-muted">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total queries" value={rows.length} />
        <Stat label="Blocked" value={blockedCount} tone="destructive" />
        <Stat label="Answered" value={rows.length - blockedCount} tone="primary" />
        <Stat label="Unique users" value={new Set(rows.map((r) => r.user_email ?? r.user_name ?? "?")).size} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "blocked", "answered"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompt, reply, user…"
          className="ml-auto w-full max-w-xs rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        {loading && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>}
        {!loading && visible.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No conversation logs yet.
          </div>
        )}
        {visible.map((r) => (
          <div
            key={r.id}
            className={`rounded-2xl border bg-card p-4 ${
              r.blocked ? "border-destructive/40" : "border-border"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{r.user_name ?? r.user_email ?? "Unknown user"}</span>
                {r.user_email && <span>· {r.user_email}</span>}
                <span>· {new Date(r.created_at).toLocaleString()}</span>
                <span>· {r.message_count} msg</span>
              </div>
              {r.blocked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-bold text-destructive">
                  <ShieldAlert className="h-3 w-3" /> Blocked
                  {r.block_reason ? ` · ${r.block_reason}` : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
                  <MessageSquare className="h-3 w-3" /> Answered
                </span>
              )}
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prompt</p>
                <p className="whitespace-pre-wrap">{r.prompt}</p>
              </div>
              {r.reply_preview && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reply preview</p>
                  <p className="whitespace-pre-wrap text-foreground/80">{r.reply_preview}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "primary" | "destructive" }) {
  const toneClass =
    tone === "destructive" ? "text-destructive" : tone === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${toneClass}`}>{value}</p>
    </div>
  );
}
