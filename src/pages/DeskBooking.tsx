import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  MapPin,
  Users,
  ShieldCheck,
  Clock,
  Sparkles,
  TrendingDown,
  Building2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const policies = [
  {
    icon: Users,
    title: "Open & Fair Access",
    desc: "Every employee can book any available desk — no permanent ownership, no politics.",
  },
  {
    icon: Clock,
    title: "Book in Advance",
    desc: "Reserve desks up to 14 days ahead. Same-day bookings supported until the desk is occupied.",
  },
  {
    icon: ShieldCheck,
    title: "No-Show Protection",
    desc: "Auto-release after 30 minutes of no check-in. Repeat no-shows lose advance-booking rights for a week.",
  },
  {
    icon: MapPin,
    title: "Neighbourhoods",
    desc: "Teams can reserve zones for collaboration days while keeping the rest of the floor flexible.",
  },
  {
    icon: Sparkles,
    title: "Hygiene First",
    desc: "Every desk is auto-marked for cleaning after checkout. Cleaning crew gets a live dashboard.",
  },
  {
    icon: Building2,
    title: "Visitors & Guests",
    desc: "Hosts can book a desk for a visitor in one click — passes are emailed automatically.",
  },
];

const steps = [
  { n: "01", title: "Open the app", desc: "Login from web or mobile and tap Desk Booking." },
  { n: "02", title: "Pick a date & floor", desc: "See a live floor map with green (free), amber (booked), red (occupied)." },
  { n: "03", title: "Choose your desk", desc: "Filter by window seat, monitor, standing desk, or near your team." },
  { n: "04", title: "Confirm & check-in", desc: "Get a QR pass. Scan it at the desk to check in within 30 minutes." },
];

const benefits = [
  { icon: TrendingDown, title: "Cut real-estate cost by 30–45%", desc: "Most offices use only 55% of their desks daily. Hot-desking lets you right-size your floor." },
  { icon: Users, title: "Happier hybrid teams", desc: "Employees pick days and desks that suit them — no fights over the window seat." },
  { icon: CalendarCheck, title: "Zero admin overhead", desc: "Bookings, no-shows, cleaning and reports run themselves. HR & Admin get hours back." },
  { icon: ShieldCheck, title: "Audit-ready compliance", desc: "Full attendance + occupancy logs for safety drills, audits and ESG reporting." },
];

const plans = [
  {
    name: "Starter",
    price: "₹49",
    unit: "/desk / month",
    forWho: "Up to 50 desks",
    features: ["Floor map & booking", "Mobile + web", "QR check-in", "Email support"],
  },
  {
    name: "Growth",
    price: "₹39",
    unit: "/desk / month",
    forWho: "50 – 500 desks",
    features: ["Everything in Starter", "Team neighbourhoods", "Visitor passes", "Cleaning dashboard", "Priority support"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    unit: "annual contract",
    forWho: "500+ desks / multi-site",
    features: ["Multi-city floors", "SSO + SAML", "Custom SLAs", "Dedicated CSM", "On-prem option"],
  },
];

const DeskBooking = () => {
  return (
    <PageLayout
      eyebrow="Product · Desk Booking"
      title="Desk Booking that just works"
      subtitle="Open-desk policies, live floor maps, QR check-ins and real cost savings — all built into HR Greatly."
    >
      {/* Policies */}
      <section className="mb-16">
        <h2 className="mb-2 text-3xl font-bold">Open Desk Policies</h2>
        <p className="mb-8 text-muted-foreground">Fair, transparent rules baked into the product — no spreadsheets needed.</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {policies.map((p) => (
            <Card key={p.title} className="border-border/60 transition-shadow hover:shadow-md">
              <CardContent className="p-6">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1 font-semibold">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How to book */}
      <section className="mb-16 rounded-2xl border border-border/60 bg-muted/30 p-6 sm:p-10">
        <h2 className="mb-2 text-3xl font-bold">How to book a desk</h2>
        <p className="mb-8 text-muted-foreground">Four taps. Under 20 seconds.</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl bg-background p-5 shadow-sm">
              <div className="mb-3 text-2xl font-extrabold text-primary">{s.n}</div>
              <h3 className="mb-1 font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="mb-16">
        <h2 className="mb-2 text-3xl font-bold">Why corporate partners love it</h2>
        <p className="mb-8 text-muted-foreground">Real, measurable benefits — not just nice dashboards.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {benefits.map((b) => (
            <Card key={b.title} className="border-border/60">
              <CardContent className="flex gap-4 p-6">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary/40 text-primary">
                  <b.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="mb-1 font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground">{b.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mb-16">
        <h2 className="mb-2 text-3xl font-bold">Pricing for corporate partners</h2>
        <p className="mb-8 text-muted-foreground">Volume discounts kick in automatically. Annual billing saves another 15%.</p>
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((p) => (
            <Card
              key={p.name}
              className={`relative border-border/60 ${p.highlight ? "border-primary shadow-lg ring-2 ring-primary/30" : ""}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <CardContent className="p-6">
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.forWho}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.unit}</span>
                </div>
                <ul className="mt-5 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 w-full" variant={p.highlight ? "default" : "outline"}>
                  <Link to="/contact">Talk to sales</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Indicative pricing. Final quote depends on number of sites, integrations and contract term.
        </p>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-gradient-to-br from-primary/15 via-secondary/30 to-primary/10 p-8 text-center sm:p-12">
        <h2 className="text-3xl font-bold">Ready to free up your floor space?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Book a 20-minute walkthrough. We'll show you the floor map, the savings calculator and exactly how your team will book desks tomorrow.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/pricing/free-trial">Start 15-day free trial <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/contact">Book a demo</Link>
          </Button>
        </div>
      </section>
    </PageLayout>
  );
};

export default DeskBooking;
