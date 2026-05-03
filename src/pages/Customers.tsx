import { Building2, Users, Globe2, Quote, LifeBuoy, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";

const customers = [
  { name: "Northwind Logistics", industry: "Logistics", employees: "2,400+", quote: "HR Greatly cut our payroll cycle from 5 days to 4 hours.", person: "Anita R., Head of People" },
  { name: "Acme Corp", industry: "Manufacturing", employees: "5,000+", quote: "Attendance disputes dropped 80% in the first quarter.", person: "Marcus L., HR Director" },
  { name: "Globex", industry: "FinTech", employees: "1,200+", quote: "Our employees finally love opening an HR app.", person: "Priya S., CHRO" },
  { name: "Initech", industry: "SaaS", employees: "800+", quote: "Onboarding 50 engineers in a week — flawless.", person: "Daniel K., COO" },
  { name: "Umbrella Group", industry: "Healthcare", employees: "12,000+", quote: "Compliance reporting that used to take weeks now takes minutes.", person: "Lara T., VP HR" },
  { name: "Hooli", industry: "Tech", employees: "3,500+", quote: "The booking module transformed our hybrid office.", person: "Ravi M., Workplace Lead" },
];

const Customers = () => (
  <PageLayout
    eyebrow="Our Customers"
    title="Teams who trust HR Greatly"
    subtitle="From scrappy startups to global enterprises — thousands of teams in 25+ countries run their people operations on HR Greatly."
    heroImage="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80"
  >
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        { icon: Building2, value: "20,000+", label: "Companies" },
        { icon: Users, value: "2M+", label: "Active employees" },
        { icon: Globe2, value: "25+", label: "Countries served" },
      ].map((s) => (
        <div key={s.label} className="rounded-xl border border-border/60 bg-card p-6 text-center shadow-sm">
          <s.icon className="mx-auto h-8 w-8 text-primary" />
          <p className="mt-3 text-3xl font-extrabold">{s.value}</p>
          <p className="text-sm text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>

    <h2 className="mt-16 text-3xl font-extrabold tracking-tight text-primary">What our customers say</h2>
    <div className="mt-8 grid gap-6 sm:grid-cols-2">
      {customers.map((c) => (
        <div key={c.name} className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <Quote className="h-6 w-6 text-primary/60" />
          <p className="mt-3 text-base leading-relaxed text-foreground/90">"{c.quote}"</p>
          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="font-bold">{c.name}</p>
            <p className="text-xs text-muted-foreground">
              {c.industry} · {c.employees} employees · {c.person}
            </p>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-16 grid gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
        <LifeBuoy className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-lg font-extrabold">Customer Help & Support</h3>
        <p className="text-sm text-muted-foreground">
          Browse FAQs, contact our team, or raise a ticket and track it end-to-end.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/help">Help center</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/tickets"><Ticket className="mr-2 h-4 w-4" /> Tickets</Link>
        </Button>
      </div>
    </div>
  </PageLayout>
);

export default Customers;
