import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  GraduationCap, Plus, Youtube, Upload, Link2, PlayCircle, Trash2, FolderTree, ChevronRight,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
};

type Course = {
  id: string;
  company_id: string;
  category_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_path: string | null;
  video_kind: "youtube" | "link" | "upload";
  duration_minutes: number | null;
  created_by_name: string | null;
  created_at: string;
};

type Props = {
  companyId: string | null;
  meUserId: string | null;
  meName?: string | null;
  canManage: boolean;
};

const SUGGESTED_PARENTS = [
  "Onboarding & Orientation",
  "Technical Skills",
  "Soft Skills Training",
  "Product Training",
  "Financial Training",
  "Compliance Training",
  "Safety & Leadership",
  "Customer Service",
  "Sales",
  "Time Management",
  "Project Management",
  "Health & Wellness Training",
  "Conflict Resolution Training",
  "Team Building Training",
];

const SUGGESTED_CHILDREN: Record<string, string[]> = {
  "Soft Skills Training": ["English Communication", "French", "Business Writing", "Presentation Skills"],
};

const toEmbed = (url: string): string => {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    return url;
  } catch {
    return url;
  }
};

export default function TrainingPanel({ companyId, meUserId, meName, canManage }: Props) {
  const [cats, setCats] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [playing, setPlaying] = useState<Course | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  // Add category
  const [showCat, setShowCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [catParent, setCatParent] = useState<string>("none");

  // Add course
  const [showCourse, setShowCourse] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [courseKind, setCourseKind] = useState<"youtube" | "link" | "upload">("youtube");
  const [courseUrl, setCourseUrl] = useState("");
  const [courseFile, setCourseFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const [c, k] = await Promise.all([
      (supabase as any).from("training_categories").select("*").eq("company_id", companyId).order("name"),
      (supabase as any).from("training_courses").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    ]);
    if (!c.error) setCats(c.data as Category[]);
    if (!k.error) setCourses(k.data as Course[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [companyId]);

  const parents = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);
  const childrenOf = (id: string) => cats.filter((c) => c.parent_id === id);
  const coursesIn = (id: string) => courses.filter((c) => c.category_id === id);

  const handleAddCategory = async (preset?: { name: string; parent_id?: string | null }) => {
    if (!companyId) return;
    const name = (preset?.name ?? catName).trim();
    if (name.length < 2) { toast.error("Name too short"); return; }
    const parent_id = preset ? preset.parent_id ?? null : catParent === "none" ? null : catParent;
    const { error } = await (supabase as any).from("training_categories").insert({
      company_id: companyId, name, parent_id, created_by: meUserId,
    });
    if (error) { toast.error("Could not add", { description: error.message }); return; }
    toast.success("Category added");
    setCatName(""); setCatParent("none"); setShowCat(false);
    load();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its courses?")) return;
    const { error } = await (supabase as any).from("training_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    if (activeCat === id) setActiveCat(null);
    load();
  };

  const handleAddCourse = async () => {
    if (!companyId || !activeCat) return;
    if (courseTitle.trim().length < 2) { toast.error("Title required"); return; }
    setUploading(true);
    try {
      let video_url: string | null = null;
      let video_path: string | null = null;
      let kind = courseKind;
      if (courseKind === "upload") {
        if (!courseFile) { toast.error("Select a video file"); setUploading(false); return; }
        if (courseFile.size > 500 * 1024 * 1024) { toast.error("Max 500MB"); setUploading(false); return; }
        const safe = courseFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `${companyId}/${Date.now()}-${safe}`;
        const up = await supabase.storage.from("training-videos").upload(path, courseFile, { upsert: false });
        if (up.error) { toast.error("Upload failed", { description: up.error.message }); setUploading(false); return; }
        video_path = path;
      } else {
        if (!courseUrl.trim()) { toast.error("Video link required"); setUploading(false); return; }
        video_url = courseUrl.trim();
      }
      const { error } = await (supabase as any).from("training_courses").insert({
        company_id: companyId, category_id: activeCat, title: courseTitle.trim(),
        description: courseDesc.trim() || null, video_url, video_path, video_kind: kind,
        created_by: meUserId, created_by_name: meName ?? null,
      });
      if (error) throw error;
      toast.success("Training added");
      setCourseTitle(""); setCourseDesc(""); setCourseUrl(""); setCourseFile(null); setShowCourse(false);
      load();
    } catch (e: any) {
      toast.error("Could not add", { description: e?.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Delete this training?")) return;
    const course = courses.find((c) => c.id === id);
    if (course?.video_path) await supabase.storage.from("training-videos").remove([course.video_path]);
    const { error } = await (supabase as any).from("training_courses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const handlePlay = async (c: Course) => {
    setPlaying(c);
    if (c.video_kind === "upload" && c.video_path) {
      const { data } = await supabase.storage.from("training-videos").createSignedUrl(c.video_path, 3600);
      setPlayingUrl(data?.signedUrl ?? null);
    } else {
      setPlayingUrl(c.video_url ? toEmbed(c.video_url) : null);
    }
  };

  const missingParents = SUGGESTED_PARENTS.filter((n) => !parents.some((p) => p.name.toLowerCase() === n.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Learning</p>
            <h2 className="font-display text-xl font-extrabold">Training & Skills</h2>
          </div>
          {canManage && (
            <button
              onClick={() => setShowCat((s) => !s)}
              className="focus-premium flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Category
            </button>
          )}
        </div>
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          Browse company training. Admins and managers can add categories, YouTube links, or uploaded videos.
        </p>

        {canManage && showCat && (
          <div className="mt-4 space-y-3 rounded-2xl border border-border bg-surface-muted p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_200px_auto]">
              <input
                value={catName} onChange={(e) => setCatName(e.target.value)}
                placeholder="Category name (e.g. Cloud Security)"
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
              />
              <Select value={catParent} onValueChange={setCatParent}>
                <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Parent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Top-level</SelectItem>
                  {parents.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <button onClick={() => handleAddCategory()} className="rounded-xl bg-primary px-3 text-xs font-extrabold text-primary-foreground">Add</button>
            </div>
            {missingParents.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Quick add suggested</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {missingParents.map((n) => (
                    <button key={n} onClick={() => handleAddCategory({ name: n })}
                      className="rounded-full border border-border bg-background px-2 py-1 text-[11px] font-bold hover:bg-primary/5">
                      + {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Categories tree */}
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-primary" />
            <p className="text-xs font-extrabold uppercase tracking-wide">Categories</p>
          </div>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : parents.length === 0 ? (
            <p className="rounded-xl bg-surface-muted p-3 text-xs font-semibold text-muted-foreground">
              No categories yet. {canManage ? "Use Quick add above." : "Ask your admin to add one."}
            </p>
          ) : (
            <ul className="space-y-2">
              {parents.map((p) => {
                const kids = childrenOf(p.id);
                const presetKids = SUGGESTED_CHILDREN[p.name] ?? [];
                const missingKids = presetKids.filter((n) => !kids.some((k) => k.name.toLowerCase() === n.toLowerCase()));
                return (
                  <li key={p.id}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveCat(p.id)}
                        className={`flex-1 truncate rounded-xl px-3 py-2 text-left text-sm font-bold ${activeCat === p.id ? "bg-primary text-primary-foreground" : "bg-surface-muted hover:bg-muted"}`}
                      >
                        {p.name}
                        <span className="ml-1 text-[10px] font-bold opacity-70">({coursesIn(p.id).length})</span>
                      </button>
                      {canManage && (
                        <button onClick={() => handleDeleteCategory(p.id)} className="rounded p-1.5 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {(kids.length > 0 || (canManage && missingKids.length > 0)) && (
                      <ul className="ml-3 mt-1 space-y-1 border-l border-border pl-2">
                        {kids.map((k) => (
                          <li key={k.id} className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <button
                              onClick={() => setActiveCat(k.id)}
                              className={`flex-1 truncate rounded-lg px-2 py-1 text-left text-xs font-bold ${activeCat === k.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                            >
                              {k.name} <span className="ml-1 opacity-70">({coursesIn(k.id).length})</span>
                            </button>
                            {canManage && (
                              <button onClick={() => handleDeleteCategory(k.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </li>
                        ))}
                        {canManage && missingKids.map((n) => (
                          <li key={n}>
                            <button onClick={() => handleAddCategory({ name: n, parent_id: p.id })}
                              className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground hover:bg-primary/5">
                              + {n}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right pane: courses + add */}
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          {!activeCat ? (
            <p className="rounded-2xl bg-surface-muted p-6 text-center text-sm font-semibold text-muted-foreground">
              Pick a category on the left to see its trainings.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <p className="flex-1 font-display text-lg font-extrabold">
                  {cats.find((c) => c.id === activeCat)?.name}
                </p>
                {canManage && (
                  <button
                    onClick={() => setShowCourse((s) => !s)}
                    className="focus-premium flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
                  >
                    <Plus className="h-4 w-4" /> Training
                  </button>
                )}
              </div>

              {canManage && showCourse && (
                <div className="mb-4 space-y-3 rounded-2xl border border-border bg-surface-muted p-4">
                  <input
                    value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Training title"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  />
                  <textarea
                    value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)}
                    placeholder="Description (optional)"
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(["youtube", "link", "upload"] as const).map((k) => (
                      <button key={k} onClick={() => setCourseKind(k)}
                        className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold ${courseKind === k ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}>
                        {k === "youtube" ? <Youtube className="h-3.5 w-3.5" /> : k === "link" ? <Link2 className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                        {k === "youtube" ? "YouTube" : k === "link" ? "Web link" : "Upload"}
                      </button>
                    ))}
                  </div>
                  {courseKind === "upload" ? (
                    <input type="file" accept="video/*" onChange={(e) => setCourseFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-xs" />
                  ) : (
                    <input
                      value={courseUrl} onChange={(e) => setCourseUrl(e.target.value)}
                      placeholder={courseKind === "youtube" ? "https://youtube.com/watch?v=..." : "https://..."}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    />
                  )}
                  <button
                    onClick={handleAddCourse} disabled={uploading}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-60"
                  >
                    {uploading ? "Saving…" : "Add training"}
                  </button>
                </div>
              )}

              {coursesIn(activeCat).length === 0 ? (
                <p className="rounded-2xl bg-surface-muted p-4 text-sm font-semibold text-muted-foreground">
                  No trainings in this category yet.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {coursesIn(activeCat).map((c) => (
                    <li key={c.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-muted p-4">
                      <div className="flex items-start gap-2">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <PlayCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-sm font-extrabold">{c.title}</p>
                          {c.description && <p className="line-clamp-2 text-[11px] text-muted-foreground">{c.description}</p>}
                          <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">
                            {c.video_kind} · {c.created_by_name ?? "Admin"}
                          </p>
                        </div>
                        {canManage && (
                          <button onClick={() => handleDeleteCourse(c.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <button onClick={() => handlePlay(c)}
                        className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-extrabold text-primary hover:bg-primary/20">
                        Watch
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {/* Player modal */}
      {playing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { setPlaying(null); setPlayingUrl(null); }}>
          <div className="w-full max-w-3xl rounded-2xl bg-background p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <p className="flex-1 font-display text-base font-extrabold">{playing.title}</p>
              <button onClick={() => { setPlaying(null); setPlayingUrl(null); }} className="rounded-lg bg-muted px-3 py-1 text-xs font-bold">Close</button>
            </div>
            {playingUrl ? (
              playing.video_kind === "upload" ? (
                <video src={playingUrl} controls className="aspect-video w-full rounded-xl bg-black" />
              ) : playing.video_kind === "youtube" ? (
                <iframe src={playingUrl} title={playing.title} className="aspect-video w-full rounded-xl" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : (
                <a href={playingUrl} target="_blank" rel="noopener" className="block rounded-xl bg-primary px-4 py-3 text-center text-sm font-extrabold text-primary-foreground">Open link</a>
              )
            ) : (
              <p className="rounded-xl bg-muted p-4 text-sm">Loading…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
