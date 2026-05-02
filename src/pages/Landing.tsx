import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Plane,
  FileText,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import hrgreatlyLogo from "@/assets/hrgreatly-logo.png";

const features = [
  { icon: Clock, title: "Attendance", desc: "Sign-in, sign-out and shift tracking with regularization built in." },
  { icon: Plane, title: "Leave", desc: "Casual, sick, earned and unpaid leave — request, approve, done." },
  { icon: FileText, title: "Payroll", desc: "Run payroll, share payslips and stay tax-ready every cycle." },
  { icon: CalendarCheck, title: "Booking", desc: "Reserve desks, rooms and shifts across floors and areas." },
  { icon: BarChart3, title: "Admin", desc: "Org setup, employee invites and policies from a single console." },
  { icon: ShieldCheck, title: "Reports", desc: "Live dashboards for attendance, leave balance and headcount." },
];

const steps = [
  { n: "01", title: "Set up your org", desc: "Create your company, floors and areas in under five minutes." },
  { n: "02", title: "Invite your team", desc: "Send branded invites — your people sign in and get going." },
  { n: "03", title: "Run HR, end-to-end", desc: "Attendance, leave and payroll move on autopilot from day one." },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <img src={hrgreatlyLogo} alt="HR Greatly" className="h-8 w-auto" />
            <span className="text-base font-semibold tracking-tight">HR Greatly</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#testimonial" className="hover:text-foreground transition-colors">Customers</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/login?mode=signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Modern HR for growing teams
            </span>

            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Run your entire HR — attendance, leave, payroll —{" "}
              <span className="text-primary">from one calm place.</span>
            </h1>

            <p className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl">
              HR Greatly brings every people-process into a single, beautifully simple workspace —
              so HR teams stop juggling spreadsheets and start doing their best work.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link to="/login?mode=signup">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="mailto:hello@hrgreatly.com?subject=Book%20a%20demo">Book a demo</a>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · Free for the first 10 employees
            </p>
          </div>

          {/* Mock dashboard preview */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="rounded-2xl border border-border/70 bg-card p-2 shadow-2xl shadow-primary/10">
              <div className="rounded-xl bg-gradient-to-br from-muted/50 to-background p-6 sm:p-10">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    { label: "Present today", value: "184", sub: "of 200" },
                    { label: "On leave", value: "9", sub: "this week" },
                    { label: "Payroll cycle", value: "Ready", sub: "Apr 2026" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-border/60 bg-card p-5">
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight">{s.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Trusted by people teams at
          </p>
          <div className="mt-6 grid grid-cols-2 items-center gap-8 sm:grid-cols-3 lg:grid-cols-6">
            {["Northwind", "Acme Corp", "Globex", "Initech", "Umbrella", "Soylent"].map((name) => (
              <div
                key={name}
                className="text-center text-base font-semibold tracking-tight text-muted-foreground/70"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything HR. Nothing extra.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Six tightly-integrated modules that replace a dozen disconnected tools.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border/70 bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Live in three steps
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From signup to your first payroll run — in an afternoon.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-xl border border-border/70 bg-card p-7">
                <span className="text-sm font-semibold text-primary">{s.n}</span>
                <h3 className="mt-3 text-xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                <CheckCircle2 className="absolute right-6 top-6 h-5 w-5 text-primary/40" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section id="testimonial" className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="rounded-2xl border border-border/70 bg-card p-8 sm:p-12">
          <Quote className="h-8 w-8 text-primary/60" />
          <blockquote className="mt-6 text-xl font-medium leading-relaxed tracking-tight sm:text-2xl">
            “We replaced four different tools with HR Greatly. Our HR ops team
            got their Fridays back, and our employees actually <em>like</em>{" "}
            checking in now.”
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              KR
            </div>
            <div>
              <p className="text-sm font-semibold">Kavita R.</p>
              <p className="text-xs text-muted-foreground">Head of People, Northwind</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-card to-card p-10 sm:p-14">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Ready to make HR feel calm?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Start free today. Bring your whole team along when you're ready.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/login?mode=signup">
                    Get started free <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <img src={hrgreatlyLogo} alt="HR Greatly" className="h-7 w-auto" />
              <span className="text-sm font-semibold">HR Greatly</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Run your entire HR from one calm place.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#how" className="hover:text-foreground">How it works</a></li>
              <li><Link to="/login" className="hover:text-foreground">Sign in</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="mailto:hello@hrgreatly.com" className="hover:text-foreground">Contact</a></li>
              <li><a href="#testimonial" className="hover:text-foreground">Customers</a></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">Privacy</a></li>
              <li><a href="#" className="hover:text-foreground">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} HR Greatly. All rights reserved.</p>
            <p>Made with care for people teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
