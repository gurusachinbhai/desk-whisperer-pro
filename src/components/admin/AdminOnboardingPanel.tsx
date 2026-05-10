import { useState, FormEvent, ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, IdCard, Upload, Banknote } from "lucide-react";

type Props = { companyId: string; uploaderName: string };

export default function AdminOnboardingPanel({ companyId, uploaderName }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [uan, setUan] = useState("");
  const [pan, setPan] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [bankAcc, setBankAcc] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 8 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 8 MB." });
      return;
    }
    setKycFile(f);
  };

  const reset = () => {
    setDisplayName(""); setEmail(""); setPhone(""); setUan(""); setPan(""); setAadhar("");
    setBankAcc(""); setIfsc(""); setBankName(""); setKycFile(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) {
      toast.error("Name and work email are required");
      return;
    }
    setBusy(true);
    try {
      const { data: codeData, error: codeErr } = await supabase.rpc("generate_employee_code", { _company_id: companyId });
      if (codeErr) throw codeErr;
      const employeeCode = codeData as unknown as string;

      const { data: emp, error: empErr } = await supabase
        .from("employee_profiles")
        .insert({
          company_id: companyId,
          display_name: displayName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          employee_code: employeeCode,
          uan_number: uan.trim() || null,
          status: "approved",
        })
        .select()
        .single();
      if (empErr) throw empErr;

      if (pan || aadhar || bankAcc || ifsc || bankName) {
        const { error: kycErr } = await supabase.from("employee_kyc").insert({
          employee_id: emp.id,
          user_id: null,
          company_id: companyId,
          pan_number: pan.trim().toUpperCase() || null,
          aadhar_number: aadhar.replace(/\s+/g, "") || null,
          bank_account_holder: displayName.trim(),
          bank_account_number: bankAcc.replace(/\s+/g, "") || null,
          bank_ifsc: ifsc.trim().toUpperCase() || null,
          bank_name: bankName.trim() || null,
        });
        if (kycErr) throw kycErr;
      }

      if (kycFile) {
        const path = `${companyId}/${emp.id}/kyc-${Date.now()}-${kycFile.name}`;
        const { error: upErr } = await supabase.storage.from("employee-documents").upload(path, kycFile);
        if (!upErr) {
          await supabase.from("employee_documents").insert({
            company_id: companyId,
            employee_id: emp.id,
            user_id: null,
            doc_type: "kyc",
            title: kycFile.name,
            file_path: path,
            file_name: kycFile.name,
            file_size: kycFile.size,
            mime_type: kycFile.type,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id,
            uploaded_by_name: uploaderName,
          });
        }
      }

      toast.success("Employee onboarded", { description: `Code ${employeeCode}` });
      setLastCode(employeeCode);
      reset();
    } catch (err: any) {
      toast.error("Onboarding failed", { description: err.message ?? String(err) });
    } finally {
      setBusy(false);
    }
  };

  const Field = ({ label, value, onChange, placeholder, type = "text", maxLength }: any) => (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} maxLength={maxLength}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );

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
        <Field label="Full name" value={displayName} onChange={setDisplayName} placeholder="Jane Doe" />
        <Field label="Work email" value={email} onChange={setEmail} placeholder="jane@company.com" type="email" />
        <Field label="Phone" value={phone} onChange={setPhone} placeholder="+91…" />
        <Field label="UAN number" value={uan} onChange={setUan} placeholder="12-digit UAN" maxLength={14} />
        <div className="sm:col-span-2 mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <IdCard className="h-3.5 w-3.5 text-primary" /> KYC (optional)
        </div>
        <Field label="PAN" value={pan} onChange={setPan} placeholder="ABCDE1234F" maxLength={10} />
        <Field label="Aadhaar" value={aadhar} onChange={setAadhar} placeholder="1234 5678 9012" maxLength={14} />
        <div className="sm:col-span-2 mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Banknote className="h-3.5 w-3.5 text-primary" /> Salary bank (optional)
        </div>
        <Field label="Bank account no." value={bankAcc} onChange={setBankAcc} />
        <Field label="IFSC" value={ifsc} onChange={setIfsc} maxLength={11} />
        <Field label="Bank name" value={bankName} onChange={setBankName} />
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">KYC document upload</span>
          <div className="mt-1 flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold">
              <Upload className="h-3.5 w-3.5" /> Choose file
              <input type="file" className="hidden" accept="application/pdf,image/*" onChange={onFile} />
            </label>
            <span className="text-xs text-muted-foreground">{kycFile ? kycFile.name : "No file selected"}</span>
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
