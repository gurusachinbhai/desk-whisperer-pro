import { useState, useEffect, FormEvent, ChangeEvent, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, IdCard, Upload, Banknote, Search, Save, Trash2, Download, FileText, Mail } from "lucide-react";

type Props = { companyId: string; uploaderName: string };

type EmployeeRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  employee_code: string | null;
  uan_number: string | null;
  status: string | null;
};

type KycRow = {
  id: string;
  employee_id: string;
  pan_number: string | null;
  aadhar_number: string | null;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
};

type DocRow = {
  id: string;
  employee_id: string;
  doc_type: string;
  title: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
};

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_RE = /^[0-9]{12}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UAN_RE = /^[0-9]{12}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function slugifyName(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "").slice(0, 40);
}

export default function AdminOnboardingPanel({ companyId, uploaderName }: Props) {
  const [tab, setTab] = useState<"add" | "manage">("add");
  const [companyDomain, setCompanyDomain] = useState<string>("");

  useEffect(() => {
    supabase.from("company_profiles").select("domain").eq("id", companyId).maybeSingle()
      .then(({ data }) => setCompanyDomain((data?.domain ?? "").trim().toLowerCase()));
  }, [companyId]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <TabBtn active={tab === "add"} onClick={() => setTab("add")} icon={<UserPlus className="h-4 w-4" />}>
          Add new employee
        </TabBtn>
        <TabBtn active={tab === "manage"} onClick={() => setTab("manage")} icon={<Search className="h-4 w-4" />}>
          Manage existing
        </TabBtn>
      </div>
      {tab === "add"
        ? <AddEmployeeForm companyId={companyId} uploaderName={uploaderName} companyDomain={companyDomain} />
        : <ManageEmployees companyId={companyId} uploaderName={uploaderName} />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: any) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-extrabold transition ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"
      }`}>
      {icon}{children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", maxLength, error, hint, disabled }: any) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        type={type} maxLength={maxLength} disabled={disabled}
        className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm ${error ? "border-destructive" : "border-border"} ${disabled ? "opacity-60" : ""}`} />
      {hint && !error && <span className="mt-0.5 block text-[10px] text-muted-foreground">{hint}</span>}
      {error && <span className="mt-0.5 block text-[10px] font-bold text-destructive">{error}</span>}
    </label>
  );
}

function validate(form: any) {
  const errs: Record<string, string> = {};
  if (!form.displayName.trim() || form.displayName.trim().length < 2) errs.displayName = "Name required (2+ chars)";
  if (!form.email.trim() || !EMAIL_RE.test(form.email.trim())) errs.email = "Valid email required";
  if (form.uan && !UAN_RE.test(form.uan.replace(/\s/g, ""))) errs.uan = "UAN must be 12 digits";
  if (form.pan && !PAN_RE.test(form.pan.toUpperCase())) errs.pan = "PAN format ABCDE1234F";
  if (form.aadhar && !AADHAAR_RE.test(form.aadhar.replace(/\s/g, ""))) errs.aadhar = "Aadhaar must be 12 digits";
  if (form.ifsc && !IFSC_RE.test(form.ifsc.toUpperCase())) errs.ifsc = "IFSC format ABCD0123456";
  if (form.bankAcc && !/^[0-9]{6,20}$/.test(form.bankAcc.replace(/\s/g, ""))) errs.bankAcc = "Account number 6-20 digits";
  return errs;
}

function friendlyDbError(err: any): { message: string; field?: string } {
  const code = err?.code ?? "";
  const msg = err?.message ?? String(err);
  if (code === "23505" || msg.includes("duplicate key value")) {
    if (msg.includes("idx_employee_profiles_company_code") || msg.includes("company_code")) {
      return { message: "This Employee ID is already used in your company.", field: "employeeCode" };
    }
    if (msg.includes("idx_employee_profiles_company_email") || msg.includes("company_email")) {
      return { message: "This email is already assigned to another employee in your company.", field: "email" };
    }
    return { message: "A duplicate value was detected. Please check your inputs.", field: "email" };
  }
  return { message: msg };
}

function AddEmployeeForm({ companyId, uploaderName, companyDomain }: { companyId: string; uploaderName: string; companyDomain: string }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [emailEdited, setEmailEdited] = useState(false);
  const [employeeCode, setEmployeeCode] = useState("");
  const [phone, setPhone] = useState("");
  const [uan, setUan] = useState("");
  const [pan, setPan] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [bankAcc, setBankAcc] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [kycFiles, setKycFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastCode, setLastCode] = useState<string | null>(null);

  // Auto-suggest email when name typed (until user edits)
  useEffect(() => {
    if (emailEdited) return;
    const slug = slugifyName(displayName);
    if (slug && companyDomain) setEmail(`${slug}@${companyDomain}`);
    else if (slug) setEmail(`${slug}@company.com`);
    else setEmail("");
  }, [displayName, companyDomain, emailEdited]);

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const ok = files.filter((f) => {
      if (f.size > 8 * 1024 * 1024) { toast.error(`${f.name} > 8MB`); return false; }
      return true;
    });
    setKycFiles((prev) => [...prev, ...ok]);
  };

  const reset = () => {
    setDisplayName(""); setEmail(""); setEmailEdited(false); setEmployeeCode(""); setPhone(""); setUan("");
    setPan(""); setAadhar(""); setBankAcc(""); setIfsc(""); setBankName(""); setKycFiles([]); setErrors({});
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const form = { displayName, email, uan, pan, aadhar, ifsc, bankAcc };
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error("Please fix the highlighted fields"); return; }

    setBusy(true);
    try {
      let finalCode = employeeCode.trim().toUpperCase();
      if (!finalCode) {
        const { data: codeData, error: codeErr } = await supabase.rpc("generate_employee_code", { _company_id: companyId });
        if (codeErr) throw codeErr;
        finalCode = codeData as unknown as string;
      } else {
        // Pre-check uniqueness within company
        const { data: dup } = await supabase.from("employee_profiles")
          .select("id").eq("company_id", companyId).eq("employee_code", finalCode).maybeSingle();
        if (dup) {
          setErrors({ employeeCode: "This Employee ID is already used in your company." });
          toast.error("Employee ID already exists");
          setBusy(false);
          return;
        }
      }

      const { data: emp, error: empErr } = await supabase.from("employee_profiles").insert({
        company_id: companyId,
        display_name: displayName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        employee_code: finalCode,
        uan_number: uan.replace(/\s/g, "") || null,
        status: "approved",
      }).select().single();
      if (empErr) throw empErr;

      if (pan || aadhar || bankAcc || ifsc || bankName) {
        const { error: kycErr } = await supabase.from("employee_kyc").insert({
          employee_id: emp.id, user_id: null, company_id: companyId,
          pan_number: pan.toUpperCase().trim() || null,
          aadhar_number: aadhar.replace(/\s/g, "") || null,
          bank_account_holder: displayName.trim(),
          bank_account_number: bankAcc.replace(/\s/g, "") || null,
          bank_ifsc: ifsc.toUpperCase().trim() || null,
          bank_name: bankName.trim() || null,
        });
        if (kycErr) throw kycErr;
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;
      for (const f of kycFiles) {
        const path = `${companyId}/${emp.id}/kyc-${Date.now()}-${f.name}`;
        const { error: upErr } = await supabase.storage.from("employee-documents").upload(path, f);
        if (upErr) { toast.error(`Upload failed: ${f.name}`); continue; }
        await supabase.from("employee_documents").insert({
          company_id: companyId, employee_id: emp.id, user_id: null,
          doc_type: "kyc", title: f.name, file_path: path, file_name: f.name,
          file_size: f.size, mime_type: f.type, uploaded_by: userId, uploaded_by_name: uploaderName,
        });
      }

      toast.success("Employee onboarded", { description: `Code ${finalCode}` });
      setLastCode(finalCode);
      reset();
    } catch (err: any) {
      const friendly = friendlyDbError(err);
      if (friendly.field) setErrors({ [friendly.field]: friendly.message });
      toast.error("Onboarding failed", { description: friendly.message });
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-extrabold">Employee onboarding</h3>
      </div>
      {lastCode && (
        <p className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-xs font-bold text-success">
          Last onboarded · Employee ID <span className="font-mono">{lastCode}</span>
        </p>
      )}
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name *" value={displayName} onChange={setDisplayName} placeholder="Jane Doe" error={errors.displayName} />
        <Field label="Work email *" value={email}
          onChange={(v: string) => { setEmailEdited(true); setEmail(v); }}
          placeholder="jane@company.com" type="email"
          hint={!emailEdited ? "Auto-generated from name — editable" : undefined}
          error={errors.email} />
        <Field label="Employee ID" value={employeeCode}
          onChange={(v: string) => setEmployeeCode(v.toUpperCase())}
          placeholder="e.g. EMP-001 (leave blank to auto-generate)"
          maxLength={32}
          hint="Must be unique within your company"
          error={errors.employeeCode} />
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91…" />
        <Field label="UAN number" value={uan} onChange={setUan} placeholder="12-digit UAN" maxLength={14} error={errors.uan} />

        <div className="sm:col-span-2 mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <IdCard className="h-3.5 w-3.5 text-primary" /> KYC (optional)
        </div>
        <Field label="PAN" value={pan} onChange={(v: string) => setPan(v.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} error={errors.pan} />
        <Field label="Aadhaar" value={aadhar} onChange={setAadhar} placeholder="12 digits" maxLength={14} error={errors.aadhar} />

        <div className="sm:col-span-2 mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Banknote className="h-3.5 w-3.5 text-primary" /> Salary bank (optional)
        </div>
        <Field label="Bank account no." value={bankAcc} onChange={setBankAcc} error={errors.bankAcc} />
        <Field label="IFSC" value={ifsc} onChange={(v: string) => setIfsc(v.toUpperCase())} maxLength={11} error={errors.ifsc} />
        <Field label="Bank name" value={bankName} onChange={setBankName} />

        <label className="block sm:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">KYC documents (PDF/Image, max 8MB each)</span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold">
              <Upload className="h-3.5 w-3.5" /> Add files
              <input type="file" multiple className="hidden" accept="application/pdf,image/*" onChange={onFiles} />
            </label>
            {kycFiles.length === 0 && <span className="text-xs text-muted-foreground">No files selected</span>}
            {kycFiles.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px]">
                <FileText className="h-3 w-3" />{f.name}
                <button type="button" onClick={() => setKycFiles((p) => p.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </label>

        <button type="submit" disabled={busy}
          className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground disabled:opacity-60">
          <UserPlus className="h-4 w-4" /> {busy ? "Onboarding…" : "Add employee & generate ID"}
        </button>
      </form>
    </div>
  );
}

function ManageEmployees({ companyId, uploaderName }: { companyId: string; uploaderName: string }) {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("employee_profiles")
      .select("id,display_name,email,phone,employee_code,uan_number,status")
      .eq("company_id", companyId).order("created_at", { ascending: false });
    setEmployees((data ?? []) as EmployeeRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [companyId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      e.display_name.toLowerCase().includes(q) ||
      (e.email ?? "").toLowerCase().includes(q) ||
      (e.employee_code ?? "").toLowerCase().includes(q) ||
      (e.uan_number ?? "").includes(q));
  }, [employees, search]);

  const selected = employees.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / email / code / UAN"
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
        </div>
        <div className="max-h-[520px] space-y-1 overflow-y-auto">
          {loading && <p className="px-2 py-3 text-xs text-muted-foreground">Loading…</p>}
          {!loading && filtered.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No employees</p>}
          {filtered.map((e) => (
            <button key={e.id} onClick={() => setSelectedId(e.id)}
              className={`w-full rounded-lg px-2 py-2 text-left text-sm transition ${
                selectedId === e.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}>
              <div className="font-bold">{e.display_name}</div>
              <div className={`text-[11px] ${selectedId === e.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {e.employee_code ?? "—"} · {e.email ?? "no email"}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0">
        {selected
          ? <EmployeeEditor key={selected.id} companyId={companyId} uploaderName={uploaderName} employee={selected} onSaved={load} />
          : <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Select an employee to view, edit, or upload KYC documents.
            </div>}
      </div>
    </div>
  );
}

function EmployeeEditor({ companyId, uploaderName, employee, onSaved }: {
  companyId: string; uploaderName: string; employee: EmployeeRow; onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(employee.display_name);
  const [email, setEmail] = useState(employee.email ?? "");
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [uan, setUan] = useState(employee.uan_number ?? "");
  const [kyc, setKyc] = useState<KycRow | null>(null);
  const [pan, setPan] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [bankAcc, setBankAcc] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const loadKyc = async () => {
    const { data: k } = await supabase.from("employee_kyc").select("*").eq("employee_id", employee.id).maybeSingle();
    if (k) {
      setKyc(k as KycRow);
      setPan(k.pan_number ?? ""); setAadhar(k.aadhar_number ?? "");
      setBankAcc(k.bank_account_number ?? ""); setIfsc(k.bank_ifsc ?? ""); setBankName(k.bank_name ?? "");
    } else {
      setKyc(null); setPan(""); setAadhar(""); setBankAcc(""); setIfsc(""); setBankName("");
    }
    const { data: d } = await supabase.from("employee_documents")
      .select("id,employee_id,doc_type,title,file_path,file_name,file_size,created_at")
      .eq("employee_id", employee.id).eq("doc_type", "kyc").order("created_at", { ascending: false });
    setDocs((d ?? []) as DocRow[]);
  };
  useEffect(() => { loadKyc(); }, [employee.id]);

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const ok = files.filter((f) => {
      if (f.size > 8 * 1024 * 1024) { toast.error(`${f.name} > 8MB`); return false; }
      return true;
    });
    setNewFiles((p) => [...p, ...ok]);
  };

  const downloadDoc = async (d: DocRow) => {
    const { data, error } = await supabase.storage.from("employee-documents").createSignedUrl(d.file_path, 60);
    if (error) { toast.error("Cannot download"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const removeDoc = async (d: DocRow) => {
    if (!confirm(`Remove ${d.file_name}?`)) return;
    await supabase.storage.from("employee-documents").remove([d.file_path]);
    await supabase.from("employee_documents").delete().eq("id", d.id);
    toast.success("Document removed");
    loadKyc();
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate({ displayName, email, uan, pan, aadhar, ifsc, bankAcc });
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error("Please fix the highlighted fields"); return; }

    setBusy(true);
    try {
      const { error: pErr } = await supabase.from("employee_profiles").update({
        display_name: displayName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        uan_number: uan.replace(/\s/g, "") || null,
      }).eq("id", employee.id);
      if (pErr) throw pErr;

      const kycPayload = {
        employee_id: employee.id, company_id: companyId,
        pan_number: pan.toUpperCase().trim() || null,
        aadhar_number: aadhar.replace(/\s/g, "") || null,
        bank_account_holder: displayName.trim(),
        bank_account_number: bankAcc.replace(/\s/g, "") || null,
        bank_ifsc: ifsc.toUpperCase().trim() || null,
        bank_name: bankName.trim() || null,
      };
      if (kyc) {
        const { error } = await supabase.from("employee_kyc").update(kycPayload).eq("id", kyc.id);
        if (error) throw error;
      } else if (pan || aadhar || bankAcc || ifsc || bankName) {
        const { error } = await supabase.from("employee_kyc").insert({ ...kycPayload, user_id: null });
        if (error) throw error;
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;
      for (const f of newFiles) {
        const path = `${companyId}/${employee.id}/kyc-${Date.now()}-${f.name}`;
        const { error: upErr } = await supabase.storage.from("employee-documents").upload(path, f);
        if (upErr) { toast.error(`Upload failed: ${f.name}`); continue; }
        await supabase.from("employee_documents").insert({
          company_id: companyId, employee_id: employee.id, user_id: null,
          doc_type: "kyc", title: f.name, file_path: path, file_name: f.name,
          file_size: f.size, mime_type: f.type, uploaded_by: userId, uploaded_by_name: uploaderName,
        });
      }
      setNewFiles([]);
      toast.success("Employee updated");
      loadKyc(); onSaved();
    } catch (err: any) {
      toast.error("Save failed", { description: err.message ?? String(err) });
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-extrabold">{employee.display_name}</h3>
          <p className="text-xs text-muted-foreground">
            <span className="font-mono">{employee.employee_code ?? "—"}</span> · {employee.status ?? "—"}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-bold">
          <Mail className="h-3 w-3" />{employee.email ?? "—"}
        </span>
      </div>

      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name *" value={displayName} onChange={setDisplayName} error={errors.displayName} />
        <Field label="Work email *" value={email} onChange={setEmail} type="email" error={errors.email} />
        <Field label="Phone" value={phone} onChange={setPhone} />
        <Field label="UAN number" value={uan} onChange={setUan} maxLength={14} error={errors.uan} />

        <div className="sm:col-span-2 mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <IdCard className="h-3.5 w-3.5 text-primary" /> KYC
        </div>
        <Field label="PAN" value={pan} onChange={(v: string) => setPan(v.toUpperCase())} maxLength={10} error={errors.pan} />
        <Field label="Aadhaar" value={aadhar} onChange={setAadhar} maxLength={14} error={errors.aadhar} />

        <div className="sm:col-span-2 mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Banknote className="h-3.5 w-3.5 text-primary" /> Salary bank
        </div>
        <Field label="Bank account no." value={bankAcc} onChange={setBankAcc} error={errors.bankAcc} />
        <Field label="IFSC" value={ifsc} onChange={(v: string) => setIfsc(v.toUpperCase())} maxLength={11} error={errors.ifsc} />
        <Field label="Bank name" value={bankName} onChange={setBankName} />

        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" /> KYC documents
          </div>
          <div className="space-y-1.5">
            {docs.length === 0 && <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>}
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
                <span className="truncate">{d.file_name} <span className="text-muted-foreground">· {new Date(d.created_at).toLocaleDateString()}</span></span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => downloadDoc(d)} className="rounded p-1 hover:bg-muted" title="Download"><Download className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => removeDoc(d)} className="rounded p-1 text-destructive hover:bg-destructive/10" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold">
              <Upload className="h-3.5 w-3.5" /> Append documents
              <input type="file" multiple className="hidden" accept="application/pdf,image/*" onChange={onFiles} />
            </label>
            {newFiles.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px]">
                <FileText className="h-3 w-3" />{f.name}
                <button type="button" onClick={() => setNewFiles((p) => p.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        </div>

        <button type="submit" disabled={busy}
          className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground disabled:opacity-60">
          <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
