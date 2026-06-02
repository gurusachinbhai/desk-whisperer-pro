import { useState, ReactNode } from "react";
import {
  LayoutDashboard, UserPlus, LogOut, Search, Building2, FileText, Armchair, Bell, BarChart3, CreditCard, Menu, X, GraduationCap, ClipboardList, FolderArchive, MapPin, Laptop, Calculator, Sparkles, ShieldAlert, Users, Package, Receipt,
} from "lucide-react";
import AdminCRMPanel from "./AdminCRMPanel";
import AdminInventoryPanel from "./AdminInventoryPanel";
import AdminSalarySlipPanel from "./AdminSalarySlipPanel";
import AdminAssistantLogsPanel from "./AdminAssistantLogsPanel";
import AdminITEscalationsPanel from "./AdminITEscalationsPanel";
import AdminOnboardingPanel from "./AdminOnboardingPanel";
import AdminResignationsPanel from "./AdminResignationsPanel";
import AdminEmployeeSearchPanel from "./AdminEmployeeSearchPanel";
import AdminSeatMasterPanel from "./AdminSeatMasterPanel";
import AdminResumeBankPanel from "./AdminResumeBankPanel";
import AdminAttendancePanel from "./AdminAttendancePanel";
import AdminITAssetPanel from "./AdminITAssetPanel";
import AdminAccountingPanel from "./AdminAccountingPanel";
import AdminDepartmentsPanel from "@/components/AdminDepartmentsPanel";
import AdminDocumentsPanel from "@/components/AdminDocumentsPanel";
import TrainingPanel from "@/components/TrainingPanel";
import AppraisalPanel from "@/components/AppraisalPanel";

type Section =
  | "dashboard" | "onboarding" | "resignation" | "search"
  | "departments" | "documents" | "salaryslip" | "training" | "appraisal" | "resumes" | "seats" | "attendance" | "itassets" | "accounting" | "crm" | "inventory" | "assistantlogs" | "itescalations" | "announcements" | "reports" | "billing";

type Props = {
  companyId: string;
  uploaderName: string;
  meUserId?: string | null;
  meEmployeeId?: string | null;
  renderDashboard: () => ReactNode;
  renderAnnouncements?: () => ReactNode;
  renderReports?: () => ReactNode;
  renderBilling?: () => ReactNode;
};

const NAV: { id: Section; label: string; icon: any; group: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { id: "onboarding", label: "Employee Onboarding", icon: UserPlus, group: "People" },
  { id: "resignation", label: "Resignation Sign-off", icon: LogOut, group: "People" },
  { id: "search", label: "Employee Search", icon: Search, group: "People" },
  { id: "departments", label: "Departments & KYC", icon: Building2, group: "Org" },
  { id: "documents", label: "Documents & Payroll", icon: FileText, group: "Org" },
  { id: "training", label: "Training & Skills", icon: GraduationCap, group: "Org" },
  { id: "appraisal", label: "Appraisals", icon: ClipboardList, group: "Org" },
  { id: "resumes", label: "Resume Bank", icon: FolderArchive, group: "Org" },
  { id: "seats", label: "Open Desk · Seats", icon: Armchair, group: "Workspace" },
  { id: "attendance", label: "Attendance & Geo", icon: MapPin, group: "Workspace" },
  { id: "itassets", label: "IT Asset Management", icon: Laptop, group: "Workspace" },
  { id: "accounting", label: "Accounting", icon: Calculator, group: "Workspace" },
  { id: "crm", label: "CRM", icon: Users, group: "Workspace" },
  { id: "inventory", label: "Inventory", icon: Package, group: "Workspace" },
  { id: "announcements", label: "Announcements", icon: Bell, group: "Comms" },
  { id: "assistantlogs", label: "AI Assistant Logs", icon: Sparkles, group: "Comms" },
  { id: "itescalations", label: "IT Security Escalations", icon: ShieldAlert, group: "Comms" },
  { id: "reports", label: "Reports", icon: BarChart3, group: "Comms" },
  { id: "billing", label: "Billing", icon: CreditCard, group: "Comms" },
];

export default function AdminConsole({
  companyId, uploaderName, meUserId, meEmployeeId, renderDashboard, renderAnnouncements, renderReports, renderBilling,
}: Props) {
  const [section, setSection] = useState<Section>("dashboard");
  const [open, setOpen] = useState(false);

  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  const renderContent = () => {
    switch (section) {
      case "dashboard": return renderDashboard();
      case "onboarding": return <AdminOnboardingPanel companyId={companyId} uploaderName={uploaderName} />;
      case "resignation": return <AdminResignationsPanel companyId={companyId} />;
      case "search": return <AdminEmployeeSearchPanel companyId={companyId} />;
      case "departments": return <AdminDepartmentsPanel companyId={companyId} />;
      case "documents": return <AdminDocumentsPanel companyId={companyId} uploaderName={uploaderName} />;
      case "training": return <TrainingPanel companyId={companyId} meUserId={meUserId ?? null} meName={uploaderName} canManage={true} />;
      case "appraisal": return <AppraisalPanel companyId={companyId} meUserId={meUserId ?? null} meEmployeeId={meEmployeeId ?? null} meName={uploaderName} isAdmin={true} />;
      case "resumes": return <AdminResumeBankPanel companyId={companyId} uploaderName={uploaderName} />;
      case "seats": return <AdminSeatMasterPanel companyId={companyId} />;
      case "attendance": return <AdminAttendancePanel companyId={companyId} />;
      case "itassets": return <AdminITAssetPanel companyId={companyId} uploaderName={uploaderName} meUserId={meUserId} />;
      case "accounting": return <AdminAccountingPanel companyId={companyId} uploaderName={uploaderName} meUserId={meUserId} />;
      case "crm": return <AdminCRMPanel companyId={companyId} uploaderName={uploaderName} />;
      case "inventory": return <AdminInventoryPanel companyId={companyId} uploaderName={uploaderName} />;
      case "announcements": return renderAnnouncements?.() ?? <Empty label="Announcements" />;
      case "assistantlogs": return <AdminAssistantLogsPanel companyId={companyId} />;
      case "itescalations": return <AdminITEscalationsPanel companyId={companyId} />;
      case "reports": return renderReports?.() ?? <Empty label="Reports" />;
      case "billing": return renderBilling?.() ?? <Empty label="Billing" />;
    }
  };

  const Sidebar = (
    <aside className="w-64 shrink-0 rounded-2xl border border-border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <p className="px-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Admin console</p>
        <button onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground lg:hidden"><X className="h-4 w-4" /></button>
      </div>
      <nav className="space-y-3">
        {groups.map((g) => (
          <div key={g}>
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g}</p>
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === g).map((n) => {
                const Icon = n.icon;
                const active = section === n.id;
                return (
                  <li key={n.id}>
                    <button onClick={() => { setSection(n.id); setOpen(false); }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-bold transition ${
                        active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{n.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );

  return (
    <div className="space-y-3">
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-extrabold lg:hidden">
        <Menu className="h-4 w-4" /> Admin menu
      </button>

      <div className="flex gap-4">
        <div className="hidden lg:block">{Sidebar}</div>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="relative ml-auto h-full w-72 overflow-y-auto bg-background p-3">{Sidebar}</div>
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-3">{renderContent()}</div>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">{label} unavailable.</div>;
}
