import { Link } from "react-router-dom";
import { Check, Clock, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";

const FreeTrial = () => (
  <PageLayout
    eyebrow="Pricing · Free Trial"
    title="15 days free. Everything unlocked."
    subtitle="No credit card. No commitments. Bring your whole team and explore every module of HR Greatly."
    heroImage="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80"
  >
    <div className="grid gap-6 sm:grid-cols-3">
      {[
        { icon: Clock, title: "15 full days", desc: "More than enough time to run a payroll cycle and see the magic." },
        { icon: ShieldCheck, title: "No card required", desc: "Sign up with email. We'll never auto-charge you." },
        { icon: Zap, title: "All features unlocked", desc: "Attendance, leave, payroll, booking, reports — try it all." },
      ].map((b) => (
        <div key={b.title} className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <b.icon className="h-7 w-7 text-primary" />
          <h3 className="mt-3 text-lg font-bold">{b.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
        </div>
      ))}
    </div>

    <div className="mt-12 rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
      <h2 className="text-2xl font-extrabold text-primary">What's included in your trial</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          "Unlimited employees during trial",
          "Attendance & shifts",
          "Leave management & policies",
          "Payslip uploads & access",
          "Desk & room booking",
          "Reports & dashboards",
          "Mobile + web apps",
          "Email support",
        ].map((f) => (
          <div key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 text-primary" />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-br from-primary/10 via-muted/30 to-secondary/10 p-10 text-center">
      <h2 className="text-3xl font-extrabold tracking-tight text-primary">Ready to start?</h2>
      <p className="max-w-xl text-muted-foreground">
        Spin up your company in under 5 minutes. Invite your team. Run HR greatly.
      </p>
      <Button asChild size="lg">
        <Link to="/login?mode=signup">Start your free trial</Link>
      </Button>
    </div>
  </PageLayout>
);

export default FreeTrial;
