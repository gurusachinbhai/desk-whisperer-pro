import { Link } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Quote,
  LifeBuoy,
  MapPin,
  LogIn,
  Globe2,
  Building2,
  Users,
  PlayCircle,
  Megaphone,
  ChevronDown,
  Sparkles,
  Menu,
  Cloud,
  Rocket,
  Briefcase,
  Cpu,
  Leaf,
  Flame,
  Anchor,
  Zap,
  Star,
  Shield,
  Globe,
  Feather,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import hrgreatlyLogo from "@/assets/hrgreatly-logo.png";
import featAttendance from "@/assets/feat-attendance.png";
import featLeave from "@/assets/feat-leave.png";
import featPayroll from "@/assets/feat-payroll.png";
import featBooking from "@/assets/feat-booking.png";
import featAdmin from "@/assets/feat-admin.png";
import featReports from "@/assets/feat-reports.png";

const features = [
  {
    img: featAttendance,
    title: "Attendance that thinks for itself",
    desc: "Smart sign-in, geo-fencing and shift intelligence — so your team focuses on work, not timesheets.",
  },
  {
    img: featLeave,
    title: "Leave, made effortless",
    desc: "One-tap requests, instant approvals and a balance everyone can trust. No spreadsheets, no surprises.",
  },
  {
    img: featPayroll,
    title: "Payroll without panic",
    desc: "Run accurate, tax-ready payroll in minutes. Payslips delivered, compliance handled, every cycle.",
  },
  {
    img: featBooking,
    title: "Desks & rooms, on demand",
    desc: "Book the right space at the right time. Hybrid teams thrive when the office works around them.",
  },
  {
    img: featAdmin,
    title: "Admin you'll actually love",
    desc: "Org setup, policies and onboarding from one calm console. Built for clarity, designed for scale.",
  },
  {
    img: featReports,
    title: "Insights that move the needle",
    desc: "Live dashboards, headcount trends and predictive signals — so leadership decides with confidence.",
  },
];

const steps = [
  { n: "01", title: "Set up in minutes", desc: "Spin up your company, floors and policies — guided, fast, fuss-free." },
  { n: "02", title: "Invite your people", desc: "Branded invites land in inboxes. Your team logs in and gets going on day one." },
  { n: "03", title: "Run HR on autopilot", desc: "Attendance, leave and payroll quietly handle themselves. You handle the big picture." },
];

const stats = [
  { icon: Globe2, value: "25+", label: "Countries" },
  { icon: Building2, value: "20,000+", label: "Companies" },
  { icon: Users, value: "2M+", label: "Active Users" },
];

const countries = ["India", "Singapore", "USA", "Canada", "UK", "Europe"];

const navMenus: { label: string; items: { title: string; desc: string; href: string }[] }[] = [
  {
    label: "About us",
    items: [
      { title: "Our Story", desc: "Why we built HR Greatly", href: "#about" },
      { title: "Customers", desc: "Teams who trust us", href: "#testimonial" },
      { title: "Careers", desc: "Join our mission", href: "#careers" },
      { title: "Contact Us", desc: "Get in touch", href: "mailto:hello@hrgreatly.com" },
    ],
  },
  {
    label: "Pricing",
    items: [
      { title: "Plans", desc: "Simple, transparent pricing", href: "#pricing" },
      { title: "Free Trial", desc: "15 days, full access", href: "/login?mode=signup" },
      { title: "Enterprise", desc: "Built for scale", href: "#pricing" },
    ],
  },
  {
    label: "Blogs",
    items: [
      { title: "Latest Articles", desc: "Fresh HR insights", href: "#blogs" },
      { title: "Guides", desc: "Step-by-step playbooks", href: "#blogs" },
      { title: "Case Studies", desc: "Real customer stories", href: "#blogs" },
    ],
  },
  {
    label: "Partners",
    items: [
      { title: "Become a Partner", desc: "Grow with HR Greatly", href: "#partners" },
      { title: "Integrations", desc: "Tools that play nice", href: "#partners" },
      { title: "Resellers", desc: "Channel programme", href: "#partners" },
    ],
  },
  {
    label: "Product",
    items: [
      { title: "Features", desc: "Everything in the box", href: "#features" },
      { title: "How it works", desc: "From signup to payroll", href: "#how" },
      { title: "Watch demo", desc: "2-minute walkthrough", href: "#video" },
    ],
  },
];

const trustedCompanies = [
  { name: "Northwind", icon: Cloud },
  { name: "Acme Corp", icon: Rocket },
  { name: "Globex", icon: Globe },
  { name: "Initech", icon: Cpu },
  { name: "Umbrella", icon: Shield },
  { name: "Soylent", icon: Leaf },
  { name: "Hooli", icon: Star },
  { name: "Pied Piper", icon: Feather },
  { name: "Stark Inc.", icon: Zap },
  { name: "Wayne Co.", icon: Anchor },
  { name: "Vandelay", icon: Briefcase },
  { name: "Massive Dyn.", icon: Flame },
];

const Landing = () => {
  const [country, setCountry] = useState("India");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* News & Offers ticker bar */}
      <div className="bg-gradient-to-r from-primary via-secondary to-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 text-xs sm:text-sm sm:px-6 lg:px-8">
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 font-semibold uppercase tracking-wider">
            <Megaphone className="h-3.5 w-3.5" />
            News & Offers
          </span>
          <p className="truncate">
            🎉 New: AI-powered payroll insights are live · Save 25% on annual plans this month · Free onboarding for teams under 50
          </p>
        </div>
      </div>

      {/* Utility top bar */}
      <div className="hidden border-b border-border/60 bg-muted/40 text-xs text-muted-foreground md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-end gap-6 px-4 sm:px-6 lg:px-8">
          <a href="mailto:support@hrgreatly.com" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <LifeBuoy className="h-3.5 w-3.5" />
            Support
          </a>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 outline-none transition-colors hover:text-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {country}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {countries.map((c) => (
                <DropdownMenuItem key={c} onClick={() => setCountry(c)}>
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/login" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <LogIn className="h-3.5 w-3.5" />
            Login
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex min-h-[120px] max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:min-h-[140px] sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={hrgreatlyLogo}
              alt="HR Greatly"
              className="h-[88px] w-auto sm:h-[112px] lg:h-[140px]"
            />
            <span className="hidden text-3xl font-extrabold tracking-tight text-primary sm:inline lg:text-4xl">
              HR Greatly
            </span>
          </Link>

          {/* Desktop nav with dropdowns */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navMenus.map((m) => (
              <DropdownMenu key={m.label}>
                <DropdownMenuTrigger className="group inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-bold text-foreground outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
                  {m.label}
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[260px] p-2">
                  {m.items.map((it) => (
                    <DropdownMenuItem key={it.title} asChild className="cursor-pointer rounded-md p-3 focus:bg-primary/10">
                      <a href={it.href} className="flex flex-col items-start gap-0.5">
                        <span className="text-sm font-semibold text-foreground">{it.title}</span>
                        <span className="text-xs text-muted-foreground">{it.desc}</span>
                      </a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex lg:hidden">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/login?mode=signup">Start free trial</Link>
            </Button>

            {/* Mobile / tablet menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[88vw] max-w-sm overflow-y-auto">
                <div className="mt-6 flex items-center gap-2">
                  <img src={hrgreatlyLogo} alt="HR Greatly" className="h-12 w-auto" />
                  <span className="text-xl font-extrabold text-primary">HR Greatly</span>
                </div>
                <nav className="mt-8 flex flex-col gap-1">
                  {navMenus.map((m) => (
                    <details key={m.label} className="group rounded-md border border-border/60">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-sm font-bold text-foreground">
                        {m.label}
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="flex flex-col border-t border-border/60 bg-muted/30 px-3 py-2">
                        {m.items.map((it) => (
                          <a
                            key={it.title}
                            href={it.href}
                            className="rounded px-2 py-2 text-sm font-medium text-foreground/80 hover:bg-primary/10 hover:text-primary"
                          >
                            {it.title}
                          </a>
                        ))}
                      </div>
                    </details>
                  ))}
                </nav>
                <div className="mt-6 flex flex-col gap-2">
                  <Button asChild variant="outline">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/login?mode=signup">Start free trial</Link>
                  </Button>
                </div>
                <div className="mt-6 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                  <a href="mailto:support@hrgreatly.com" className="flex items-center gap-2 py-1">
                    <LifeBuoy className="h-3.5 w-3.5" /> Support
                  </a>
                  <p className="flex items-center gap-2 py-1">
                    <MapPin className="h-3.5 w-3.5" /> {country}
                  </p>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-secondary/15 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              The HR platform built for ambitious teams
            </span>

            <h1 className="mt-6 text-balance text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                HR Greatly
              </span>
            </h1>

            <p className="mt-5 text-pretty text-lg text-muted-foreground sm:text-xl">
              Where people thrive and HR finally feels light. Run attendance, leave and payroll
              from one calm place — and give every hour back to what matters: your people.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link to="/login?mode=signup">
                  Start a Free Account <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="mailto:hello@hrgreatly.com?subject=Book%20a%20demo">Book a demo</a>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Free for 15 days · No credit card required · Cancel anytime
            </p>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:grid-cols-3 sm:p-8">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center justify-center gap-2 px-4 py-3 text-center sm:border-r sm:border-border/60 sm:last:border-r-0"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-bold tracking-tight sm:text-4xl">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Free trial CTA */}
      <section className="border-y border-border/60 bg-gradient-to-br from-primary/10 via-muted/30 to-secondary/10">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
            <div className="max-w-xl">
              <h2 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
                Start a Free Account with HR Greatly for 15 Days
              </h2>
              <p className="mt-2 text-muted-foreground">
                Unlimited access to every module. Bring your whole team. Fall in love with HR again.
              </p>
            </div>
            <Button asChild size="lg" className="gap-2 whitespace-nowrap">
              <Link to="/login?mode=signup">
                Start Free Trial <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trusted by — animated marquee */}
      <section className="bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-foreground">
            Trusted by forward-thinking teams worldwide
          </p>

          <div
            className="group relative mt-6 overflow-hidden"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            }}
          >
            <div className="flex w-max animate-marquee gap-10 group-hover:[animation-play-state:paused]">
              {[...trustedCompanies, ...trustedCompanies].map((c, i) => (
                <div
                  key={`${c.name}-${i}`}
                  className="flex shrink-0 items-center gap-2.5 rounded-full border border-border/60 bg-card px-5 py-2.5 shadow-sm"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 text-primary">
                    <c.icon className="h-4 w-4" />
                  </span>
                  <span className="whitespace-nowrap text-sm font-bold tracking-tight text-foreground">
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            One platform. Every HR moment that matters.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Six beautifully-integrated modules that replace a dozen disconnected tools — and free your team to do their best work.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border/70 bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 p-2">
                <img
                  src={f.img}
                  alt={f.title}
                  width={512}
                  height={512}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </div>
              <h3 className="mt-5 text-xl font-extrabold tracking-tight text-primary">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* YouTube */}
      <section id="video" className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/60 px-3 py-1 text-xs font-medium text-primary">
              <PlayCircle className="h-3.5 w-3.5" />
              Product walkthrough
            </span>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">See HR Greatly in action</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A two-minute tour of attendance, leave and payroll — end to end, beginning to brilliant.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-card p-2 shadow-2xl shadow-primary/10">
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                <iframe
                  className="h-full w-full"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="HR Greatly product walkthrough"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">Live in three steps</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From signup to your first payroll run — in a single afternoon.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-border/70 bg-card p-7">
                <span className="text-sm font-bold text-primary">{s.n}</span>
                <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-primary">{s.title}</h3>
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
            "We replaced four different tools with HR Greatly. Our HR team got their Fridays back,
            our employees actually <em>like</em> checking in, and leadership finally trusts the numbers."
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
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/15 via-card to-secondary/10 p-10 sm:p-14">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                Ready to make HR feel calm?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join thousands of teams who run their HR — beautifully — on HR Greatly.
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
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {/* Column 1: Product */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-foreground">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground">Desk Flow</a></li>
              <li><a href="#features" className="hover:text-foreground">HR</a></li>
              <li><a href="#blogs" className="hover:text-foreground">Blogs</a></li>
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#how" className="hover:text-foreground">How it works</a></li>
            </ul>
          </div>

          {/* Column 2: Customer */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-foreground">Customer</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li><a href="mailto:support@hrgreatly.com" className="hover:text-foreground">Help & Support</a></li>
              <li><Link to="/login" className="hover:text-foreground">Login</Link></li>
              <li><a href="#video" className="hover:text-foreground">Videos</a></li>
            </ul>
            <div className="mt-5 space-y-2">
              <a
                href="https://play.google.com/store"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-2 transition-colors hover:border-primary/40"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                  alt="Get it on Google Play"
                  className="h-9 w-auto"
                  loading="lazy"
                />
              </a>
              <a
                href="https://www.apple.com/app-store/"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-3 py-2 transition-colors hover:border-primary/40"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                  alt="Download on the App Store"
                  className="h-9 w-auto"
                  loading="lazy"
                />
              </a>
            </div>
          </div>

          {/* Column 3: About us */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-foreground">About us</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li><a href="#about" className="hover:text-foreground">About</a></li>
              <li><a href="#testimonial" className="hover:text-foreground">Customers</a></li>
              <li><a href="#partners" className="hover:text-foreground">Partners</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Plan & Pricing</a></li>
              <li><a href="#careers" className="hover:text-foreground">Careers</a></li>
              <li><a href="mailto:hello@hrgreatly.com" className="hover:text-foreground">Contact Us</a></li>
            </ul>
          </div>

          {/* Column 4: Stay in touch */}
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-foreground">Stay in touch</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Get product updates, hiring tips and HR insights delivered every other week.
            </p>
            <form className="mt-4 flex gap-2">
              <input
                type="email"
                placeholder="you@company.com"
                className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="sm" type="submit">Subscribe</Button>
            </form>
            <div className="mt-5 flex gap-3 text-xs text-muted-foreground">
              <a href="#" className="hover:text-foreground">Privacy</a>
              <span>·</span>
              <a href="#" className="hover:text-foreground">Terms</a>
              <span>·</span>
              <a href="#" className="hover:text-foreground">Security</a>
            </div>
          </div>
        </div>

        {/* Brand block */}
        <div className="border-t border-border/60">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <img src={hrgreatlyLogo} alt="HR Greatly" className="h-24 w-auto sm:h-28" />
                <div>
                  <p className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">HR Greatly</p>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    Sector 17, Chandigarh, Punjab, India — Pin 140603
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/60 bg-muted/40">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
            <p>© 2026 HR Greatly Software | UBID INDIA SOLUTIONS</p>
            <p>Address: Punjab, India</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
