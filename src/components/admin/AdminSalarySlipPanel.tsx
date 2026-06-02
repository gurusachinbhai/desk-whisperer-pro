import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { computeAnnualTax, computeMonthlySalary, formatINR, type SalaryProfile, type TaxRegime } from "@/lib/tax-calc";
import { FileText, CheckCircle2, Eye, Upload, Download, Image as ImageIcon, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Props = { companyId: string; uploaderName: string };

type Emp = { id: string; user_id: string | null; display_name: string; email: string | null; employee_code: string | null };
type Company = {
  name: string;
  address_line1: string | null; address_line2: string | null;
  city: string | null; state: string | null; postal_code: string | null; country: string | null;
  contact_email: string | null; contact_phone: string | null;
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AdminSalarySlipPanel({ companyId, uploaderName }: Props) {
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [empId, setEmpId] = useState("");
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [directorName, setDirectorName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [headerSubtitle, setHeaderSubtitle] = useState("Salary Slip");
  const [brandAddress, setBrandAddress] = useState("");
  const [brandContact, setBrandContact] = useState("");
  const [footerText, setFooterText] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string>("");
  const [logoMime, setLogoMime] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastConfirm, setLastConfirm] = useState<string>("");

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const previewBlobRef = useRef<Blob | null>(null);
  const previewFileNameRef = useRef<string>("");
  const previewEmpRef = useRef<Emp | null>(null);
  const previewMonthRef = useRef<number>(month);
  const previewYearRef = useRef<number>(year);

  useEffect(() => {
    (async () => {
      const [empRes, coRes] = await Promise.all([
        supabase.from("employee_profiles")
          .select("id,user_id,display_name,email,employee_code")
          .eq("company_id", companyId)
          .order("display_name"),
        supabase.from("company_profiles")
          .select("name,address_line1,address_line2,city,state,postal_code,country,contact_email,contact_phone")
          .eq("id", companyId).maybeSingle(),
      ]);
      setEmployees((empRes.data ?? []) as Emp[]);
      setCompany((coRes.data ?? null) as Company | null);
    })();
  }, [companyId]);

  // Clean up object URLs
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const selectedEmp = useMemo(() => employees.find((e) => e.id === empId) || null, [empId, employees]);

  const addrLine = useMemo(() => {
    if (!company) return "";
    return [company.address_line1, company.address_line2, [company.city, company.state, company.postal_code].filter(Boolean).join(", "), company.country]
      .filter(Boolean).join(" • ");
  }, [company]);

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

  const buildPdf = async (): Promise<{ blob: Blob; fileName: string; emp: Emp } | null> => {
    if (!selectedEmp) { toast.error("Select an employee"); return null; }
    if (!selectedEmp.user_id) { toast.error("Employee must have a linked login before salary slips can be issued."); return null; }

    const { data: sp, error: spErr } = await (supabase as any).from("salary_profiles")
      .select("*").eq("company_id", companyId).eq("employee_id", selectedEmp.id)
      .order("effective_from", { ascending: false }).limit(1).maybeSingle();
    if (spErr) throw spErr;
    if (!sp) { toast.error("No salary profile for this employee. Add one under Documents & Payroll first."); return null; }

    const profile: SalaryProfile = {
      annual_ctc: Number(sp.annual_ctc) || 0,
      basic: Number(sp.basic) || 0,
      hra: Number(sp.hra) || 0,
      special_allowance: Number(sp.special_allowance) || 0,
      other_allowance: Number(sp.other_allowance) || 0,
      pf_deduction: Number(sp.pf_deduction) || 0,
      professional_tax: Number(sp.professional_tax) || 0,
      other_deduction: Number(sp.other_deduction) || 0,
      tax_regime: (sp.tax_regime as TaxRegime) || "new",
    };
    const tax = computeAnnualTax(profile.basic + profile.hra + profile.special_allowance + profile.other_allowance, profile.tax_regime);
    const m = computeMonthlySalary(profile, tax);

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    doc.setFillColor(20, 33, 61);
    doc.rect(0, 0, W, 70, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text(company?.name || "Company", 40, 32);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(addrLine || "", 40, 50, { maxWidth: W - 80 });
    if (company?.contact_email || company?.contact_phone) {
      doc.text([company?.contact_email, company?.contact_phone].filter(Boolean).join(" | "), 40, 62);
    }

    doc.setTextColor(20, 33, 61);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(`Salary Slip — ${MONTHS[month - 1]} ${year}`, 40, 100);

    doc.setTextColor(40);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const empRows: [string, string][] = [
      ["Employee Name", selectedEmp.display_name],
      ["Employee ID", selectedEmp.employee_code || "—"],
      ["Email", selectedEmp.email || "—"],
      ["Pay Period", `${MONTHS[month - 1]} ${year}`],
      ["Tax Regime", profile.tax_regime.toUpperCase()],
    ];
    autoTable(doc, {
      startY: 115,
      head: [["Field", "Value"]],
      body: empRows,
      theme: "grid",
      headStyles: { fillColor: [230, 235, 245], textColor: 20 },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: 40, right: 40 },
    });

    const afterEmp = (doc as any).lastAutoTable.finalY + 16;

    const earnings: [string, string][] = [
      ["Basic", formatINR(m.basicMonthly)],
      ["HRA", formatINR(m.hraMonthly)],
      ["Special Allowance", formatINR(m.specialMonthly)],
      ["Other Allowance", formatINR(m.otherMonthly)],
      ["Gross Earnings", formatINR(m.grossMonthly)],
    ];
    const deductions: [string, string][] = [
      ["Provident Fund", formatINR(m.pfMonthly)],
      ["Professional Tax", formatINR(m.professionalTaxMonthly)],
      ["TDS (Income Tax)", formatINR(m.taxMonthly)],
      ["Other Deductions", formatINR(m.otherDeductionMonthly)],
      ["Total Deductions", formatINR(m.pfMonthly + m.professionalTaxMonthly + m.taxMonthly + m.otherDeductionMonthly)],
    ];

    autoTable(doc, {
      startY: afterEmp,
      head: [["Earnings", "Amount"]],
      body: earnings,
      theme: "striped",
      headStyles: { fillColor: [20, 120, 80], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 6 },
      margin: { left: 40, right: W / 2 + 10 },
      tableWidth: W / 2 - 50,
    });
    autoTable(doc, {
      startY: afterEmp,
      head: [["Deductions", "Amount"]],
      body: deductions,
      theme: "striped",
      headStyles: { fillColor: [160, 50, 50], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 6 },
      margin: { left: W / 2 + 10, right: 40 },
      tableWidth: W / 2 - 50,
    });

    const afterTables = Math.max(
      (doc as any).lastAutoTable.finalY,
      afterEmp + earnings.length * 22 + 30,
    ) + 16;

    doc.setFillColor(20, 33, 61);
    doc.rect(40, afterTables, W - 80, 36, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("Net Pay (Take Home)", 52, afterTables + 23);
    doc.text(formatINR(m.netMonthly), W - 52, afterTables + 23, { align: "right" });

    const sigY = afterTables + 110;
    doc.setDrawColor(80);
    doc.line(W - 220, sigY, W - 50, sigY);
    doc.setTextColor(40);
    doc.setFont("helvetica", "italic"); doc.setFontSize(11);
    const sigName = directorName.trim() || company?.name ? `${directorName.trim() || "Authorised Signatory"}` : "Director";
    doc.text(sigName, W - 135, sigY - 6, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("Director — Authorised Signatory", W - 135, sigY + 14, { align: "center" });

    doc.setFontSize(8); doc.setTextColor(110);
    doc.text("This is a system-generated salary slip. Figures are computed from the latest salary profile on record.", 40, sigY + 14, { maxWidth: W - 280 });

    doc.setFillColor(240, 243, 250);
    doc.rect(0, H - 38, W, 38, "F");
    doc.setTextColor(60);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(company?.name || "", 40, H - 22);
    doc.text(addrLine || "", 40, H - 10, { maxWidth: W - 200 });
    doc.text(`Generated ${new Date().toLocaleString()}`, W - 40, H - 14, { align: "right" });

    const fileName = `${sanitize(selectedEmp.display_name)}_${sanitize(selectedEmp.employee_code || selectedEmp.id.slice(0, 8))}_${MONTHS[month - 1]}_${year}_SalarySlip.pdf`;
    const blob = doc.output("blob");
    return { blob, fileName, emp: selectedEmp };
  };

  const handlePreview = async () => {
    setBusy(true);
    try {
      const built = await buildPdf();
      if (!built) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(built.blob);
      previewBlobRef.current = built.blob;
      previewFileNameRef.current = built.fileName;
      previewEmpRef.current = built.emp;
      previewMonthRef.current = month;
      previewYearRef.current = year;
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch (err: any) {
      toast.error("Could not build preview", { description: err?.message ?? "Try again" });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmUpload = async () => {
    const blob = previewBlobRef.current;
    const fileName = previewFileNameRef.current;
    const emp = previewEmpRef.current;
    const m = previewMonthRef.current;
    const y = previewYearRef.current;
    if (!blob || !emp || !emp.user_id) { toast.error("Preview not ready"); return; }
    setUploading(true);
    try {
      const path = `${companyId}/${emp.user_id}/payslip/${Date.now()}-${fileName}`;
      const up = await supabase.storage.from("employee-documents")
        .upload(path, blob, { contentType: "application/pdf", upsert: false });
      if (up.error) throw up.error;

      const me = (await supabase.auth.getUser()).data.user?.id;
      const ins = await (supabase as any).from("employee_documents").insert({
        company_id: companyId,
        employee_id: emp.id,
        user_id: emp.user_id,
        doc_type: "payslip",
        doc_year: y,
        doc_month: m,
        title: `Salary Slip — ${MONTHS[m - 1]} ${y}`,
        file_path: path,
        file_name: fileName,
        file_size: blob.size,
        mime_type: "application/pdf",
        uploaded_by: me,
        uploaded_by_name: uploaderName,
      });
      if (ins.error) {
        await supabase.storage.from("employee-documents").remove([path]);
        throw ins.error;
      }

      // Download a local copy as well
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName; a.click();
      URL.revokeObjectURL(a.href);

      const msg = `Monthly salary creation confirmed for employee: ${emp.display_name} (${emp.employee_code || "—"}) for ${MONTHS[m - 1]} ${y}.`;
      setLastConfirm(msg);
      toast.success(msg);
      setPreviewOpen(false);
    } catch (err: any) {
      toast.error("Could not upload salary slip", { description: err?.message ?? "Try again" });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadPreview = () => {
    const blob = previewBlobRef.current;
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = previewFileNameRef.current || "salary-slip.pdf";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Monthly Salary Slip — Create
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">Employee</label>
              <select value={empId} onChange={(e) => setEmpId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.display_name} {e.employee_code ? `(${e.employee_code})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">Month</label>
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {MONTHS.map((mn, i) => <option key={mn} value={i + 1}>{mn}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">Year</label>
                <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} min={2000} max={2100} />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold text-muted-foreground">Director / Authorised Signatory Name</label>
              <Input value={directorName} onChange={(e) => setDirectorName(e.target.value)}
                placeholder="e.g. Jane Doe (signed on the slip)" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handlePreview} disabled={busy || !empId}>
              <Eye className="h-4 w-4" />
              {busy ? "Preparing preview…" : "Preview salary slip"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Review the PDF first. Upload to the employee's documents happens only after you confirm.
            </p>
          </div>

          {lastConfirm && (
            <div className="flex items-start gap-2 rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{lastConfirm}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={(o) => { if (!uploading) setPreviewOpen(o); }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Salary slip preview
            </DialogTitle>
            <DialogDescription>
              {previewEmpRef.current
                ? `${previewEmpRef.current.display_name} • ${MONTHS[previewMonthRef.current - 1]} ${previewYearRef.current} • ${previewFileNameRef.current}`
                : "Review before uploading"}
            </DialogDescription>
          </DialogHeader>
          <div className="h-[70vh] w-full overflow-hidden rounded-md border bg-muted">
            {previewUrl && (
              <iframe src={previewUrl} title="Salary slip preview" className="h-full w-full" />
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleDownloadPreview} disabled={uploading}>
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpload} disabled={uploading}>
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Confirm & upload to employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
