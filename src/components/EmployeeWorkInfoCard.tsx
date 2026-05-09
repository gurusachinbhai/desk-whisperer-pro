import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, FolderKanban, IdCard, Banknote, Eye, EyeOff } from "lucide-react";

type Props = { meEmployeeId: string | null; meUserId: string | null; companyId: string | null };

type Dept = { id: string; name: string };
type Project = { id: string; name: string };
type Kyc = {
  pan_number: string | null;
  aadhar_number: string | null;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  bank_branch: string | null;
};

const mask = (v: string | null, keep = 4) => {
  if (!v) return "—";
  if (v.length <= keep) return v;
  return "•".repeat(Math.max(4, v.length - keep)) + v.slice(-keep);
};

export default function EmployeeWorkInfoCard({ meEmployeeId, meUserId, companyId }: Props) {
  const [dept, setDept] = useState<Dept | null>(null);
  const [proj, setProj] = useState<Project | null>(null);
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (!meEmployeeId || !companyId) return;
    (async () => {
      const { data: prof } = await supabase
        .from("employee_profiles")
        .select("department_id, project_id")
        .eq("id", meEmployeeId)
        .maybeSingle();
      if (prof?.department_id) {
        const { data } = await supabase.from("departments").select("id,name").eq("id", prof.department_id).maybeSingle();
        setDept(data as Dept | null);
      } else setDept(null);
      if (prof?.project_id) {
        const { data } = await supabase.from("projects").select("id,name").eq("id", prof.project_id).maybeSingle();
        setProj(data as Project | null);
      } else setProj(null);

      if (meUserId) {
        const { data: k } = await supabase
          .from("employee_kyc")
          .select("pan_number,aadhar_number,bank_account_holder,bank_account_number,bank_ifsc,bank_name,bank_branch")
          .eq("user_id", meUserId)
          .maybeSingle();
        setKyc(k as Kyc | null);
      }
    })();
  }, [meEmployeeId, meUserId, companyId]);

  if (!meEmployeeId) return null;

  return (
    <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h3 className="font-display text-base font-extrabold">My work & payroll info</h3>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl bg-background p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <Building2 className="h-3 w-3" /> Department
          </p>
          <p className="mt-1 text-sm font-extrabold">{dept?.name ?? "Not assigned"}</p>
        </div>
        <div className="rounded-2xl bg-background p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <FolderKanban className="h-3 w-3" /> Project
          </p>
          <p className="mt-1 text-sm font-extrabold">{proj?.name ?? "Not assigned"}</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-background p-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
            <IdCard className="h-3.5 w-3.5 text-primary" /> KYC & salary account
          </p>
          {kyc && (
            <button onClick={() => setReveal((r) => !r)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-bold">
              {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {reveal ? "Hide" : "Reveal"}
            </button>
          )}
        </div>
        {!kyc ? (
          <p className="mt-2 text-xs text-muted-foreground">Your admin hasn't added your KYC and bank details yet.</p>
        ) : (
          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
            <Row label="PAN" value={reveal ? kyc.pan_number : mask(kyc.pan_number, 4)} />
            <Row label="Aadhaar" value={reveal ? kyc.aadhar_number : mask(kyc.aadhar_number, 4)} />
            <Row label="Account holder" value={kyc.bank_account_holder ?? "—"} />
            <Row label="Bank" value={[kyc.bank_name, kyc.bank_branch].filter(Boolean).join(" · ") || "—"} icon={Banknote} />
            <Row label="Account no." value={reveal ? kyc.bank_account_number : mask(kyc.bank_account_number, 4)} />
            <Row label="IFSC" value={kyc.bank_ifsc ?? "—"} />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: string | null; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="text-xs font-extrabold">{value || "—"}</p>
    </div>
  );
}
