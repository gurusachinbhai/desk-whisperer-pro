import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, FolderKanban, Users, IdCard, Banknote, Plus, Trash2, Save } from "lucide-react";

type Dept = { id: string; name: string; description: string | null };
type Project = { id: string; name: string; description: string | null; department_id: string | null };
type Employee = {
  id: string;
  display_name: string;
  email: string | null;
  user_id: string | null;
  department_id: string | null;
  project_id: string | null;
};
type Kyc = {
  id?: string;
  employee_id: string;
  user_id: string | null;
  company_id: string;
  pan_number: string | null;
  aadhar_number: string | null;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  bank_branch: string | null;
};

export default function AdminDepartmentsPanel({ companyId }: { companyId: string }) {
  const [tab, setTab] = useState<"departments" | "projects" | "mapping" | "kyc">("departments");
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [kycMap, setKycMap] = useState<Record<string, Kyc>>({});
  const [loading, setLoading] = useState(true);

  // forms
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [projDept, setProjDept] = useState<string>("");
  const [selectedEmp, setSelectedEmp] = useState<string>("");

  const loadAll = async () => {
    setLoading(true);
    const [d, p, e, k] = await Promise.all([
      supabase.from("departments").select("*").eq("company_id", companyId).order("name"),
      supabase.from("projects").select("*").eq("company_id", companyId).order("name"),
      supabase.from("employee_profiles").select("id,display_name,email,user_id,department_id,project_id").eq("company_id", companyId).order("display_name"),
      supabase.from("employee_kyc").select("*").eq("company_id", companyId),
    ]);
    if (d.error) toast.error("Departments failed", { description: d.error.message });
    if (p.error) toast.error("Projects failed", { description: p.error.message });
    if (e.error) toast.error("Employees failed", { description: e.error.message });
    setDepartments((d.data ?? []) as Dept[]);
    setProjects((p.data ?? []) as Project[]);
    setEmployees((e.data ?? []) as Employee[]);
    const m: Record<string, Kyc> = {};
    ((k.data ?? []) as Kyc[]).forEach((row) => { m[row.employee_id] = row; });
    setKycMap(m);
    setLoading(false);
  };

  useEffect(() => { if (companyId) loadAll(); }, [companyId]);

  const addDepartment = async (e: FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    const { error } = await supabase.from("departments").insert({ company_id: companyId, name: deptName.trim(), description: deptDesc.trim() || null });
    if (error) return toast.error("Could not add", { description: error.message });
    toast.success("Department added");
    setDeptName(""); setDeptDesc(""); loadAll();
  };
  const removeDept = async (id: string) => {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) return toast.error("Delete failed", { description: error.message });
    toast.success("Department removed"); loadAll();
  };

  const addProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) return;
    const { error } = await supabase.from("projects").insert({
      company_id: companyId, name: projName.trim(), description: projDesc.trim() || null,
      department_id: projDept || null,
    });
    if (error) return toast.error("Could not add", { description: error.message });
    toast.success("Project added");
    setProjName(""); setProjDesc(""); setProjDept(""); loadAll();
  };
  const removeProject = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error("Delete failed", { description: error.message });
    toast.success("Project removed"); loadAll();
  };

  const updateEmployeeMap = async (empId: string, patch: { department_id?: string | null; project_id?: string | null }) => {
    const { error } = await supabase.from("employee_profiles").update(patch).eq("id", empId);
    if (error) return toast.error("Update failed", { description: error.message });
    toast.success("Saved");
    loadAll();
  };

  const saveKyc = async (emp: Employee, draft: Partial<Kyc>) => {
    const existing = kycMap[emp.id];
    const payload = {
      employee_id: emp.id,
      user_id: emp.user_id,
      company_id: companyId,
      pan_number: draft.pan_number ?? existing?.pan_number ?? null,
      aadhar_number: draft.aadhar_number ?? existing?.aadhar_number ?? null,
      bank_account_holder: draft.bank_account_holder ?? existing?.bank_account_holder ?? null,
      bank_account_number: draft.bank_account_number ?? existing?.bank_account_number ?? null,
      bank_ifsc: draft.bank_ifsc ?? existing?.bank_ifsc ?? null,
      bank_name: draft.bank_name ?? existing?.bank_name ?? null,
      bank_branch: draft.bank_branch ?? existing?.bank_branch ?? null,
    };
    const res = existing?.id
      ? await supabase.from("employee_kyc").update(payload).eq("id", existing.id)
      : await supabase.from("employee_kyc").insert(payload);
    if (res.error) return toast.error("Save failed", { description: res.error.message });
    toast.success("KYC saved");
    loadAll();
  };

  if (loading) return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading…</div>;

  const tabs = [
    { id: "departments", label: "Departments", icon: Building2 },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "mapping", label: "Map employees", icon: Users },
    { id: "kyc", label: "Employee KYC", icon: IdCard },
  ] as const;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h3 className="font-display text-base font-extrabold">Departments, Projects & KYC</h3>
      </div>
      <div className="mb-4 flex flex-wrap gap-1 text-xs font-bold">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "departments" && (
        <div className="space-y-3">
          <form onSubmit={addDepartment} className="grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-[1fr_1fr_auto]">
            <input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="Department name (e.g. Engineering)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm" required />
            <input value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} placeholder="Description (optional)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <button type="submit" className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </form>
          {departments.length === 0 && <p className="text-xs text-muted-foreground">No departments yet.</p>}
          {departments.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
              <div className="min-w-0">
                <p className="text-sm font-extrabold">{d.name}</p>
                {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
              </div>
              <button onClick={() => removeDept(d.id)} className="rounded-lg border border-border px-2 py-1 text-xs font-bold text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "projects" && (
        <div className="space-y-3">
          <form onSubmit={addProject} className="grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-2">
            <input value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="Project name" required
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <select value={projDept} onChange={(e) => setProjDept(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="">— No department —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input value={projDesc} onChange={(e) => setProjDesc(e.target.value)} placeholder="Description (optional)"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2" />
            <button type="submit" className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground sm:col-span-2">
              <Plus className="h-3.5 w-3.5" /> Add project
            </button>
          </form>
          {projects.length === 0 && <p className="text-xs text-muted-foreground">No projects yet.</p>}
          {projects.map((p) => {
            const dept = departments.find((d) => d.id === p.department_id);
            return (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{dept?.name ?? "No department"}{p.description ? ` · ${p.description}` : ""}</p>
                </div>
                <button onClick={() => removeProject(p.id)} className="rounded-lg border border-border px-2 py-1 text-xs font-bold text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "mapping" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Assign each employee to a department and project.</p>
          {employees.map((emp) => (
            <div key={emp.id} className="grid gap-2 rounded-xl border border-border bg-background p-3 sm:grid-cols-[1.5fr_1fr_1fr]">
              <div className="min-w-0">
                <p className="text-sm font-extrabold">{emp.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">{emp.email}</p>
              </div>
              <select value={emp.department_id ?? ""} onChange={(e) => updateEmployeeMap(emp.id, { department_id: e.target.value || null })}
                className="rounded-lg border border-border bg-background px-2 py-2 text-xs">
                <option value="">— Department —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select value={emp.project_id ?? ""} onChange={(e) => updateEmployeeMap(emp.id, { project_id: e.target.value || null })}
                className="rounded-lg border border-border bg-background px-2 py-2 text-xs">
                <option value="">— Project —</option>
                {projects
                  .filter((p) => !emp.department_id || !p.department_id || p.department_id === emp.department_id)
                  .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {tab === "kyc" && (
        <div className="space-y-3">
          <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="">— Select employee —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.display_name} {e.email ? `(${e.email})` : ""}</option>)}
          </select>
          {selectedEmp && (() => {
            const emp = employees.find((e) => e.id === selectedEmp)!;
            const k = kycMap[emp.id] ?? {} as Kyc;
            return <KycForm key={emp.id} emp={emp} initial={k} onSave={(d) => saveKyc(emp, d)} />;
          })()}
        </div>
      )}
    </div>
  );
}

function KycForm({ emp, initial, onSave }: { emp: Employee; initial: Partial<Kyc>; onSave: (d: Partial<Kyc>) => void }) {
  const [pan, setPan] = useState(initial.pan_number ?? "");
  const [aadhar, setAadhar] = useState(initial.aadhar_number ?? "");
  const [holder, setHolder] = useState(initial.bank_account_holder ?? emp.display_name);
  const [acc, setAcc] = useState(initial.bank_account_number ?? "");
  const [ifsc, setIfsc] = useState(initial.bank_ifsc ?? "");
  const [bank, setBank] = useState(initial.bank_name ?? "");
  const [branch, setBranch] = useState(initial.bank_branch ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({
      pan_number: pan.trim().toUpperCase() || null,
      aadhar_number: aadhar.replace(/\s+/g, "") || null,
      bank_account_holder: holder.trim() || null,
      bank_account_number: acc.replace(/\s+/g, "") || null,
      bank_ifsc: ifsc.trim().toUpperCase() || null,
      bank_name: bank.trim() || null,
      bank_branch: branch.trim() || null,
    });
  };

  const Input = (props: { label: string; value: string; set: (v: string) => void; placeholder?: string; maxLength?: number }) => (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{props.label}</span>
      <input value={props.value} onChange={(e) => props.set(e.target.value)} placeholder={props.placeholder} maxLength={props.maxLength}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
    </label>
  );

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-background p-3 sm:grid-cols-2">
      <div className="sm:col-span-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <IdCard className="h-3.5 w-3.5 text-primary" /> Identity
      </div>
      <Input label="PAN number" value={pan} set={setPan} placeholder="ABCDE1234F" maxLength={10} />
      <Input label="Aadhaar number" value={aadhar} set={setAadhar} placeholder="1234 5678 9012" maxLength={14} />

      <div className="sm:col-span-2 mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Banknote className="h-3.5 w-3.5 text-primary" /> Salary bank account
      </div>
      <Input label="Account holder" value={holder} set={setHolder} />
      <Input label="Account number" value={acc} set={setAcc} />
      <Input label="IFSC code" value={ifsc} set={setIfsc} placeholder="HDFC0001234" maxLength={11} />
      <Input label="Bank name" value={bank} set={setBank} />
      <Input label="Branch" value={branch} set={setBranch} />

      <button type="submit" className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-extrabold text-primary-foreground">
        <Save className="h-4 w-4" /> Save KYC & bank details
      </button>
    </form>
  );
}
