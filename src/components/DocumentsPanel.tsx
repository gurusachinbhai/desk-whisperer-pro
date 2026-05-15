import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, FileText, Receipt, Calculator, FileBadge, Folder } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeAnnualTax, computeMonthlySalary, formatINR, type SalaryProfile, type TaxRegime } from "@/lib/tax-calc";

export type EmployeeDocument = {
  id: string;
  doc_type: "payslip" | "itr" | "tax_forecast" | "salary_breakdown" | "other";
  doc_year: number | null;
  doc_month: number | null;
  title: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by_name: string | null;
  created_at: string;
};

type Props = {
  meEmployeeId: string | null;
  meUserId: string | null;
  companyId: string | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CATEGORIES: Array<{ key: EmployeeDocument["doc_type"]; label: string; icon: typeof Receipt; tint: string }> = [
  { key: "payslip", label: "Payslips", icon: Receipt, tint: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { key: "itr", label: "ITR Forms", icon: FileBadge, tint: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { key: "tax_forecast", label: "Tax Forecasts", icon: Calculator, tint: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  { key: "salary_breakdown", label: "Salary Breakdowns", icon: FileText, tint: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  { key: "other", label: "Others", icon: Folder, tint: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
];

const DocBadge = ({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "primary" | "warn" }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
      tone === "primary"
        ? "bg-primary/10 text-primary"
        : tone === "warn"
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
          : "bg-muted text-muted-foreground"
    }`}
  >
    {children}
  </span>
);

export default function DocumentsPanel({ meEmployeeId, meUserId, companyId }: Props) {
  const [docs, setDocs] = useState<EmployeeDocument[]>([]);
  const [salary, setSalary] = useState<SalaryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState<string>(String(currentYear));
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!meUserId) {
      setDocs([]);
      setSalary(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [docsRes, salaryRes] = await Promise.all([
        (supabase as any)
          .from("employee_documents")
          .select("*")
          .eq("user_id", meUserId)
          .order("doc_year", { ascending: false })
          .order("doc_month", { ascending: false })
          .order("created_at", { ascending: false }),
        (supabase as any).from("salary_profiles").select("*").eq("user_id", meUserId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (!docsRes.error) setDocs((docsRes.data ?? []) as EmployeeDocument[]);
      if (!salaryRes.error && salaryRes.data) setSalary(salaryRes.data as unknown as SalaryProfile);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [meUserId]);

  const handleDownload = async (doc: EmployeeDocument) => {
    const { data, error } = await supabase.storage
      .from("employee-documents")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Download failed", { description: error?.message ?? "Try again" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const filtered = useMemo(() => {
    return docs.filter(
      (d) =>
        (typeFilter === "all" || d.doc_type === typeFilter) &&
        (yearFilter === "all" || String(d.doc_year ?? "") === yearFilter),
    );
  }, [docs, typeFilter, yearFilter]);

  const groupedByMonth = useMemo(() => {
    if (typeFilter !== "payslip") return null;
    const map = new Map<number, EmployeeDocument[]>();
    filtered.forEach((d) => {
      const m = d.doc_month ?? 0;
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(d);
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [filtered, typeFilter]);

  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    docs.forEach((d) => d.doc_year && set.add(d.doc_year));
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [docs, currentYear]);

  const grossAnnual = salary
    ? salary.basic + salary.hra + salary.special_allowance + salary.other_allowance
    : 0;
  const tax = salary ? computeAnnualTax(grossAnnual, (salary.tax_regime as TaxRegime) ?? "new") : null;
  const monthly = salary && tax ? computeMonthlySalary(salary, tax) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Folder className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Documents</p>
            <h2 className="font-display text-xl font-extrabold">My documents & finances</h2>
          </div>
        </div>
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          Payslips, ITR forms, tax forecasts and salary breakdowns uploaded for you by your admin. Filter by year and type.
        </p>
      </div>

      {/* Salary calculation + Tax forecast */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Salary calculation</p>
              <h3 className="font-display text-lg font-extrabold">Monthly breakdown</h3>
            </div>
          </div>
          {!salary ? (
            <p className="mt-4 rounded-2xl bg-surface-muted p-3 text-xs font-semibold text-muted-foreground">
              Your admin has not set up your salary structure yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-1.5 text-sm">
              <Row label="Annual CTC" value={formatINR(salary.annual_ctc)} bold />
              <Row label="Basic" value={formatINR(monthly!.basicMonthly) + " / mo"} />
              <Row label="HRA" value={formatINR(monthly!.hraMonthly) + " / mo"} />
              <Row label="Special allowance" value={formatINR(monthly!.specialMonthly) + " / mo"} />
              <Row label="Other allowance" value={formatINR(monthly!.otherMonthly) + " / mo"} />
              <Row label="Gross monthly" value={formatINR(monthly!.grossMonthly)} bold />
              <Row label="− PF" value={"− " + formatINR(monthly!.pfMonthly)} />
              <Row label="− Professional tax" value={"− " + formatINR(monthly!.professionalTaxMonthly)} />
              <Row label="− Other deductions" value={"− " + formatINR(monthly!.otherDeductionMonthly)} />
              <Row label="− Income tax" value={"− " + formatINR(monthly!.taxMonthly)} />
              <Row label="Net take-home" value={formatINR(monthly!.netMonthly)} bold accent />
            </ul>
          )}
        </div>

        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tax forecast · FY {currentYear}-{(currentYear + 1).toString().slice(-2)}</p>
              <h3 className="font-display text-lg font-extrabold">Estimated income tax</h3>
            </div>
          </div>
          {!tax ? (
            <p className="mt-4 rounded-2xl bg-surface-muted p-3 text-xs font-semibold text-muted-foreground">
              Tax forecast appears once your salary structure is configured.
            </p>
          ) : (
            <ul className="mt-4 space-y-1.5 text-sm">
              <Row label="Regime" value={tax.regime === "new" ? "New regime" : "Old regime"} />
              <Row label="Gross annual" value={formatINR(grossAnnual)} />
              <Row label="Taxable income" value={formatINR(tax.taxableIncome)} />
              <Row label="Slab tax" value={formatINR(tax.baseTax)} />
              <Row label="Health & education cess (4%)" value={formatINR(tax.cess)} />
              <Row label="Total annual tax" value={formatINR(tax.totalTax)} bold />
              <Row label="Monthly TDS estimate" value={formatINR(tax.monthlyTax)} accent bold />
              <Row label="Effective tax rate" value={`${tax.effectiveRate}%`} />
            </ul>
          )}
          <p className="mt-3 text-[10px] font-semibold text-muted-foreground">
            Forecast only — actual TDS depends on Form 16 and declared investments.
          </p>
        </div>
      </div>

      {/* Document categories */}
      <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Documents</p>
            <h3 className="font-display text-lg font-extrabold">Browse by category</h3>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {CATEGORIES.map((c) => {
            const count = docs.filter((d) => d.doc_type === c.key).length;
            const Icon = c.icon;
            const isActive = activeCategory === c.key;
            return (
              <div
                key={c.key}
                className={`flex items-center justify-between gap-3 rounded-2xl border bg-surface-muted p-4 transition ${
                  isActive ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${c.tint}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-extrabold">{c.label}</p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {count} {count === 1 ? "file" : "files"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveCategory(isActive ? null : c.key);
                    setTypeFilter(c.key);
                  }}
                  className="focus-premium shrink-0 text-xs font-extrabold text-primary hover:underline"
                >
                  {isActive ? "Hide" : "View All"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active category list */}
      {activeCategory && (
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {CATEGORIES.find((c) => c.key === activeCategory)?.label}
              </p>
              <h3 className="font-display text-lg font-extrabold">Download centre</h3>
            </div>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="h-9 w-[110px] rounded-xl text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="mt-4 rounded-2xl bg-surface-muted p-3 text-xs font-semibold text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-surface-muted p-3 text-xs font-semibold text-muted-foreground">
              No documents in this view yet.
            </p>
          ) : groupedByMonth ? (
            <div className="mt-4 space-y-4">
              {groupedByMonth.map(([month, items]) => (
                <div key={month}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {month >= 1 && month <= 12 ? MONTHS[month - 1] : "Unspecified month"}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {items.map((d) => (
                      <DocItem key={d.id} doc={d} onDownload={() => handleDownload(d)} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {filtered.map((d) => (
                <DocItem key={d.id} doc={d} onDownload={() => handleDownload(d)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

const Row = ({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) => (
  <li className={`flex items-center justify-between gap-3 rounded-xl px-1 py-0.5 ${bold ? "font-extrabold" : "font-semibold"}`}>
    <span className="text-muted-foreground">{label}</span>
    <span className={accent ? "text-primary" : ""}>{value}</span>
  </li>
);

const DocItem = ({ doc, onDownload }: { doc: EmployeeDocument; onDownload: () => void }) => {
  const ICONS = { payslip: Receipt, itr: FileBadge, tax_forecast: Calculator, salary_breakdown: FileText, other: FileText } as const;
  const Icon = ICONS[doc.doc_type] ?? FileText;
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-extrabold">{doc.title}</p>
          <p className="truncate text-[11px] font-semibold text-muted-foreground">
            {doc.file_name}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            <DocBadge tone="primary">{doc.doc_type.replace("_", " ")}</DocBadge>
            {doc.doc_year && (
              <DocBadge>{doc.doc_month ? `${MONTHS[(doc.doc_month - 1) as number]} ` : ""}{doc.doc_year}</DocBadge>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onDownload}
        className="focus-premium flex shrink-0 items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
      >
        <Download className="h-4 w-4" /> Download
      </button>
    </li>
  );
};
