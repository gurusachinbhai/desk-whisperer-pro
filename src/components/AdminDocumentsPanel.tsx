import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Folder, Trash2, Upload, Users, Wallet, Save, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeAnnualTax, formatINR, type SalaryProfile, type TaxRegime } from "@/lib/tax-calc";

type EmployeeLite = {
  id: string;
  user_id: string | null;
  display_name: string;
  email: string | null;
  manager_id: string | null;
  photo_url: string | null;
};

type DocRow = {
  id: string;
  employee_id: string;
  doc_type: "payslip" | "itr" | "tax_forecast" | "salary_breakdown" | "other";
  doc_year: number | null;
  doc_month: number | null;
  title: string;
  file_path: string;
  file_name: string;
  uploaded_by_name: string | null;
  created_at: string;
};

type SalaryRow = SalaryProfile & {
  id: string;
  employee_id: string;
  effective_from: string;
};

type Props = {
  companyId: string;
  uploaderName: string;
};

const DOC_TYPES = [
  { id: "payslip", label: "Payslip" },
  { id: "itr", label: "ITR form" },
  { id: "tax_forecast", label: "Tax forecast" },
  { id: "salary_breakdown", label: "Salary breakdown" },
  { id: "other", label: "Other" },
] as const;

const currentYear = new Date().getFullYear();
const yearChoices = Array.from({ length: 6 }, (_, i) => currentYear - i);
const monthChoices = [
  { v: 1, l: "January" }, { v: 2, l: "February" }, { v: 3, l: "March" }, { v: 4, l: "April" },
  { v: 5, l: "May" }, { v: 6, l: "June" }, { v: 7, l: "July" }, { v: 8, l: "August" },
  { v: 9, l: "September" }, { v: 10, l: "October" }, { v: 11, l: "November" }, { v: 12, l: "December" },
];

export default function AdminDocumentsPanel({ companyId, uploaderName }: Props) {
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [salaries, setSalaries] = useState<Record<string, SalaryRow>>({});
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // upload form
  const [uploadForm, setUploadForm] = useState({
    employeeId: "",
    docType: "payslip" as DocRow["doc_type"],
    year: String(currentYear),
    month: String(new Date().getMonth() + 1),
    title: "",
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);

  // salary editor
  const [salaryDraft, setSalaryDraft] = useState<SalaryProfile & { effective_from: string }>({
    annual_ctc: 0,
    basic: 0,
    hra: 0,
    special_allowance: 0,
    other_allowance: 0,
    pf_deduction: 0,
    professional_tax: 0,
    other_deduction: 0,
    tax_regime: "new",
    effective_from: new Date().toISOString().slice(0, 10),
  });
  const [savingSalary, setSavingSalary] = useState(false);

  // manager mapping draft
  const [managerDraft, setManagerDraft] = useState<Record<string, string>>({});

  const loadAll = async () => {
    setLoading(true);
    const [empRes, docRes, salRes] = await Promise.all([
      supabase
        .from("employee_profiles")
        .select("id, user_id, display_name, email, manager_id, photo_url")
        .eq("company_id", companyId)
        .order("display_name"),
      supabase
        .from("employee_documents" as never)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("salary_profiles" as never)
        .select("*")
        .eq("company_id", companyId),
    ]);
    if (empRes.error) toast.error("Load employees failed", { description: empRes.error.message });
    if (docRes.error) toast.error("Load documents failed", { description: docRes.error.message });
    if (salRes.error) toast.error("Load salaries failed", { description: salRes.error.message });
    const emps = (empRes.data ?? []) as EmployeeLite[];
    setEmployees(emps);
    setDocs((docRes.data ?? []) as DocRow[]);
    const salMap: Record<string, SalaryRow> = {};
    ((salRes.data ?? []) as SalaryRow[]).forEach((s) => {
      salMap[s.employee_id] = s;
    });
    setSalaries(salMap);
    const md: Record<string, string> = {};
    emps.forEach((e) => {
      md[e.id] = e.manager_id ?? "";
    });
    setManagerDraft(md);
    setLoading(false);
  };

  useEffect(() => {
    if (companyId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // Sync salary editor when employee selection changes
  useEffect(() => {
    if (!selectedEmpId) return;
    const existing = salaries[selectedEmpId];
    if (existing) {
      setSalaryDraft({
        annual_ctc: Number(existing.annual_ctc) || 0,
        basic: Number(existing.basic) || 0,
        hra: Number(existing.hra) || 0,
        special_allowance: Number(existing.special_allowance) || 0,
        other_allowance: Number(existing.other_allowance) || 0,
        pf_deduction: Number(existing.pf_deduction) || 0,
        professional_tax: Number(existing.professional_tax) || 0,
        other_deduction: Number(existing.other_deduction) || 0,
        tax_regime: (existing.tax_regime as TaxRegime) || "new",
        effective_from: existing.effective_from?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      });
    } else {
      setSalaryDraft((prev) => ({ ...prev, annual_ctc: 0, basic: 0, hra: 0, special_allowance: 0, other_allowance: 0 }));
    }
  }, [selectedEmpId, salaries]);

  const selectedEmp = employees.find((e) => e.id === selectedEmpId) ?? null;

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadForm.employeeId || !uploadForm.file) {
      toast.error("Select an employee and a file");
      return;
    }
    const emp = employees.find((x) => x.id === uploadForm.employeeId);
    if (!emp || !emp.user_id) {
      toast.error("Employee must have a linked login before documents can be issued.");
      return;
    }
    setUploading(true);
    try {
      const safeName = uploadForm.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${companyId}/${emp.user_id}/${uploadForm.docType}/${Date.now()}-${safeName}`;
      const up = await supabase.storage
        .from("employee-documents")
        .upload(path, uploadForm.file, { contentType: uploadForm.file.type, upsert: false });
      if (up.error) throw up.error;

      const ins = await (supabase as any).from("employee_documents").insert({
        company_id: companyId,
        employee_id: emp.id,
        user_id: emp.user_id,
        doc_type: uploadForm.docType,
        doc_year: Number(uploadForm.year) || null,
        doc_month: ["payslip", "salary_breakdown"].includes(uploadForm.docType) ? Number(uploadForm.month) : null,
        title: uploadForm.title.trim() || `${uploadForm.docType} ${uploadForm.year}${["payslip","salary_breakdown"].includes(uploadForm.docType) ? "-" + uploadForm.month : ""}`,
        file_path: path,
        file_name: uploadForm.file.name,
        file_size: uploadForm.file.size,
        mime_type: uploadForm.file.type,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        uploaded_by_name: uploaderName,
      });
      if (ins.error) {
        await supabase.storage.from("employee-documents").remove([path]);
        throw ins.error;
      }
      toast.success("Document uploaded");
      setUploadForm({
        employeeId: uploadForm.employeeId,
        docType: uploadForm.docType,
        year: uploadForm.year,
        month: uploadForm.month,
        title: "",
        file: null,
      });
      await loadAll();
    } catch (err: unknown) {
      toast.error("Upload failed", { description: err instanceof Error ? err.message : "Try again" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: DocRow) => {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    const { error: dErr } = await (supabase as any).from("employee_documents").delete().eq("id", doc.id);
    if (dErr) {
      toast.error("Delete failed", { description: dErr.message });
      return;
    }
    await supabase.storage.from("employee-documents").remove([doc.file_path]);
    toast.success("Deleted");
    await loadAll();
  };

  const handleDownload = async (doc: DocRow) => {
    const { data, error } = await supabase.storage.from("employee-documents").createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Download failed", { description: error?.message ?? "Try again" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const handleSaveSalary = async () => {
    if (!selectedEmp) return;
    setSavingSalary(true);
    const payload = {
      company_id: companyId,
      employee_id: selectedEmp.id,
      user_id: selectedEmp.user_id,
      annual_ctc: salaryDraft.annual_ctc,
      basic: salaryDraft.basic,
      hra: salaryDraft.hra,
      special_allowance: salaryDraft.special_allowance,
      other_allowance: salaryDraft.other_allowance,
      pf_deduction: salaryDraft.pf_deduction,
      professional_tax: salaryDraft.professional_tax,
      other_deduction: salaryDraft.other_deduction,
      tax_regime: salaryDraft.tax_regime,
      effective_from: salaryDraft.effective_from,
    };
    const { error } = await supabase
      .from("salary_profiles" as never)
      .upsert(payload, { onConflict: "employee_id" });
    setSavingSalary(false);
    if (error) {
      toast.error("Save failed", { description: error.message });
      return;
    }
    toast.success("Salary structure saved");
    await loadAll();
  };

  const handleSaveManager = async (employeeId: string) => {
    const newManager = managerDraft[employeeId] || null;
    const { error } = await supabase
      .from("employee_profiles")
      .update({ manager_id: newManager })
      .eq("id", employeeId);
    if (error) {
      toast.error("Mapping failed", { description: error.message });
      return;
    }
    toast.success("Manager updated");
    await loadAll();
  };

  const grossAnnualPreview = salaryDraft.basic + salaryDraft.hra + salaryDraft.special_allowance + salaryDraft.other_allowance;
  const taxPreview = grossAnnualPreview > 0 ? computeAnnualTax(grossAnnualPreview, salaryDraft.tax_regime as TaxRegime) : null;

  const docsForSelected = useMemo(
    () => docs.filter((d) => d.employee_id === selectedEmpId),
    [docs, selectedEmpId],
  );

  return (
    <div className="space-y-5">
      {/* Upload card */}
      <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Documents · Admin upload</p>
            <h2 className="font-display text-xl font-extrabold">Issue payslip, ITR, tax forecast or salary breakdown</h2>
          </div>
        </div>
        <form onSubmit={handleUpload} className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Employee</label>
            <Select value={uploadForm.employeeId} onValueChange={(v) => setUploadForm((p) => ({ ...p, employeeId: v }))}>
              <SelectTrigger className="mt-1 rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id} disabled={!e.user_id}>
                    {e.display_name}{e.email ? ` · ${e.email}` : ""}{!e.user_id ? " (not yet logged in)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Document type</label>
            <Select value={uploadForm.docType} onValueChange={(v) => setUploadForm((p) => ({ ...p, docType: v as DocRow["doc_type"] }))}>
              <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Year</label>
            <Select value={uploadForm.year} onValueChange={(v) => setUploadForm((p) => ({ ...p, year: v }))}>
              <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {yearChoices.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(uploadForm.docType === "payslip" || uploadForm.docType === "salary_breakdown") && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Month</label>
              <Select value={uploadForm.month} onValueChange={(v) => setUploadForm((p) => ({ ...p, month: v }))}>
                <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {monthChoices.map((m) => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Title (optional)</label>
            <Input
              className="mt-1 rounded-2xl"
              placeholder="e.g. Payslip — January 2026"
              value={uploadForm.title}
              onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
              maxLength={120}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">File (PDF, image, ≤ 10 MB)</label>
            <Input
              type="file"
              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
              className="mt-1 rounded-2xl"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > 10 * 1024 * 1024) {
                  toast.error("File too large (max 10 MB)");
                  return;
                }
                setUploadForm((p) => ({ ...p, file: f }));
              }}
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="focus-premium md:col-span-2 flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            <Upload className="h-5 w-5" /> {uploading ? "Uploading…" : "Upload document"}
          </button>
        </form>
      </div>

      {/* Salary structure editor */}
      <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Salary structure</p>
            <h2 className="font-display text-xl font-extrabold">Set CTC & components</h2>
          </div>
        </div>
        <div className="mt-3">
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Employee</label>
          <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
            <SelectTrigger className="mt-1 rounded-2xl"><SelectValue placeholder="Select an employee to manage" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.display_name}{e.email ? ` · ${e.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEmp && (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["annual_ctc", "Annual CTC"],
                ["basic", "Basic (annual)"],
                ["hra", "HRA (annual)"],
                ["special_allowance", "Special allowance"],
                ["other_allowance", "Other allowance"],
                ["pf_deduction", "PF (annual)"],
                ["professional_tax", "Professional tax"],
                ["other_deduction", "Other deductions"],
              ].map(([k, label]) => (
                <div key={k}>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    className="mt-1 rounded-2xl"
                    value={(salaryDraft as Record<string, number | string>)[k] as number}
                    onChange={(e) => setSalaryDraft((p) => ({ ...p, [k]: Number(e.target.value) || 0 }))}
                  />
                </div>
              ))}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Tax regime</label>
                <Select value={salaryDraft.tax_regime} onValueChange={(v) => setSalaryDraft((p) => ({ ...p, tax_regime: v as TaxRegime }))}>
                  <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New regime</SelectItem>
                    <SelectItem value="old">Old regime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Effective from</label>
                <Input
                  type="date"
                  className="mt-1 rounded-2xl"
                  value={salaryDraft.effective_from}
                  onChange={(e) => setSalaryDraft((p) => ({ ...p, effective_from: e.target.value }))}
                />
              </div>
            </div>

            {taxPreview && (
              <div className="mt-3 rounded-2xl bg-surface-muted p-3 text-xs font-semibold">
                Forecast — Gross {formatINR(grossAnnualPreview)} · Annual tax {formatINR(taxPreview.totalTax)} · Monthly TDS {formatINR(taxPreview.monthlyTax)} · Effective {taxPreview.effectiveRate}%
              </div>
            )}

            <button
              onClick={handleSaveSalary}
              disabled={savingSalary}
              className="focus-premium mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {savingSalary ? "Saving…" : "Save salary structure"}
            </button>

            {/* Documents for this employee */}
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Documents on file for {selectedEmp.display_name}
              </p>
              {docsForSelected.length === 0 ? (
                <p className="mt-2 rounded-2xl bg-surface-muted p-3 text-xs font-semibold text-muted-foreground">
                  No documents yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {docsForSelected.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface-muted p-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-extrabold">{d.title}</p>
                        <p className="truncate text-[11px] font-semibold text-muted-foreground">
                          {d.doc_type} · {d.doc_year ?? "—"}{d.doc_month ? `/${d.doc_month}` : ""} · {d.file_name}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => handleDownload(d)}
                          className="focus-premium grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(d)}
                          className="focus-premium grid h-9 w-9 place-items-center rounded-xl bg-destructive/10 text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* Manager mapping */}
      <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reporting structure</p>
            <h2 className="font-display text-xl font-extrabold">Map manager for each employee</h2>
          </div>
        </div>
        {loading ? (
          <p className="mt-3 text-xs font-semibold text-muted-foreground">Loading…</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {employees.map((e) => {
              const candidates = employees.filter((c) => c.id !== e.id);
              const dirty = (managerDraft[e.id] ?? "") !== (e.manager_id ?? "");
              return (
                <li key={e.id} className="grid items-center gap-2 rounded-2xl border border-border bg-surface-muted p-3 md:grid-cols-[1fr_minmax(220px,1fr)_auto]">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-extrabold">{e.display_name}</p>
                    <p className="truncate text-[11px] font-semibold text-muted-foreground">{e.email ?? "—"}</p>
                  </div>
                  <Select
                    value={managerDraft[e.id] || "__none__"}
                    onValueChange={(v) => setManagerDraft((p) => ({ ...p, [e.id]: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— No manager —</SelectItem>
                      {candidates.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => handleSaveManager(e.id)}
                    disabled={!dirty}
                    className="focus-premium flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" /> Save
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* All recent documents */}
      <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Folder className="h-5 w-5" />
          </div>
          <h3 className="font-display text-lg font-extrabold">All company documents ({docs.length})</h3>
        </div>
        {docs.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface-muted p-3 text-xs font-semibold text-muted-foreground">No documents uploaded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {docs.slice(0, 20).map((d) => {
              const emp = employees.find((e) => e.id === d.employee_id);
              return (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface-muted p-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-extrabold">{d.title}</p>
                    <p className="truncate text-[11px] font-semibold text-muted-foreground">
                      {emp?.display_name ?? "Unknown"} · {d.doc_type} · {d.doc_year ?? ""}{d.doc_month ? `/${d.doc_month}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => handleDownload(d)} className="focus-premium grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary" title="Download">
                      <Download className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(d)} className="focus-premium grid h-9 w-9 place-items-center rounded-xl bg-destructive/10 text-destructive" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
