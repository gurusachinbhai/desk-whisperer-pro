import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Users, TrendingUp, Mail, Workflow, PhoneCall, BarChart3, CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/product-crm.jpg";

const features = [
  { icon: Users, title: "360° customer profiles", desc: "Every conversation, deal and ticket — beautifully consolidated against each contact." },
  { icon: Workflow, title: "Visual sales pipeline", desc: "Drag-and-drop deals across stages. Forecast revenue with confidence." },
  { icon: Mail, title: "Email & WhatsApp built-in", desc: "Send, track and template communications without leaving the CRM." },
  { icon: PhoneCall, title: "Call logging & recording", desc: "Click-to-call, auto-log and review conversations to coach your team." },
  { icon: TrendingUp, title: "Lead scoring & automation", desc: "Route hot leads instantly, nurture cold ones automatically." },
  { icon: BarChart3, title: "Revenue dashboards", desc: "Pipeline value, win-rates and rep performance — live and visual." },
];

const benefits = [
  "Close deals 35% faster with a unified pipeline",
  "Never lose a lead — every touchpoint captured automatically",
  "Sales, marketing and support on the same customer record",
  "Native integration with HR Greatly Payroll & Attendance",
];

const CRM = () => (
  <PageLayout
    eyebrow="CRM Application"
    title="Customer relationships, simplified"
    subtitle="From first hello to long-term loyalty — manage leads, deals and customer journeys in one elegant workspace."
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
      <h2 className="text-3xl font-extrabold tracking-tight">Why teams switch to HR Greatly CRM</h2>
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
          <Link to="/contact">Talk to sales</Link>
        </Button>
      </div>
    </div>
  </PageLayout>
);

export default CRM;
