import { Link } from "react-router-dom";
import { Building2, Globe2, ShieldCheck, Headphones, Workflow, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";

const features = [
  { icon: ShieldCheck, title: "Enterprise-grade security", desc: "SOC 2, ISO 27001, GDPR. Encryption at rest and in transit." },
  { icon: Lock, title: "SSO & SAML", desc: "SAML, Okta, Azure AD, Google Workspace — single sign-on built in." },
  { icon: Workflow, title: "Custom workflows", desc: "Configure approval chains, policies, and rules per geography." },
  { icon: Globe2, title: "Global payroll-ready", desc: "Multi-currency, multi-entity, multi-language across 25+ countries." },
  { icon: Headphones, title: "Dedicated CSM", desc: "A named customer success manager and 24/7 priority support." },
  { icon: Building2, title: "99.9% uptime SLA", desc: "Business-critical infrastructure with guaranteed availability." },
];

const Enterprise = () => (
  <PageLayout
    eyebrow="Pricing · Enterprise"
    title="Built for scale"
    subtitle="HR Greatly Enterprise gives global companies the security, compliance and control they need — without sacrificing the experience employees love."
    heroImage="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80"
  >
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f) => (
        <div key={f.title} className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <f.icon className="h-8 w-8 text-primary" />
          <h3 className="mt-3 text-lg font-bold">{f.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
        </div>
      ))}
    </div>

    <div className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-muted/30 to-secondary/10 p-10 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight text-primary">Let's design a plan that fits.</h2>
      <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
        Tell us about your team, geographies and goals. We'll build a tailored proposal within 48 hours.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link to="/contact">Talk to sales</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href="mailto:Support@hrgreatly.com?subject=Enterprise%20Enquiry">Email Support@hrgreatly.com</a>
        </Button>
      </div>
    </div>
  </PageLayout>
);

export default Enterprise;
