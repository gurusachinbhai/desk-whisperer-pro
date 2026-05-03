import { useEffect, useMemo, useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Ticket as TicketIcon,
  Search,
  Plus,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TicketType = "incident" | "request";
type TicketPriority = "P1" | "P2" | "P3" | "P4";
type TicketStatus = "open" | "in_progress" | "on_hold" | "resolved" | "closed";

type Ticket = {
  id: string;
  ticket_number: string;
  company_id: string;
  created_by: string;
  requester_name: string;
  requester_email: string | null;
  subject: string;
  description: string;
  ticket_type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  assignee_user_id: string | null;
  assignee_name: string | null;
  assigned_group: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
};

type Comment = {
  id: string;
  ticket_id: string;
  author_user_id: string;
  author_name: string;
  body: string;
  is_internal: boolean;
  created_at: string;
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  P1: "P1 — Critical",
  P2: "P2 — High",
  P3: "P3 — Medium",
  P4: "P4 — Low",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  resolved: "Resolved",
  closed: "Closed",
};

const priorityClass = (p: TicketPriority) =>
  p === "P1"
    ? "bg-destructive text-destructive-foreground"
    : p === "P2"
    ? "bg-orange-500 text-white"
    : p === "P3"
    ? "bg-amber-500 text-white"
    : "bg-muted text-foreground";

const statusVariant = (s: TicketStatus): "default" | "secondary" | "outline" =>
  s === "resolved" || s === "closed" ? "secondary" : s === "open" ? "default" : "outline";

const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200),
  description: z.string().trim().min(10, "Please describe the issue (10+ chars)").max(4000),
  ticket_type: z.enum(["incident", "request"]),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  assigned_group: z.string().trim().max(80).optional(),
  assignee_name: z.string().trim().max(120).optional(),
});

const Tickets = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as "list" | "new" | "lookup") || "list";

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [tab, setTab] = useState<"list" | "new" | "lookup">(initialTab);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [internalNote, setInternalNote] = useState(false);

  const [form, setForm] = useState({
    subject: "",
    description: "",
    ticket_type: "request" as TicketType,
    priority: "P3" as TicketPriority,
    assigned_group: "",
    assignee_name: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const [lookupNumber, setLookupNumber] = useState(searchParams.get("ticket") || "");
  const [lookupResult, setLookupResult] = useState<Ticket | null>(null);
  const [lookupChecked, setLookupChecked] = useState(false);

  // Bootstrap auth + role + company
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) {
        if (!cancelled) setLoading(false);
        return;
      }
      const userEmail = sessionData.session?.user.email ?? "";
      setUserId(uid);
      setEmail(userEmail);

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("employee_profiles")
          .select("company_id, display_name, email")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase.from("user_roles").select("role, company_id").eq("user_id", uid),
      ]);

      if (cancelled) return;

      if (profile) {
        setCompanyId(profile.company_id);
        setDisplayName(profile.display_name ?? userEmail);
        if (profile.email) setEmail(profile.email);
      }

      const adminInCompany =
        (roles ?? []).some((r) => r.role === "admin" && (!profile || r.company_id === profile.company_id));
      const isSuper = (roles ?? []).some((r) => r.role === "super_admin");
      setIsAdmin(adminInCompany);
      setIsSuperAdmin(isSuper);

      await loadTickets();
      setLoading(false);

      // If query has ticket number, auto-lookup
      const t = searchParams.get("ticket");
      if (t) {
        setTab("lookup");
        await runLookup(t);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load tickets", { description: error.message });
      return;
    }
    setTickets((data ?? []) as Ticket[]);
  };

  const loadComments = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("support_ticket_comments")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Failed to load comments", { description: error.message });
      return;
    }
    setComments((data ?? []) as Comment[]);
  };

  const openTicket = async (t: Ticket) => {
    setSelectedTicket(t);
    await loadComments(t.id);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !companyId) {
      toast.error("Please complete your profile setup first");
      return;
    }
    const parsed = ticketSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        company_id: companyId,
        created_by: userId,
        requester_name: displayName || email,
        requester_email: email || null,
        subject: parsed.data.subject,
        description: parsed.data.description,
        ticket_type: parsed.data.ticket_type,
        priority: parsed.data.priority,
        assigned_group: parsed.data.assigned_group || null,
        assignee_name: parsed.data.assignee_name || null,
      })
      .select("*")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't raise ticket", { description: error.message });
      return;
    }
    toast.success(`Ticket ${data.ticket_number} raised`);
    setForm({
      subject: "",
      description: "",
      ticket_type: "request",
      priority: "P3",
      assigned_group: "",
      assignee_name: "",
    });
    await loadTickets();
    setTab("list");
    setSelectedTicket(data as Ticket);
    await loadComments((data as Ticket).id);
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !userId || !newComment.trim()) return;
    const { error } = await supabase.from("support_ticket_comments").insert({
      ticket_id: selectedTicket.id,
      author_user_id: userId,
      author_name: displayName || email,
      body: newComment.trim().slice(0, 4000),
      is_internal: isAdmin || isSuperAdmin ? internalNote : false,
    });
    if (error) {
      toast.error("Couldn't post comment", { description: error.message });
      return;
    }
    setNewComment("");
    setInternalNote(false);
    await loadComments(selectedTicket.id);
  };

  const updateTicket = async (patch: Partial<Ticket>) => {
    if (!selectedTicket) return;
    const { data, error } = await supabase
      .from("support_tickets")
      .update(patch)
      .eq("id", selectedTicket.id)
      .select("*")
      .single();
    if (error) {
      toast.error("Update failed", { description: error.message });
      return;
    }
    setSelectedTicket(data as Ticket);
    setTickets((prev) => prev.map((t) => (t.id === data.id ? (data as Ticket) : t)));
    toast.success("Ticket updated");
  };

  const runLookup = async (numRaw?: string) => {
    const num = (numRaw ?? lookupNumber).trim().toUpperCase();
    if (!num) return;
    setLookupChecked(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("ticket_number", num)
      .maybeSingle();
    if (error) {
      toast.error("Lookup failed", { description: error.message });
      return;
    }
    setLookupResult((data as Ticket) ?? null);
    setSearchParams(num ? { ticket: num, tab: "lookup" } : {});
  };

  const canManage = isAdmin || isSuperAdmin;

  const visibleComments = useMemo(
    () => comments.filter((c) => canManage || !c.is_internal),
    [comments, canManage],
  );

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading help desk…
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle>Login required</CardTitle>
            <CardDescription>The support ticketing tool is only available to signed-in users.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/login">Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <TicketIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Help & support</p>
              <h1 className="text-lg font-extrabold leading-tight">Ticketing tool</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 text-xs font-bold">
          {[
            { id: "list", label: canManage ? "All tickets" : "My tickets" },
            { id: "new", label: "Raise a ticket" },
            { id: "lookup", label: "Track by number" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`rounded-xl px-3 py-2 ${
                tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        {tab === "list" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{canManage ? "All tickets in your company" : "Your tickets"}</CardTitle>
                <CardDescription>{tickets.length} total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {tickets.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No tickets yet. Raise one to get started.
                  </p>
                )}
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openTicket(t)}
                    className={`w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/60 ${
                      selectedTicket?.id === t.id ? "bg-muted/60 ring-2 ring-primary/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-primary">{t.ticket_number}</p>
                        <p className="mt-0.5 truncate text-sm font-semibold">{t.subject}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.requester_name} · {new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityClass(t.priority)}`}>
                          {t.priority}
                        </span>
                        <Badge variant={statusVariant(t.status)} className="text-[10px]">
                          {STATUS_LABEL[t.status]}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <div>
              {selectedTicket ? (
                <TicketDetail
                  ticket={selectedTicket}
                  comments={visibleComments}
                  canManage={canManage}
                  newComment={newComment}
                  setNewComment={setNewComment}
                  internalNote={internalNote}
                  setInternalNote={setInternalNote}
                  onAddComment={handleAddComment}
                  onUpdate={updateTicket}
                />
              ) : (
                <Card>
                  <CardContent className="grid place-items-center p-12 text-center text-sm text-muted-foreground">
                    Select a ticket to see details.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {tab === "new" && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle>Raise a ticket</CardTitle>
              <CardDescription>
                You'll get a unique ticket number you can use to track progress anytime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={form.ticket_type}
                      onValueChange={(v) => setForm((f) => ({ ...f, ticket_type: v as TicketType }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incident">Incident</SelectItem>
                        <SelectItem value="request">Request</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>SLA / Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TicketPriority }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["P1", "P2", "P3", "P4"] as const).map((p) => (
                          <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    maxLength={200}
                    placeholder="Short summary of the issue or request"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Details</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    maxLength={4000}
                    rows={5}
                    placeholder="What happened? What did you expect? Steps to reproduce."
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Assigned group <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Input
                      value={form.assigned_group}
                      onChange={(e) => setForm((f) => ({ ...f, assigned_group: e.target.value }))}
                      maxLength={80}
                      placeholder="e.g. IT Helpdesk, HR, Facilities"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Assignee <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Input
                      value={form.assignee_name}
                      onChange={(e) => setForm((f) => ({ ...f, assignee_name: e.target.value }))}
                      maxLength={120}
                      placeholder="Person's name"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Raise ticket
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {tab === "lookup" && (
          <Card className="mx-auto max-w-2xl">
            <CardHeader>
              <CardTitle>Track a ticket</CardTitle>
              <CardDescription>Enter the ticket number you received (e.g. TKT-2026-000001).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runLookup();
                }}
                className="flex gap-2"
              >
                <Input
                  value={lookupNumber}
                  onChange={(e) => setLookupNumber(e.target.value)}
                  placeholder="TKT-YYYY-000000"
                  maxLength={32}
                />
                <Button type="submit"><Search className="mr-2 h-4 w-4" /> Check</Button>
              </form>

              {lookupChecked && !lookupResult && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  <AlertTriangle className="mx-auto mb-2 h-5 w-5" />
                  No ticket found, or you don't have access to view it.
                </div>
              )}
              {lookupResult && (
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-bold text-primary">{lookupResult.ticket_number}</p>
                      <h3 className="mt-1 text-base font-extrabold">{lookupResult.subject}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Raised by {lookupResult.requester_name} on{" "}
                        {new Date(lookupResult.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityClass(lookupResult.priority)}`}>
                        {lookupResult.priority}
                      </span>
                      <Badge variant={statusVariant(lookupResult.status)}>{STATUS_LABEL[lookupResult.status]}</Badge>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">{lookupResult.description}</p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <Info label="Type" value={lookupResult.ticket_type === "incident" ? "Incident" : "Request"} />
                    <Info label="Assignee" value={lookupResult.assignee_name || "—"} />
                    <Info label="Group" value={lookupResult.assigned_group || "—"} />
                    <Info label="Last update" value={new Date(lookupResult.updated_at).toLocaleString()} />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setSelectedTicket(lookupResult);
                      loadComments(lookupResult.id);
                      setTab("list");
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" /> Open & comment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-muted/40 px-3 py-2">
    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);

const TicketDetail = ({
  ticket,
  comments,
  canManage,
  newComment,
  setNewComment,
  internalNote,
  setInternalNote,
  onAddComment,
  onUpdate,
}: {
  ticket: Ticket;
  comments: Comment[];
  canManage: boolean;
  newComment: string;
  setNewComment: (v: string) => void;
  internalNote: boolean;
  setInternalNote: (v: boolean) => void;
  onAddComment: (e: FormEvent) => void;
  onUpdate: (p: Partial<Ticket>) => void;
}) => {
  const [groupDraft, setGroupDraft] = useState(ticket.assigned_group ?? "");
  const [assigneeDraft, setAssigneeDraft] = useState(ticket.assignee_name ?? "");
  const [resolutionDraft, setResolutionDraft] = useState(ticket.resolution ?? "");

  useEffect(() => {
    setGroupDraft(ticket.assigned_group ?? "");
    setAssigneeDraft(ticket.assignee_name ?? "");
    setResolutionDraft(ticket.resolution ?? "");
  }, [ticket.id]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-bold text-primary">{ticket.ticket_number}</p>
            <CardTitle className="mt-1">{ticket.subject}</CardTitle>
            <CardDescription>
              {ticket.requester_name} · {new Date(ticket.created_at).toLocaleString()}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityClass(ticket.priority)}`}>
              {ticket.priority}
            </span>
            <Badge variant={statusVariant(ticket.status)}>{STATUS_LABEL[ticket.status]}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm text-foreground/90">{ticket.description}</p>

        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <Info label="Type" value={ticket.ticket_type === "incident" ? "Incident" : "Request"} />
          <Info label="Group" value={ticket.assigned_group || "—"} />
          <Info label="Assignee" value={ticket.assignee_name || "—"} />
          <Info label="Last update" value={new Date(ticket.updated_at).toLocaleString()} />
        </div>

        {canManage && (
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Admin controls</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={ticket.status} onValueChange={(v) => onUpdate({ status: v as TicketStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={ticket.priority} onValueChange={(v) => onUpdate({ priority: v as TicketPriority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["P1", "P2", "P3", "P4"] as const).map((p) => (
                      <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assigned group</Label>
                <div className="flex gap-2">
                  <Input value={groupDraft} onChange={(e) => setGroupDraft(e.target.value)} maxLength={80} />
                  <Button size="sm" variant="outline" onClick={() => onUpdate({ assigned_group: groupDraft || null })}>
                    Save
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Assignee</Label>
                <div className="flex gap-2">
                  <Input value={assigneeDraft} onChange={(e) => setAssigneeDraft(e.target.value)} maxLength={120} />
                  <Button size="sm" variant="outline" onClick={() => onUpdate({ assignee_name: assigneeDraft || null })}>
                    Save
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Resolution notes</Label>
                <div className="flex gap-2">
                  <Textarea
                    value={resolutionDraft}
                    onChange={(e) => setResolutionDraft(e.target.value)}
                    maxLength={2000}
                    rows={2}
                  />
                  <Button size="sm" variant="outline" onClick={() => onUpdate({ resolution: resolutionDraft || null })}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Comments · {comments.length}
          </p>
          <div className="mt-3 space-y-3">
            {comments.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                No comments yet.
              </p>
            )}
            {comments.map((c) => (
              <div
                key={c.id}
                className={`rounded-md border p-3 ${
                  c.is_internal ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">{c.author_name}</span>
                  <span>
                    {c.is_internal && <span className="mr-2 font-bold text-amber-600">Internal</span>}
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm">{c.body}</p>
              </div>
            ))}
          </div>

          <form onSubmit={onAddComment} className="mt-3 space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={4000}
              rows={3}
              placeholder="Add a reply…"
            />
            <div className="flex items-center justify-between">
              {canManage ? (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={internalNote}
                    onChange={(e) => setInternalNote(e.target.checked)}
                  />
                  Internal note (hidden from requester)
                </label>
              ) : (
                <span />
              )}
              <Button type="submit" size="sm" disabled={!newComment.trim()}>
                <MessageSquare className="mr-2 h-4 w-4" /> Post comment
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default Tickets;
