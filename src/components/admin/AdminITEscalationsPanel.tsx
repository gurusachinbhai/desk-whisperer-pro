import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, RefreshCw, CheckCircle2, Clock, XCircle, Play } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  prompt: string;
  block_reason: string | null;
  context: Record<string, any> | null;
  status: "open" | "in_progress" | "resolved" | "dismissed";
  it_notes: string | null;
  resolved_at: string | null;
};

const STATUS_TABS = ["open", "in_progress", "resolved", "dismissed"] as const;

export default function AdminITEscalationsPanel({ companyId }: { companyId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number] | "all">("open");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("it_security_escalations" as any)
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (tab !== "all") q = q.eq("status", tab);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows((data as any as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, tab]);

  const update = async (id: string, patch: Partial<Row>) => {
    const body: any = { ...patch };
    if (patch.status === "resolved" || patch.status === "dismissed") {
      body.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from("it_security_escalations" as any)
      .update(body)
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Escalation updated");
      load();
    }
  };

  const counts = STATUS_TABS.reduce(
    (acc, s) => ({ ...acc, [s]: rows.filter((r) => r.status === s).length }),
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">IT Security Escalations</h2>
            <p className="text-sm text-muted-foreground">
              Blocked AI assistant questions routed to IT for follow-up. Sensitive values are redacted.
            </p>
          </div>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-muted">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", ...STATUS_TABS] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
              tab === t ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-muted"
            }`}
          >
            {t.replace("_", " ")}
            {t !== "all" && <span className="ml-1.5 opacity-70">({counts[t] ?? 0})</span>}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>}
        {!loading && rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No escalations in this view.
          </div>
        )}
        {rows.map((r) => {
          const isOpen = r.status === "open";
          const isInProg = r.status === "in_progress";
          return (
            <div
              key={r.id}
              className={`rounded-2xl border bg-card p-4 ${
                isOpen ? "border-destructive/40" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground">{r.user_name ?? r.user_email ?? "Unknown user"}</span>
                  {r.user_email && <span>· {r.user_email}</span>}
                  <span>· {new Date(r.created_at).toLocaleString()}</span>
                  {r.block_reason && <span>· reason: {r.block_reason}</span>}
                </div>
                <StatusBadge status={r.status} />
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Employee message</p>
                  <p className="whitespace-pre-wrap">{r.prompt}</p>
                </div>
                {r.context && Object.keys(r.context).length > 0 && (
                  <details className="rounded-xl bg-muted/40 p-2 text-xs">
                    <summary className="cursor-pointer font-bold">Context</summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(r.context, null, 2)}
                    </pre>
                  </details>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">IT notes</p>
                  <textarea
                    defaultValue={r.it_notes ?? ""}
                    onChange={(e) => setNotesDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                    placeholder="Add follow-up notes for the audit trail…"
                    className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={2}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => update(r.id, { it_notes: notesDraft[r.id] ?? r.it_notes ?? "" })}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold hover:bg-muted"
                >
                  Save notes
                </button>
                {isOpen && (
                  <button
                    onClick={() => update(r.id, { status: "in_progress", it_notes: notesDraft[r.id] ?? r.it_notes ?? null })}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
                  >
                    <Play className="h-3 w-3" /> Take ownership
                  </button>
                )}
                {(isOpen || isInProg) && (
                  <>
                    <button
                      onClick={() => update(r.id, { status: "resolved", it_notes: notesDraft[r.id] ?? r.it_notes ?? null })}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-success/15 px-3 py-1.5 text-xs font-bold text-success hover:bg-success/25"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Resolve
                    </button>
                    <button
                      onClick={() => update(r.id, { status: "dismissed", it_notes: notesDraft[r.id] ?? r.it_notes ?? null })}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/80"
                    >
                      <XCircle className="h-3 w-3" /> Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Row["status"] }) {
  const map: Record<Row["status"], { label: string; cls: string; Icon: any }> = {
    open: { label: "Open", cls: "bg-destructive/10 text-destructive", Icon: ShieldAlert },
    in_progress: { label: "In progress", cls: "bg-primary/10 text-primary", Icon: Clock },
    resolved: { label: "Resolved", cls: "bg-success/15 text-success", Icon: CheckCircle2 },
    dismissed: { label: "Dismissed", cls: "bg-muted text-muted-foreground", Icon: XCircle },
  };
  const { label, cls, Icon } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}
