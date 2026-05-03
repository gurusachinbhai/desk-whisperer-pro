import { useEffect, useMemo, useRef, useState, FormEvent } from "react";
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
  Paperclip,
  X,
  ImageIcon,
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
type TicketStatus = "new" | "open" | "in_progress" | "on_hold" | "resolved" | "closed" | "cancelled";

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
  hold_reason: string | null;
  opened_for: string | null;
  location: string | null;
  contact_type: string | null;
  category: string | null;
  subcategory: string | null;
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
  attachments: string[];
  created_at: string;
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  P1: "P1 — Critical",
  P2: "P2 — High",
  P3: "P3 — Medium",
  P4: "P4 — Low",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  new: "New",
  open: "Open",
  in_progress: "In Progress",
  on_hold: "On Hold",
  resolved: "Resolved",
  closed: "Closed",
  cancelled: "Cancelled",
};

const STATUS_ORDER: TicketStatus[] = [
  "new",
  "in_progress",
  "on_hold",
  "resolved",
  "closed",
  "cancelled",
];

const HOLD_REASONS = [
  "Awaiting Vendor",
  "Awaiting Change",
  "Awaiting Program",
  "Awaiting Caller",
] as const;

const CONTACT_TYPES = [
  "Self service",
  "Email",
  "Chat",
  "Virtual agent",
  "Walk up",
  "Web API",
  "Phone",
] as const;

const CATEGORIES = [
  "Inquiry/Help",
  "Software",
  "Hardware",
  "Network",
  "Database",
  "Facilities",
  "Procurement",
  "HR Facility",
  "Desk Booking",
  "Others",
] as const;

const SUBCATEGORIES = [
  "Performance",
  "Send/Receive",
  "Add-in Issues",
  "Update/Upgrade",
  "Crashing",
  "Error Message",
  "Configuration",
  "Reset/Restart",
  "No Issues Found",
  "Connectivity",
  "Access Related",
  "Capacity",
  "Other",
] as const;

const priorityClass = (p: TicketPriority) =>
  p === "P1"
    ? "bg-destructive text-destructive-foreground"
    : p === "P2"
    ? "bg-orange-500 text-white"
    : p === "P3"
    ? "bg-amber-500 text-white"
    : "bg-muted text-foreground";

const statusVariant = (s: TicketStatus): "default" | "secondary" | "outline" | "destructive" =>
  s === "resolved" || s === "closed"
    ? "secondary"
    : s === "cancelled"
    ? "destructive"
    : s === "new"
    ? "default"
    : "outline";

const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200),
  description: z.string().trim().min(10, "Please describe the issue (10+ chars)").max(4000),
  ticket_type: z.enum(["incident", "request"]),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  assigned_group: z.string().trim().max(80).optional(),
  assignee_name: z.string().trim().max(120).optional(),
  opened_for: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  contact_type: z.string().trim().max(40).optional(),
  category: z.string().trim().max(40).optional(),
  subcategory: z.string().trim().max(40).optional(),
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
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [uploadingComment, setUploadingComment] = useState(false);

  const [form, setForm] = useState({
    subject: "",
    description: "",
    ticket_type: "request" as TicketType,
    priority: "P3" as TicketPriority,
    assigned_group: "",
    assignee_name: "",
    opened_for: "",
    location: "",
    contact_type: "",
    category: "",
    subcategory: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [createFiles, setCreateFiles] = useState<File[]>([]);

  const [lookupNumber, setLookupNumber] = useState(searchParams.get("ticket") || "");
  const [lookupResult, setLookupResult] = useState<Ticket | null>(null);
  const [lookupChecked, setLookupChecked] = useState(false);

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

  const uploadFiles = async (files: File[], uid: string): Promise<string[]> => {
    if (files.length === 0) return [];
    const urls: string[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`Skipping ${file.name}: only images allowed`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Skipping ${file.name}: max 5MB`);
        continue;
      }
      const ext = file.name.split(".").pop() || "png";
      const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("ticket-attachments").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) {
        toast.error(`Upload failed: ${file.name}`, { description: upErr.message });
        continue;
      }
      const { data: pub } = supabase.storage.from("ticket-attachments").getPublicUrl(path);
      urls.push(pub.publicUrl);
    }
    return urls;
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
    const cid: string = companyId;
    const uid: string = userId;
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        company_id: cid,
        created_by: uid,
        requester_name: displayName || email,
        requester_email: email || null,
        subject: parsed.data.subject,
        description: parsed.data.description,
        ticket_type: parsed.data.ticket_type,
        priority: parsed.data.priority,
        assigned_group: parsed.data.assigned_group || null,
        assignee_name: parsed.data.assignee_name || null,
        opened_for: parsed.data.opened_for || null,
        location: parsed.data.location || null,
        contact_type: parsed.data.contact_type || null,
        category: parsed.data.category || null,
        subcategory: parsed.data.subcategory || null,
        ticket_number: "",
      })
      .select("*")
      .single();
    if (error) {
      setSubmitting(false);
      toast.error("Couldn't raise ticket", { description: error.message });
      return;
    }

    // Upload any attached images as the first activity-note comment
    if (createFiles.length > 0) {
      const urls = await uploadFiles(createFiles, uid);
      if (urls.length > 0) {
        await supabase.from("support_ticket_comments").insert({
          ticket_id: (data as Ticket).id,
          author_user_id: uid,
          author_name: displayName || email,
          body: "Attached images at submission",
          is_internal: false,
          attachments: urls,
        });
      }
    }

    setSubmitting(false);
    toast.success(`Ticket ${data.ticket_number} raised`);
    setForm({
      subject: "",
      description: "",
      ticket_type: "request",
      priority: "P3",
      assigned_group: "",
      assignee_name: "",
      opened_for: "",
      location: "",
      contact_type: "",
      category: "",
      subcategory: "",
    });
    setCreateFiles([]);
    await loadTickets();
    setTab("list");
    setSelectedTicket(data as Ticket);
    await loadComments((data as Ticket).id);
  };

  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !userId) return;
    if (!newComment.trim() && commentFiles.length === 0) return;
    setUploadingComment(true);
    const urls = await uploadFiles(commentFiles, userId);
    const { error } = await supabase.from("support_ticket_comments").insert({
      ticket_id: selectedTicket.id,
      author_user_id: userId,
      author_name: displayName || email,
      body: (newComment.trim() || "(image attached)").slice(0, 4000),
      is_internal: isAdmin || isSuperAdmin ? internalNote : false,
      attachments: urls,
    });
    setUploadingComment(false);
    if (error) {
      toast.error("Couldn't post comment", { description: error.message });
      return;
    }
    setNewComment("");
    setInternalNote(false);
    setCommentFiles([]);
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary sm:h-12 sm:w-12">
              <TicketIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Help & support</p>
              <h1 className="text-lg font-extrabold leading-tight sm:text-2xl">Ticketing tool</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3 text-xs font-bold sm:px-6 sm:text-sm">
          {[
            { id: "list", label: canManage ? "All tickets" : "My tickets" },
            { id: "new", label: "Raise a ticket" },
            { id: "lookup", label: "Track by number" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`min-h-[44px] whitespace-nowrap rounded-xl px-4 py-2 ${
                tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {tab === "list" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
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
                        {(t.category || t.location) && (
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {[t.category, t.location].filter(Boolean).join(" · ")}
                          </p>
                        )}
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
                  commentFiles={commentFiles}
                  setCommentFiles={setCommentFiles}
                  uploading={uploadingComment}
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
          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Raise a ticket</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                You'll get a unique ticket number you can use to track progress anytime.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Type">
                    <Select
                      value={form.ticket_type}
                      onValueChange={(v) => setForm((f) => ({ ...f, ticket_type: v as TicketType }))}
                    >
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="incident">Incident</SelectItem>
                        <SelectItem value="request">Request</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="SLA / Priority">
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm((f) => ({ ...f, priority: v as TicketPriority }))}
                    >
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["P1", "P2", "P3", "P4"] as const).map((p) => (
                          <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Opened for" hint="Person this ticket is for">
                    <Input
                      className="h-11 text-base"
                      value={form.opened_for}
                      onChange={(e) => setForm((f) => ({ ...f, opened_for: e.target.value }))}
                      maxLength={120}
                      placeholder="e.g. Jane Doe"
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      className="h-11 text-base"
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      maxLength={120}
                      placeholder="e.g. Mumbai HQ, Floor 3"
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Contact type">
                    <Select
                      value={form.contact_type}
                      onValueChange={(v) => setForm((f) => ({ ...f, contact_type: v }))}
                    >
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {CONTACT_TYPES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Category">
                    <Select
                      value={form.category}
                      onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                    >
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Subcategory">
                    <Select
                      value={form.subcategory}
                      onValueChange={(v) => setForm((f) => ({ ...f, subcategory: v }))}
                    >
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {SUBCATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Subject">
                  <Input
                    className="h-11 text-base"
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    maxLength={200}
                    placeholder="Short summary of the issue or request"
                    required
                  />
                </Field>

                <Field label="Details">
                  <Textarea
                    className="min-h-[140px] text-base"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    maxLength={4000}
                    rows={6}
                    placeholder="What happened? What did you expect? Steps to reproduce."
                    required
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Assigned group" hint="Optional">
                    <Input
                      className="h-11 text-base"
                      value={form.assigned_group}
                      onChange={(e) => setForm((f) => ({ ...f, assigned_group: e.target.value }))}
                      maxLength={80}
                      placeholder="e.g. IT Helpdesk, HR, Facilities"
                    />
                  </Field>
                  <Field label="Assignee" hint="Optional">
                    <Input
                      className="h-11 text-base"
                      value={form.assignee_name}
                      onChange={(e) => setForm((f) => ({ ...f, assignee_name: e.target.value }))}
                      maxLength={120}
                      placeholder="Person's name"
                    />
                  </Field>
                </div>

                <Field label="Attach images" hint="Optional · max 5MB each">
                  <FileChips files={createFiles} onChange={setCreateFiles} />
                </Field>

                <Button type="submit" disabled={submitting} className="h-12 w-full text-base">
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
              <CardTitle className="text-xl">Track a ticket</CardTitle>
              <CardDescription>Enter the ticket number you received (e.g. TKT-2026-000001).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runLookup();
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <Input
                  className="h-11 text-base"
                  value={lookupNumber}
                  onChange={(e) => setLookupNumber(e.target.value)}
                  placeholder="TKT-YYYY-000000"
                  maxLength={32}
                />
                <Button type="submit" className="h-11"><Search className="mr-2 h-4 w-4" /> Check</Button>
              </form>

              {lookupChecked && !lookupResult && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  <AlertTriangle className="mx-auto mb-2 h-5 w-5" />
                  No ticket found, or you don't have access to view it.
                </div>
              )}
              {lookupResult && (
                <div className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
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
                    <Info label="Category" value={lookupResult.category || "—"} />
                    <Info label="Subcategory" value={lookupResult.subcategory || "—"} />
                    <Info label="Location" value={lookupResult.location || "—"} />
                    <Info label="Assignee" value={lookupResult.assignee_name || "—"} />
                    <Info label="Group" value={lookupResult.assigned_group || "—"} />
                    {lookupResult.status === "on_hold" && (
                      <Info label="Hold reason" value={lookupResult.hold_reason || "—"} />
                    )}
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

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-sm font-semibold">
      {label}
      {hint && <span className="ml-1 text-xs font-normal text-muted-foreground">({hint})</span>}
    </Label>
    {children}
  </div>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-muted/40 px-3 py-2">
    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold break-words">{value}</p>
  </div>
);

const FileChips = ({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10"
          onClick={() => ref.current?.click()}
        >
          <Paperclip className="mr-2 h-4 w-4" /> Add image
        </Button>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            onChange([...files, ...list]);
            if (ref.current) ref.current.value = "";
          }}
        />
        {files.length === 0 && (
          <span className="text-xs text-muted-foreground">No images attached</span>
        )}
      </div>
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs"
            >
              <ImageIcon className="h-3 w-3" />
              <span className="max-w-[160px] truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const TicketDetail = ({
  ticket,
  comments,
  canManage,
  newComment,
  setNewComment,
  internalNote,
  setInternalNote,
  commentFiles,
  setCommentFiles,
  uploading,
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
  commentFiles: File[];
  setCommentFiles: (f: File[]) => void;
  uploading: boolean;
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

  const handleStatusChange = (s: TicketStatus) => {
    if (s === "on_hold") {
      const reason = window.prompt(
        "Hold reason (Awaiting Vendor / Awaiting Change / Awaiting Program / Awaiting Caller):",
        ticket.hold_reason ?? "Awaiting Vendor",
      );
      if (!reason) return;
      onUpdate({ status: s, hold_reason: reason });
    } else {
      onUpdate({ status: s, hold_reason: null });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-bold text-primary">{ticket.ticket_number}</p>
            <CardTitle className="mt-1 text-lg sm:text-xl">{ticket.subject}</CardTitle>
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

        <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Type" value={ticket.ticket_type === "incident" ? "Incident" : "Request"} />
          <Info label="Category" value={ticket.category || "—"} />
          <Info label="Subcategory" value={ticket.subcategory || "—"} />
          <Info label="Contact type" value={ticket.contact_type || "—"} />
          <Info label="Opened for" value={ticket.opened_for || "—"} />
          <Info label="Location" value={ticket.location || "—"} />
          <Info label="Group" value={ticket.assigned_group || "—"} />
          <Info label="Assignee" value={ticket.assignee_name || "—"} />
          <Info label="Last update" value={new Date(ticket.updated_at).toLocaleString()} />
          {ticket.status === "on_hold" && (
            <Info label="Hold reason" value={ticket.hold_reason || "—"} />
          )}
        </div>

        {canManage && (
          <div className="rounded-lg border border-border p-3 sm:p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Admin controls</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Status">
                <Select value={ticket.status} onValueChange={(v) => handleStatusChange(v as TicketStatus)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={ticket.priority} onValueChange={(v) => onUpdate({ priority: v as TicketPriority })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["P1", "P2", "P3", "P4"] as const).map((p) => (
                      <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {ticket.status === "on_hold" && (
                <Field label="Hold reason">
                  <Select
                    value={ticket.hold_reason ?? ""}
                    onValueChange={(v) => onUpdate({ hold_reason: v })}
                  >
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {HOLD_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field label="Assigned group">
                <div className="flex gap-2">
                  <Input className="h-11" value={groupDraft} onChange={(e) => setGroupDraft(e.target.value)} maxLength={80} />
                  <Button size="sm" variant="outline" className="h-11" onClick={() => onUpdate({ assigned_group: groupDraft || null })}>
                    Save
                  </Button>
                </div>
              </Field>
              <Field label="Assignee">
                <div className="flex gap-2">
                  <Input className="h-11" value={assigneeDraft} onChange={(e) => setAssigneeDraft(e.target.value)} maxLength={120} />
                  <Button size="sm" variant="outline" className="h-11" onClick={() => onUpdate({ assignee_name: assigneeDraft || null })}>
                    Save
                  </Button>
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Resolution notes">
                  <div className="flex gap-2">
                    <Textarea
                      value={resolutionDraft}
                      onChange={(e) => setResolutionDraft(e.target.value)}
                      maxLength={2000}
                      rows={2}
                    />
                    <Button size="sm" variant="outline" className="h-11" onClick={() => onUpdate({ resolution: resolutionDraft || null })}>
                      Save
                    </Button>
                  </div>
                </Field>
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Activity notes · {comments.length}
          </p>
          <div className="mt-3 space-y-3">
            {comments.length === 0 && (
              <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                No activity yet.
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
                {c.attachments && c.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.attachments.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-md border border-border"
                      >
                        <img
                          src={url}
                          alt="attachment"
                          className="h-24 w-24 object-cover sm:h-32 sm:w-32"
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={onAddComment} className="mt-3 space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={4000}
              rows={3}
              className="text-base"
              placeholder="Add a reply or activity note…"
            />
            <FileChips files={commentFiles} onChange={setCommentFiles} />
            <div className="flex flex-wrap items-center justify-between gap-2">
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
              <Button
                type="submit"
                size="sm"
                className="h-11"
                disabled={uploading || (!newComment.trim() && commentFiles.length === 0)}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="mr-2 h-4 w-4" />
                )}
                Post
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default Tickets;
