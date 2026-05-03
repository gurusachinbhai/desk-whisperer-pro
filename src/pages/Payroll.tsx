import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Calculator, FileCheck2, ShieldCheck, Banknote, Receipt, Globe2, CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/product-payroll.jpg";

const features = [
  { icon: Calculator, title: "One-click payroll runs", desc: "Salaries, bonuses, deductions and reimbursements — calculated and approved in minutes." },
  { icon: Receipt, title: "Automated payslips", desc: "Branded, multi-currency payslips delivered straight to every employee's inbox." },
  { icon: ShieldCheck, title: "Tax & compliance built-in", desc: "TDS, PF, ESI, PT and country-specific filings handled — always up to date." },
  { icon: Banknote, title: "Direct bank disbursement", desc: "Generate bank-ready files or pay directly via integrated payment partners." },
  { icon: FileCheck2, title: "Audit-ready reports", desc: "Every component, every cycle — exportable, traceable, board-ready." },
  { icon: Globe2, title: "Multi-country support", desc: "Run payroll across India, Singapore, USA, UK, Canada and Europe from one place." },
];

const benefits = [
  "Cut payroll processing time by up to 80%",
  "Zero spreadsheet errors with automated calculations",
  "Stay 100% compliant with evolving tax laws",
  "Employees self-serve payslips, Form 16 and tax declarations",
];

const Payroll = () => (
  <PageLayout
    eyebrow="HR Payroll Application"
    title="Payroll without panic"
    subtitle="Accurate, compliant, employee-loved payroll — every cycle, every country. Run it in minutes, not days."
    heroImage={heroImg}
    maxWidth="xl"
  >
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f) => (
        <div key={f.title} className="rounded-2xl border border-border/70 bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <f.icon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-primary">{f.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
        </div>
      ))}
    </div>

    <div className="mt-16 rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 to-secondary/10 p-8 sm:p-12">
      <h2 className="text-3xl font-extrabold tracking-tight">Why finance & HR teams switch</h2>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="gap-2">
          <Link to="/login?mode=signup">Start free trial <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/contact">Talk to payroll expert</Link>
        </Button>
      </div>
    </div>
  </PageLayout>
);

export default Payroll;
