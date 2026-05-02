import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";

const plans = [
  {
    name: "Starter",
    price: "$3",
    period: "per employee / month",
    desc: "Everything growing teams need to run HR with calm.",
    features: ["Attendance & shifts", "Leave management", "Payslip access", "Mobile + web apps", "Email support"],
    cta: "Start free trial",
    href: "/login?mode=signup",
  },
  {
    name: "Growth",
    price: "$5",
    period: "per employee / month",
    desc: "For scaling teams that need automation and analytics.",
    features: ["Everything in Starter", "Desk & room booking", "Approval workflows", "Advanced reports", "Priority support"],
    cta: "Start free trial",
    href: "/login?mode=signup",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "tailored to your team",
    desc: "Built for global scale, security and compliance.",
    features: ["Everything in Growth", "SSO & SAML", "Dedicated CSM", "Custom integrations", "99.9% SLA"],
    cta: "Talk to sales",
    href: "/contact",
  },
];

const Plans = () => (
  <PageLayout
    eyebrow="Pricing · Plans"
    title="Simple, transparent pricing"
    subtitle="Pay only for active employees. No hidden fees, no per-module pricing. Cancel anytime."
  >
    <div className="grid gap-6 lg:grid-cols-3">
      {plans.map((p) => (
        <div
          key={p.name}
          className={`relative rounded-2xl border bg-card p-7 shadow-sm ${
            p.featured ? "border-primary shadow-lg ring-2 ring-primary/30" : "border-border/60"
          }`}
        >
          {p.featured && (
            <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-foreground">
              <Sparkles className="h-3 w-3" /> Most popular
            </span>
          )}
          <h3 className="text-2xl font-extrabold">{p.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
          <div className="mt-5">
            <span className="text-4xl font-extrabold">{p.price}</span>
            <span className="ml-2 text-sm text-muted-foreground">{p.period}</span>
          </div>
          <ul className="mt-6 space-y-2">
            {p.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button asChild className="mt-6 w-full" variant={p.featured ? "default" : "outline"}>
            <Link to={p.href}>{p.cta}</Link>
          </Button>
        </div>
      ))}
    </div>
  </PageLayout>
);

export default Plans;
