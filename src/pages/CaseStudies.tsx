import { Link } from "react-router-dom";
import { TrendingUp, Clock, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";

const studies = [
  {
    company: "Northwind Logistics",
    industry: "Logistics · 2,400 employees",
    challenge:
      "Northwind ran payroll across 14 warehouses on a patchwork of spreadsheets. Cycles took 5 days and errors were common.",
    solution:
      "After moving to HR Greatly, attendance was unified, payslips automated, and exceptions handled by one HR team across all sites.",
    results: [
      { icon: Clock, value: "92%", label: "Faster payroll cycles" },
      { icon: TrendingUp, value: "$240K", label: "Annual savings" },
      { icon: Users, value: "98%", label: "Employee satisfaction" },
    ],
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    company: "Globex FinTech",
    industry: "Fintech · 1,200 employees",
    challenge:
      "Hybrid work created chaos: nobody knew who was in the office, desks went unused, and meeting rooms were double-booked.",
    solution:
      "HR Greatly's booking module gave Globex a real-time office map. Employees book seats and rooms in seconds; managers get utilization analytics.",
    results: [
      { icon: TrendingUp, value: "3x", label: "Office utilization" },
      { icon: Clock, value: "0", label: "Double bookings" },
      { icon: Users, value: "85%", label: "Employees prefer hybrid now" },
    ],
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  },
  {
    company: "Umbrella Healthcare",
    industry: "Healthcare · 12,000 employees",
    challenge:
      "Compliance reporting across 6 countries took weeks of manual work. Audits were stressful and error-prone.",
    solution:
      "HR Greatly's reporting module generated audit-ready compliance packs in minutes. Geography-specific policies are configured once, applied everywhere.",
    results: [
      { icon: Clock, value: "95%", label: "Less reporting time" },
      { icon: TrendingUp, value: "100%", label: "Audit pass rate" },
      { icon: Users, value: "6", label: "Countries unified" },
    ],
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
  },
];

const CaseStudies = () => (
  <PageLayout
    eyebrow="Case Studies"
    title="Real customers. Real results."
    subtitle="See how teams of every size and industry transformed HR with HR Greatly."
  >
    <div className="space-y-12">
      {studies.map((s) => (
        <article key={s.company} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
          <div className="grid lg:grid-cols-2">
            <img src={s.image} alt={s.company} className="h-64 w-full object-cover lg:h-full" loading="lazy" />
            <div className="p-7 sm:p-9">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{s.industry}</p>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{s.company}</h2>

              <div className="mt-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">The challenge</h3>
                <p className="mt-1 text-sm leading-relaxed">{s.challenge}</p>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">The solution</h3>
                <p className="mt-1 text-sm leading-relaxed">{s.solution}</p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {s.results.map((r) => (
                  <div key={r.label} className="rounded-lg border border-border/60 bg-muted/40 p-3 text-center">
                    <r.icon className="mx-auto h-5 w-5 text-primary" />
                    <p className="mt-1 text-xl font-extrabold">{r.value}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground">{r.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>

    <div className="mt-14 flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-br from-primary/10 via-muted/30 to-secondary/10 p-10 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight text-primary">Want to be our next success story?</h2>
      <Button asChild size="lg" className="gap-2">
        <Link to="/login?mode=signup">Start your free trial <ArrowRight className="h-4 w-4" /></Link>
      </Button>
    </div>
  </PageLayout>
);

export default CaseStudies;
