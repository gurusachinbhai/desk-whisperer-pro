import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, Plus, Trash2, Star, FilePen, CheckCircle2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Cycle = {
  id: string; company_id: string; name: string; cycle_type: string;
  period_start: string; period_end: string; status: string;
};
type Form = {
  id: string; company_id: string; name: string; description: string | null;
  sections: { id: string; title: string; questions: { id: string; label: string }[] }[];
  is_active: boolean;
};
type Review = {
  id: string; company_id: string; cycle_id: string; form_id: string | null;
  employee_id: string; employee_user_id: string | null; employee_name: string | null;
  manager_id: string | null; manager_user_id: string | null; manager_name: string | null;
  self_responses: Record<string, { rating?: number; comment?: string }>;
  manager_responses: Record<string, { rating?: number; comment?: string }>;
  self_overall_rating: number | null; manager_overall_rating: number | null; final_overall_rating: number | null;
  employee_comments: string | null; manager_comments: string | null; admin_comments: string | null;
  status: string;
  employee_submitted_at: string | null; manager_signed_at: string | null;
  admin_signed_at: string | null; admin_signed_by_name: string | null;
};
type Employee = { id: string; user_id: string | null; display_name: string; manager_id: string | null };

type Props = {
  companyId: string | null;
  meUserId: string | null;
  meEmployeeId: string | null;
  meName?: string | null;
  isAdmin: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", employee_submitted: "Self submitted",
  manager_signed: "Manager signed", admin_signed: "Admin signed", finalized: "Finalized",
};

const StarRating = ({ value, onChange, readOnly }: { value: number; onChange?: (n: number) => void; readOnly?: boolean }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" disabled={readOnly} onClick={() => onChange?.(n)}
        className={readOnly ? "cursor-default" : ""}>
        <Star className={`h-4 w-4 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
      </button>
    ))}
  </div>
);

export default function AppraisalPanel({ companyId, meUserId, meEmployeeId, meName, isAdmin }: Props) {
  const [tab, setTab] = useState<"mine" | "team" | "admin">("mine");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [openReview, setOpenReview] = useState<Review | null>(null);

  // Admin: cycle + form modals
  const [showCycle, setShowCycle] = useState(false);
  const [cycleName, setCycleName] = useState("");
  const [cycleType, setCycleType] = useState("annual");
  const [cycleStart, setCycleStart] = useState("");
  const [cycleEnd, setCycleEnd] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSections, setFormSections] = useState<Form["sections"]>([
    { id: crypto.randomUUID(), title: "Performance", questions: [{ id: crypto.randomUUID(), label: "Quality of work" }] },
  ]);

  const [bulkCycle, setBulkCycle] = useState<string>("");
  const [bulkForm, setBulkForm] = useState<string>("");

  const load = async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const [c, f, r, e] = await Promise.all([
      (supabase as any).from("appraisal_cycles").select("*").eq("company_id", companyId).order("period_start", { ascending: false }),
      (supabase as any).from("appraisal_forms").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      (supabase as any).from("appraisal_reviews").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("employee_profiles").select("id,user_id,display_name,manager_id").eq("company_id", companyId),
    ]);
    if (!c.error) setCycles(c.data as Cycle[]);
    if (!f.error) setForms(f.data as Form[]);
    if (!r.error) setReviews(r.data as Review[]);
    if (!e.error) setEmployees(e.data as Employee[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const myReviews = useMemo(() => reviews.filter((r) => r.employee_user_id === meUserId), [reviews, meUserId]);
  const teamReviews = useMemo(() => reviews.filter((r) => r.manager_user_id === meUserId), [reviews, meUserId]);

  const handleCreateCycle = async () => {
    if (!companyId) return;
    if (cycleName.trim().length < 2 || !cycleStart || !cycleEnd) { toast.error("Fill all fields"); return; }
    const { error } = await (supabase as any).from("appraisal_cycles").insert({
      company_id: companyId, name: cycleName.trim(), cycle_type: cycleType,
      period_start: cycleStart, period_end: cycleEnd, created_by: meUserId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Cycle created");
    setCycleName(""); setCycleStart(""); setCycleEnd(""); setShowCycle(false);
    load();
  };

  const handleCreateForm = async () => {
    if (!companyId) return;
    if (formName.trim().length < 2 || formSections.length === 0) { toast.error("Form needs a name and section"); return; }
    const { error } = await (supabase as any).from("appraisal_forms").insert({
      company_id: companyId, name: formName.trim(), sections: formSections, created_by: meUserId,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Form saved");
    setFormName(""); setShowForm(false);
    load();
  };

  const handleBulkAssign = async () => {
    if (!companyId || !bulkCycle || !bulkForm) { toast.error("Choose cycle and form"); return; }
    const existing = new Set(reviews.filter((r) => r.cycle_id === bulkCycle).map((r) => r.employee_id));
    const rows = employees
      .filter((e) => !existing.has(e.id) && e.user_id) // skip dupes & pending
      .map((e) => {
        const mgr = employees.find((m) => m.id === e.manager_id);
        return {
          company_id: companyId, cycle_id: bulkCycle, form_id: bulkForm,
          employee_id: e.id, employee_user_id: e.user_id, employee_name: e.display_name,
          manager_id: mgr?.id ?? null, manager_user_id: mgr?.user_id ?? null, manager_name: mgr?.display_name ?? null,
          status: "draft",
        };
      });
    if (rows.length === 0) { toast.info("All employees already have a review in this cycle"); return; }
    const { error } = await (supabase as any).from("appraisal_reviews").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`Created ${rows.length} reviews`);
    load();
  };

  const updateReview = async (id: string, patch: Partial<Review>) => {
    const { error } = await (supabase as any).from("appraisal_reviews").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const currentForm = openReview ? forms.find((f) => f.id === openReview.form_id) : null;
  const isEmployee = openReview && openReview.employee_user_id === meUserId;
  const isManager = openReview && openReview.manager_user_id === meUserId;
  const canEmployeeEdit = isEmployee && ["draft", "employee_submitted"].includes(openReview?.status ?? "");
  const canManagerEdit = isManager && !["admin_signed", "finalized"].includes(openReview?.status ?? "");

  const renderListCard = (r: Review) => (
    <li key={r.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-muted p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-extrabold">{r.employee_name ?? "Employee"}</p>
          <p className="text-[11px] text-muted-foreground">
            {cycles.find((c) => c.id === r.cycle_id)?.name ?? "Cycle"} · {STATUS_LABEL[r.status]}
          </p>
          {r.final_overall_rating != null && (
            <div className="mt-1 flex items-center gap-1 text-[11px]">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-bold">{r.final_overall_rating}</span>
            </div>
          )}
        </div>
      </div>
      <button onClick={() => setOpenReview(r)}
        className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-extrabold text-primary hover:bg-primary/20">
        Open review
      </button>
    </li>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Performance</p>
            <h2 className="font-display text-xl font-extrabold">Appraisals & Year-end</h2>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setTab("mine")} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${tab === "mine" ? "bg-primary text-primary-foreground" : "bg-surface-muted"}`}>My reviews</button>
          <button onClick={() => setTab("team")} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${tab === "team" ? "bg-primary text-primary-foreground" : "bg-surface-muted"}`}>My team</button>
          {isAdmin && (
            <button onClick={() => setTab("admin")} className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${tab === "admin" ? "bg-primary text-primary-foreground" : "bg-surface-muted"}`}>Admin</button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm">Loading…</p>
      ) : tab === "mine" ? (
        myReviews.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-6 text-center text-sm font-semibold text-muted-foreground">No reviews yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{myReviews.map(renderListCard)}</ul>
        )
      ) : tab === "team" ? (
        teamReviews.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-6 text-center text-sm font-semibold text-muted-foreground">No team reviews yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{teamReviews.map(renderListCard)}</ul>
        )
      ) : (
        <div className="space-y-4">
          {/* Cycles */}
          <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <p className="flex-1 font-display text-lg font-extrabold">Review cycles</p>
              <button onClick={() => setShowCycle((s) => !s)}
                className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground">
                <Plus className="h-4 w-4" /> Cycle
              </button>
            </div>
            {showCycle && (
              <div className="mb-3 grid gap-2 rounded-2xl border border-border bg-surface-muted p-4 sm:grid-cols-2">
                <input value={cycleName} onChange={(e) => setCycleName(e.target.value)} placeholder="Cycle name (e.g. H1 2026)"
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm" />
                <Select value={cycleType} onValueChange={setCycleType}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="half_yearly">Half-yearly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
                <input type="date" value={cycleStart} onChange={(e) => setCycleStart(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm" />
                <input type="date" value={cycleEnd} onChange={(e) => setCycleEnd(e.target.value)}
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm" />
                <button onClick={handleCreateCycle} className="sm:col-span-2 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground">Save cycle</button>
              </div>
            )}
            {cycles.length === 0 ? (
              <p className="text-xs text-muted-foreground">No cycles yet.</p>
            ) : (
              <ul className="space-y-1">
                {cycles.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-2 text-xs">
                    <span className="font-bold">{c.name}</span>
                    <span className="text-muted-foreground">{c.cycle_type} · {c.period_start} → {c.period_end}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Forms */}
          <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <p className="flex-1 font-display text-lg font-extrabold">Appraisal forms</p>
              <button onClick={() => setShowForm((s) => !s)}
                className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground">
                <Plus className="h-4 w-4" /> Form
              </button>
            </div>
            {showForm && (
              <div className="mb-3 space-y-3 rounded-2xl border border-border bg-surface-muted p-4">
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Form name"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" />
                {formSections.map((s, si) => (
                  <div key={s.id} className="space-y-2 rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <input value={s.title}
                        onChange={(e) => setFormSections((arr) => arr.map((x, i) => i === si ? { ...x, title: e.target.value } : x))}
                        placeholder="Section title"
                        className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-sm font-bold" />
                      <button onClick={() => setFormSections((arr) => arr.filter((_, i) => i !== si))}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    {s.questions.map((q, qi) => (
                      <div key={q.id} className="flex items-center gap-2">
                        <input value={q.label}
                          onChange={(e) => setFormSections((arr) => arr.map((x, i) => i === si ? { ...x, questions: x.questions.map((y, j) => j === qi ? { ...y, label: e.target.value } : y) } : x))}
                          placeholder="Question / criteria"
                          className="h-8 flex-1 rounded-lg border border-border bg-background px-2 text-xs" />
                        <button onClick={() => setFormSections((arr) => arr.map((x, i) => i === si ? { ...x, questions: x.questions.filter((_, j) => j !== qi) } : x))}
                          className="rounded p-1 text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                    <button onClick={() => setFormSections((arr) => arr.map((x, i) => i === si ? { ...x, questions: [...x.questions, { id: crypto.randomUUID(), label: "" }] } : x))}
                      className="text-[11px] font-bold text-primary">+ Add question</button>
                  </div>
                ))}
                <button onClick={() => setFormSections((arr) => [...arr, { id: crypto.randomUUID(), title: "", questions: [{ id: crypto.randomUUID(), label: "" }] }])}
                  className="rounded-xl border border-dashed border-border px-3 py-2 text-xs font-bold">+ Add section</button>
                <button onClick={handleCreateForm} className="block w-full rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground">Save form</button>
              </div>
            )}
            {forms.length === 0 ? (
              <p className="text-xs text-muted-foreground">No forms yet.</p>
            ) : (
              <ul className="space-y-1">
                {forms.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-2 text-xs">
                    <span className="font-bold">{f.name}</span>
                    <span className="text-muted-foreground">{f.sections?.length ?? 0} sections</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Bulk roll out */}
          <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
            <p className="mb-2 font-display text-lg font-extrabold">Roll out a cycle to all employees</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Select value={bulkCycle} onValueChange={setBulkCycle}>
                <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Cycle" /></SelectTrigger>
                <SelectContent>{cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={bulkForm} onValueChange={setBulkForm}>
                <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Form" /></SelectTrigger>
                <SelectContent>{forms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
              <button onClick={handleBulkAssign} className="rounded-xl bg-primary px-4 text-xs font-extrabold text-primary-foreground">Create reviews</button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Creates one review per active employee; managers and admins sign off in their tabs.</p>
          </div>

          {/* All reviews */}
          <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
            <p className="mb-3 font-display text-lg font-extrabold">All reviews</p>
            {reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground">None yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{reviews.map(renderListCard)}</ul>
            )}
          </div>
        </div>
      )}

      {/* Review modal */}
      {openReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpenReview(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex-1">
                <p className="font-display text-base font-extrabold">{openReview.employee_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {cycles.find((c) => c.id === openReview.cycle_id)?.name} · {STATUS_LABEL[openReview.status]}
                </p>
              </div>
              <button onClick={() => setOpenReview(null)} className="rounded-lg bg-muted px-3 py-1 text-xs font-bold">Close</button>
            </div>

            {!currentForm ? (
              <p className="rounded-xl bg-surface-muted p-3 text-sm">Form not found.</p>
            ) : (
              <div className="space-y-4">
                {currentForm.sections.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-border p-4">
                    <p className="mb-2 font-display text-sm font-extrabold">{s.title}</p>
                    {s.questions.map((q) => {
                      const selfR = openReview.self_responses?.[q.id] ?? {};
                      const mgrR = openReview.manager_responses?.[q.id] ?? {};
                      return (
                        <div key={q.id} className="mb-3 grid gap-2 border-t border-border pt-2 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-bold">{q.label}</p>
                            <p className="mt-1 text-[10px] uppercase text-muted-foreground">Self</p>
                            <StarRating value={selfR.rating ?? 0} readOnly={!canEmployeeEdit}
                              onChange={(n) => setOpenReview({
                                ...openReview,
                                self_responses: { ...openReview.self_responses, [q.id]: { ...selfR, rating: n } },
                              })} />
                            <textarea value={selfR.comment ?? ""} disabled={!canEmployeeEdit}
                              onChange={(e) => setOpenReview({
                                ...openReview,
                                self_responses: { ...openReview.self_responses, [q.id]: { ...selfR, comment: e.target.value } },
                              })}
                              placeholder="Self comments" rows={2}
                              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-xs" />
                          </div>
                          <div>
                            <p className="mt-4 text-[10px] uppercase text-muted-foreground sm:mt-[18px]">Manager</p>
                            <StarRating value={mgrR.rating ?? 0} readOnly={!canManagerEdit}
                              onChange={(n) => setOpenReview({
                                ...openReview,
                                manager_responses: { ...openReview.manager_responses, [q.id]: { ...mgrR, rating: n } },
                              })} />
                            <textarea value={mgrR.comment ?? ""} disabled={!canManagerEdit}
                              onChange={(e) => setOpenReview({
                                ...openReview,
                                manager_responses: { ...openReview.manager_responses, [q.id]: { ...mgrR, comment: e.target.value } },
                              })}
                              placeholder="Manager comments" rows={2}
                              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-xs" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Overall + actions */}
                <div className="grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Self overall</p>
                    <StarRating value={openReview.self_overall_rating ?? 0} readOnly={!canEmployeeEdit}
                      onChange={(n) => setOpenReview({ ...openReview, self_overall_rating: n })} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Manager overall</p>
                    <StarRating value={openReview.manager_overall_rating ?? 0} readOnly={!canManagerEdit}
                      onChange={(n) => setOpenReview({ ...openReview, manager_overall_rating: n })} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Final (admin)</p>
                    <StarRating value={openReview.final_overall_rating ?? 0} readOnly={!isAdmin}
                      onChange={(n) => setOpenReview({ ...openReview, final_overall_rating: n })} />
                  </div>
                </div>

                <textarea value={openReview.admin_comments ?? ""} disabled={!isAdmin}
                  onChange={(e) => setOpenReview({ ...openReview, admin_comments: e.target.value })}
                  placeholder="Admin comments" rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs" />

                <div className="flex flex-wrap gap-2">
                  {canEmployeeEdit && (
                    <>
                      <button onClick={async () => {
                        if (await updateReview(openReview.id, {
                          self_responses: openReview.self_responses, self_overall_rating: openReview.self_overall_rating,
                          employee_comments: openReview.employee_comments,
                        } as any)) { toast.success("Saved"); load(); }
                      }} className="rounded-xl bg-surface-muted px-3 py-2 text-xs font-extrabold">Save draft</button>
                      <button onClick={async () => {
                        if (await updateReview(openReview.id, {
                          self_responses: openReview.self_responses, self_overall_rating: openReview.self_overall_rating,
                          employee_comments: openReview.employee_comments, status: "employee_submitted",
                          employee_submitted_at: new Date().toISOString(),
                        } as any)) { toast.success("Submitted to manager"); setOpenReview(null); load(); }
                      }} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground">
                        <FilePen className="h-3.5 w-3.5" /> Submit self review
                      </button>
                    </>
                  )}
                  {canManagerEdit && (
                    <button onClick={async () => {
                      if (await updateReview(openReview.id, {
                        manager_responses: openReview.manager_responses, manager_overall_rating: openReview.manager_overall_rating,
                        manager_comments: openReview.manager_comments, status: "manager_signed",
                        manager_signed_at: new Date().toISOString(), manager_signed_by: meUserId,
                      } as any)) { toast.success("Manager sign-off saved"); setOpenReview(null); load(); }
                    }} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Manager sign-off
                    </button>
                  )}
                  {isAdmin && openReview.status === "manager_signed" && (
                    <button onClick={async () => {
                      if (await updateReview(openReview.id, {
                        final_overall_rating: openReview.final_overall_rating, admin_comments: openReview.admin_comments,
                        status: "finalized", admin_signed_at: new Date().toISOString(),
                        admin_signed_by: meUserId, admin_signed_by_name: meName ?? null,
                      } as any)) { toast.success("Finalized"); setOpenReview(null); load(); }
                    }} className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Admin sign-off & finalize
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
