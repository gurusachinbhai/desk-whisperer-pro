import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search, Upload, Sparkles, Loader2, Download, FileText, X, Plus, BadgeCheck,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Dept = { id: string; name: string };
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
  work_experience: any[];
  education: any[];
  skills: string[];
  certifications: string[];
  file_path: string | null;
  file_name: string | null;
  created_at: string;
};
type Match = {
  id: string;
  score: number;
  matched_skills?: string[];
  missing_skills?: string[];
  reason?: string;
};

export default function AdminResumeSearchPanel({
  companyId,
  uploaderName,
}: {
  companyId: string;
  uploaderName: string;
}) {
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [techSkills, setTechSkills] = useState("");
  const [funcSkills, setFuncSkills] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [minExp, setMinExp] = useState<string>("");

  // AI
  const [jd, setJd] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);

  // Upload
  const [showUpload, setShowUpload] = useState(false);

  const load = async () => {
    setLoading(true);
    const [d, r] = await Promise.all([
      supabase.from("departments").select("id,name").eq("company_id", companyId).order("name"),
      supabase.from("resumes").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    ]);
    setDepartments((d.data as Dept[]) ?? []);
    setResumes(
      ((r.data as any[]) ?? []).map((row) => ({
        ...row,
        work_experience: Array.isArray(row.work_experience) ? row.work_experience : [],
        education: Array.isArray(row.education) ? row.education : [],
        skills: Array.isArray(row.skills) ? row.skills : [],
        certifications: Array.isArray(row.certifications) ? row.certifications : [],
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (companyId) load();
  }, [companyId]);

  const tokens = (s: string) =>
    s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);

  const filtered = useMemo(() => {
    const tech = tokens(techSkills);
    const func = tokens(funcSkills);
    const kw = keyword.trim().toLowerCase();
    const minE = parseInt(minExp, 10);
    return resumes.filter((r) => {
      if (deptFilter !== "all" && r.department_id !== deptFilter) return false;
      const haystack = [
        r.candidate_name,
        r.email ?? "",
        r.location ?? "",
        r.professional_summary ?? "",
        ...(r.skills ?? []),
        ...(r.certifications ?? []),
        ...(r.work_experience ?? []).flatMap((w: any) => [w.company, w.designation, w.responsibilities]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (kw && !haystack.includes(kw)) return false;
      if (tech.length && !tech.every((t) => haystack.includes(t))) return false;
      if (func.length && !func.some((t) => haystack.includes(t))) return false;
      if (!Number.isNaN(minE) && minE > 0) {
        if ((r.work_experience?.length ?? 0) < Math.ceil(minE / 2)) {
          // heuristic only — real years not stored
        }
      }
      return true;
    });
  }, [resumes, keyword, techSkills, funcSkills, deptFilter, minExp]);

  const displayed = useMemo(() => {
    if (!matches) return filtered.map((r) => ({ r, m: null as Match | null }));
    const byId = new Map(matches.map((m) => [m.id, m]));
    return filtered
      .map((r) => ({ r, m: byId.get(r.id) ?? null }))
      .sort((a, b) => (b.m?.score ?? -1) - (a.m?.score ?? -1));
  }, [filtered, matches]);

  const runAi = async () => {
    if (!jd.trim()) {
      toast({ title: "Add a job description", description: "Paste the JD or role brief first.", variant: "destructive" });
      return;
    }
    if (filtered.length === 0) {
      toast({ title: "No candidates", description: "Loosen filters first.", variant: "destructive" });
      return;
    }
    setAiBusy(true);
    setMatches(null);
    try {
      const required = [...tokens(techSkills), ...tokens(funcSkills)];
      const { data, error } = await supabase.functions.invoke("resume-search-ai", {
        body: {
          jobDescription: jd,
          requiredSkills: required,
          candidates: filtered.map((r) => ({
            id: r.id,
            candidate_name: r.candidate_name,
            department_name: r.department_name,
            professional_summary: r.professional_summary,
            skills: r.skills,
            certifications: r.certifications,
            work_experience: r.work_experience,
            education: r.education,
            location: r.location,
          })),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMatches(((data as any)?.matches as Match[]) ?? []);
      toast({ title: "AI shortlist ready", description: `Ranked ${((data as any)?.matches ?? []).length} candidates.` });
    } catch (e: any) {
      toast({ title: "AI search failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const handleDownload = async (r: Resume) => {
    if (!r.file_path) return;
    const { data } = await supabase.storage.from("resume-bank").createSignedUrl(r.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> Resume Search
            </h2>
            <p className="text-xs text-muted-foreground">
              Search the Resume Bank by technical or functional skills. Uploads here are also saved to the Resume Bank.
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Upload resume
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Keyword (name, summary, company…)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. fintech, payments" className="pl-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Department</Label>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Technical skills (comma-separated, ALL required)</Label>
            <Input value={techSkills} onChange={(e) => setTechSkills(e.target.value)} placeholder="react, typescript, postgres" />
          </div>
          <div>
            <Label className="text-xs">Functional skills (ANY of these)</Label>
            <Input value={funcSkills} onChange={(e) => setFuncSkills(e.target.value)} placeholder="stakeholder management, agile, leadership" />
          </div>
        </div>
      </div>

      {/* AI assistant */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold">AI candidate matcher</h3>
            <p className="text-xs text-muted-foreground">Paste a job description; AI will rank the filtered candidates with match scores.</p>
          </div>
        </div>
        <Textarea
          rows={4}
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the job description, role brief, or required experience…"
          className="mt-3"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={runAi} disabled={aiBusy} className="gap-2">
            {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {aiBusy ? "Ranking candidates…" : "Find best candidates"}
          </Button>
          {matches && (
            <Button variant="outline" onClick={() => setMatches(null)}>Clear AI ranking</Button>
          )}
          <span className="text-xs text-muted-foreground">{filtered.length} candidate{filtered.length === 1 ? "" : "s"} in scope</span>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading resumes…</div>
      ) : displayed.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">No matching resumes. Try loosening the filters or upload a new resume.</div>
      ) : (
        <div className="space-y-2">
          {displayed.map(({ r, m }) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold">{r.candidate_name}</h4>
                    {r.department_name && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.department_name}</span>
                    )}
                    {m && (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                        m.score >= 75 ? "bg-success/15 text-success"
                        : m.score >= 50 ? "bg-warning/20 text-warning"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        <BadgeCheck className="h-3 w-3" /> {m.score}% match
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {[r.email, r.phone, r.location].filter(Boolean).join(" · ")}
                  </div>
                  {r.professional_summary && (
                    <p className="mt-2 text-sm text-foreground/90 line-clamp-2">{r.professional_summary}</p>
                  )}
                  {r.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.skills.slice(0, 12).map((s, i) => {
                        const matched = m?.matched_skills?.some((x) => x.toLowerCase() === s.toLowerCase());
                        return (
                          <span key={i} className={`rounded px-1.5 py-0.5 text-xs ${matched ? "bg-success/15 text-success font-bold" : "bg-muted"}`}>
                            {s}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {m?.reason && (
                    <p className="mt-2 text-xs italic text-muted-foreground">{m.reason}</p>
                  )}
                  {m?.missing_skills && m.missing_skills.length > 0 && (
                    <p className="mt-1 text-xs text-destructive">Missing: {m.missing_skills.join(", ")}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.file_path && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDownload(r)}>
                      <Download className="h-3.5 w-3.5" /> CV
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <QuickUpload
          companyId={companyId}
          uploaderName={uploaderName}
          departments={departments}
          onClose={() => setShowUpload(false)}
          onSaved={() => { setShowUpload(false); load(); }}
        />
      )}
    </div>
  );
}

function QuickUpload({
  companyId, uploaderName, departments, onClose, onSaved,
}: {
  companyId: string;
  uploaderName: string;
  departments: Dept[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [deptId, setDeptId] = useState("");
  const [skills, setSkills] = useState("");
  const [certs, setCerts] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast({ title: "Candidate name required", variant: "destructive" });
    setSaving(true);
    try {
      let file_path: string | null = null;
      let file_name: string | null = null;
      if (file) {
        const path = `${companyId}/${crypto.randomUUID()}-${file.name}`;
        const up = await supabase.storage.from("resume-bank").upload(path, file, { upsert: false });
        if (up.error) throw up.error;
        file_path = path;
        file_name = file.name;
      }
      const dept = departments.find((d) => d.id === deptId);
      const { error } = await supabase.from("resumes").insert({
        company_id: companyId,
        department_id: deptId || null,
        department_name: dept?.name ?? null,
        candidate_name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        linkedin: null,
        location: location.trim() || null,
        professional_summary: summary.trim() || null,
        work_experience: [],
        education: [],
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        certifications: certs.split(",").map((s) => s.trim()).filter(Boolean),
        notes: null,
        file_path,
        file_name,
        created_by_name: uploaderName,
      } as any);
      if (error) throw error;
      toast({ title: "Resume uploaded", description: "Also visible in Resume Bank." });
      onSaved();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-background p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold flex items-center gap-2"><FileText className="h-5 w-5" /> Upload resume</h3>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Saved to the shared Resume Bank — instantly searchable here and in the Resume Bank tool.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Candidate name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Department</Label>
            <select value={deptId} onChange={(e) => setDeptId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— Select —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div><Label>Resume file (PDF/DOCX)</Label>
            <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="md:col-span-2"><Label>Technical & functional skills (comma-separated)</Label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="react, typescript, stakeholder management" />
          </div>
          <div className="md:col-span-2"><Label>Certifications (comma-separated)</Label>
            <Input value={certs} onChange={(e) => setCerts(e.target.value)} placeholder="AWS SAA, PMP" />
          </div>
          <div className="md:col-span-2"><Label>Professional summary</Label>
            <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Saving…" : "Save to Resume Bank"}
          </Button>
        </div>
      </div>
    </div>
  );
}
