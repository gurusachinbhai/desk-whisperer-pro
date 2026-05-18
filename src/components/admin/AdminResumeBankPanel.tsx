import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, FileText, Search, Download, Pencil, X, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type WorkExp = { company: string; designation: string; period: string; responsibilities: string };
type Edu = { degree: string; institution: string; year: string };
type Resume = {
  id: string;
  company_id: string;
  department_id: string | null;
  department_name: string | null;
  candidate_name: string;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
  location: string | null;
  professional_summary: string | null;
  work_experience: WorkExp[];
  education: Edu[];
  skills: string[];
  certifications: string[];
  file_path: string | null;
  file_name: string | null;
  notes: string | null;
  created_at: string;
};
type Dept = { id: string; name: string };

const emptyWork: WorkExp = { company: "", designation: "", period: "", responsibilities: "" };
const emptyEdu: Edu = { degree: "", institution: "", year: "" };

export default function AdminResumeBankPanel({ companyId, uploaderName }: { companyId: string; uploaderName: string }) {
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDept, setActiveDept] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Resume | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [d, r] = await Promise.all([
      supabase.from("departments").select("id,name").eq("company_id", companyId).order("name"),
      supabase.from("resumes").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    ]);
    setDepartments((d.data as Dept[]) ?? []);
    setResumes(((r.data as any[]) ?? []).map((row) => ({
      ...row,
      work_experience: Array.isArray(row.work_experience) ? row.work_experience : [],
      education: Array.isArray(row.education) ? row.education : [],
      skills: Array.isArray(row.skills) ? row.skills : [],
      certifications: Array.isArray(row.certifications) ? row.certifications : [],
    })));
    setLoading(false);
  };

  useEffect(() => {
    if (companyId) load();
  }, [companyId]);

  const filtered = useMemo(() => {
    return resumes.filter((r) => {
      if (activeDept !== "all" && r.department_id !== activeDept) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.candidate_name.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.skills ?? []).some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [resumes, activeDept, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Resume[]> = {};
    filtered.forEach((r) => {
      const k = r.department_name ?? "Unassigned";
      (groups[k] = groups[k] ?? []).push(r);
    });
    return groups;
  }, [filtered]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resume?")) return;
    const { error } = await supabase.from("resumes").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Resume deleted" });
    load();
  };

  const handleDownload = async (r: Resume) => {
    if (!r.file_path) return;
    const { data } = await supabase.storage.from("resume-bank").createSignedUrl(r.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Resume Bank</h2>
            <p className="text-xs text-muted-foreground">Organize candidate resumes by department in a structured spreadsheet format.</p>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add resume
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, skills…" className="pl-9" />
          </div>
          <select value={activeDept} onChange={(e) => setActiveDept(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">No resumes yet. Click "Add resume" to create your first entry.</div>
      ) : (
        Object.entries(grouped).map(([dept, items]) => (
          <div key={dept} className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border bg-muted/50 px-4 py-2 text-sm font-extrabold uppercase tracking-wider">
              {dept} <span className="text-muted-foreground">({items.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Candidate</th>
                    <th className="px-3 py-2 text-left">Contact</th>
                    <th className="px-3 py-2 text-left">Experience</th>
                    <th className="px-3 py-2 text-left">Skills</th>
                    <th className="px-3 py-2 text-left">Certifications</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="px-3 py-2 font-bold">
                        {r.candidate_name}
                        {r.professional_summary && <div className="mt-1 text-xs font-normal text-muted-foreground line-clamp-2">{r.professional_summary}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {r.phone && <div>{r.phone}</div>}
                        {r.email && <div className="text-muted-foreground">{r.email}</div>}
                        {r.linkedin && <div className="truncate max-w-[180px] text-primary">{r.linkedin}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {r.work_experience.slice(0, 2).map((w, i) => (
                          <div key={i}><span className="font-bold">{w.designation}</span> @ {w.company} <span className="text-muted-foreground">({w.period})</span></div>
                        ))}
                        {r.work_experience.length > 2 && <div className="text-muted-foreground">+{r.work_experience.length - 2} more</div>}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {r.skills.slice(0, 6).map((s, i) => (
                          <span key={i} className="mr-1 inline-block rounded bg-muted px-1.5 py-0.5">✓ {s}</span>
                        ))}
                      </td>
                      <td className="px-3 py-2 text-xs">{r.certifications.slice(0, 3).join(", ")}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          {r.file_path && (
                            <Button size="sm" variant="ghost" onClick={() => handleDownload(r)} title="Download file"><Download className="h-4 w-4" /></Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {showForm && (
        <ResumeForm
          companyId={companyId}
          uploaderName={uploaderName}
          departments={departments}
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ResumeForm({
  companyId, uploaderName, departments, initial, onClose, onSaved,
}: {
  companyId: string;
  uploaderName: string;
  departments: Dept[];
  initial: Resume | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.candidate_name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [linkedin, setLinkedin] = useState(initial?.linkedin ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [deptId, setDeptId] = useState(initial?.department_id ?? "");
  const [summary, setSummary] = useState(initial?.professional_summary ?? "");
  const [work, setWork] = useState<WorkExp[]>(initial?.work_experience.length ? initial.work_experience : [{ ...emptyWork }]);
  const [edu, setEdu] = useState<Edu[]>(initial?.education.length ? initial.education : [{ ...emptyEdu }]);
  const [skills, setSkills] = useState<string>(initial?.skills.join(", ") ?? "");
  const [certs, setCerts] = useState<string>(initial?.certifications.join(", ") ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const updateWork = (i: number, k: keyof WorkExp, v: string) => setWork((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const updateEdu = (i: number, k: keyof Edu, v: string) => setEdu((p) => p.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  const save = async () => {
    if (!name.trim()) return toast({ title: "Name required", variant: "destructive" });
    setSaving(true);
    try {
      let file_path = initial?.file_path ?? null;
      let file_name = initial?.file_name ?? null;
      if (file) {
        const path = `${companyId}/${crypto.randomUUID()}-${file.name}`;
        const up = await supabase.storage.from("resume-bank").upload(path, file, { upsert: false });
        if (up.error) throw up.error;
        file_path = path;
        file_name = file.name;
      }
      const dept = departments.find((d) => d.id === deptId);
      const payload = {
        company_id: companyId,
        department_id: deptId || null,
        department_name: dept?.name ?? null,
        candidate_name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        linkedin: linkedin.trim() || null,
        location: location.trim() || null,
        professional_summary: summary.trim() || null,
        work_experience: work.filter((w) => w.company || w.designation),
        education: edu.filter((e) => e.degree || e.institution),
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        certifications: certs.split(",").map((s) => s.trim()).filter(Boolean),
        notes: notes.trim() || null,
        file_path,
        file_name,
        created_by_name: uploaderName,
      };
      const { error } = initial
        ? await supabase.from("resumes").update(payload).eq("id", initial.id)
        : await supabase.from("resumes").insert(payload);
      if (error) throw error;
      toast({ title: initial ? "Resume updated" : "Resume added" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-background p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold">{initial ? "Edit Resume" : "Add Resume"}</h3>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-5">
          {/* Header rows */}
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Rows 1–3 · Personal & Contact</p>
            <div className="grid gap-2 md:grid-cols-2">
              <div><Label>Full name (bold)</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="font-bold text-base" /></div>
              <div><Label>Department</Label>
                <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">— Select —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div><Label>LinkedIn</Label><Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} /></div>
              <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
            </div>
          </section>

          {/* Summary */}
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Rows 4–8 · Professional Summary</p>
            <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="2–3 lines about the candidate" />
          </section>

          {/* Work Experience table */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rows 9–20 · Work Experience</p>
              <Button size="sm" variant="outline" onClick={() => setWork((p) => [...p, { ...emptyWork }])}><Plus className="h-3 w-3 mr-1" /> Row</Button>
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-1 text-left">A · Company</th>
                    <th className="px-2 py-1 text-left">B · Designation</th>
                    <th className="px-2 py-1 text-left">C · Period (From–To)</th>
                    <th className="px-2 py-1 text-left">D · Responsibilities & Achievements</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {work.map((w, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-1"><Input value={w.company} onChange={(e) => updateWork(i, "company", e.target.value)} className="h-8" /></td>
                      <td className="p-1"><Input value={w.designation} onChange={(e) => updateWork(i, "designation", e.target.value)} className="h-8" /></td>
                      <td className="p-1"><Input value={w.period} onChange={(e) => updateWork(i, "period", e.target.value)} placeholder="Jan 2022 – Present" className="h-8" /></td>
                      <td className="p-1"><Textarea value={w.responsibilities} onChange={(e) => updateWork(i, "responsibilities", e.target.value)} rows={2} className="min-h-[40px] text-xs" /></td>
                      <td className="p-1 text-center">
                        <button onClick={() => setWork((p) => p.filter((_, idx) => idx !== i))} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Education */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rows 21–25 · Education</p>
              <Button size="sm" variant="outline" onClick={() => setEdu((p) => [...p, { ...emptyEdu }])}><Plus className="h-3 w-3 mr-1" /> Row</Button>
            </div>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-1 text-left">A · Degree</th>
                    <th className="px-2 py-1 text-left">B · Institution</th>
                    <th className="px-2 py-1 text-left">C · Year</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {edu.map((e, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-1"><Input value={e.degree} onChange={(ev) => updateEdu(i, "degree", ev.target.value)} className="h-8" /></td>
                      <td className="p-1"><Input value={e.institution} onChange={(ev) => updateEdu(i, "institution", ev.target.value)} className="h-8" /></td>
                      <td className="p-1"><Input value={e.year} onChange={(ev) => updateEdu(i, "year", ev.target.value)} className="h-8" /></td>
                      <td className="p-1 text-center">
                        <button onClick={() => setEdu((p) => p.filter((_, idx) => idx !== i))} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Skills */}
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Rows 26–30 · Skills (comma separated, ✓)</p>
            <Textarea rows={2} value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript, Project Management, Communication" />
          </section>

          {/* Certifications */}
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Rows 31–35 · Certifications & Achievements</p>
            <Textarea rows={2} value={certs} onChange={(e) => setCerts(e.target.value)} placeholder="AWS Certified, PMP, Employee of the Year 2024" />
          </section>

          {/* File upload */}
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Attach resume file (optional)</p>
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
                <Upload className="h-4 w-4" />
                <span>{file ? file.name : initial?.file_name ?? "Choose PDF / DOCX"}</span>
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              {initial?.file_name && !file && <span className="text-xs text-muted-foreground">Current: {initial.file_name}</span>}
            </div>
          </section>

          <section>
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </section>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : initial ? "Update resume" : "Save resume"}</Button>
        </div>
      </div>
    </div>
  );
}
