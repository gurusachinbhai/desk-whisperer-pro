import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Smartphone, CalendarDays, Clock, BellRing, BarChart3, CheckCircle2 } from "lucide-react";
import heroImg from "@/assets/product-attendance.jpg";

const features = [
  { icon: Smartphone, title: "One-tap mobile check-in", desc: "Employees mark attendance from their phone — with selfie, geo-tag and Wi-Fi verification." },
  { icon: MapPin, title: "Geo-fencing & IP rules", desc: "Restrict check-ins to office premises, client sites or remote-work zones you define." },
  { icon: CalendarDays, title: "Smart leave workflows", desc: "Apply, approve and track casual, sick, earned and comp-off leaves — all in one calendar." },
  { icon: Clock, title: "Shifts & rosters", desc: "Rotational shifts, night allowances and overtime — auto-calculated and synced to payroll." },
  { icon: BellRing, title: "Real-time alerts", desc: "Late arrivals, missed punches and low leave balances — managers know instantly." },
  { icon: BarChart3, title: "Attendance insights", desc: "Heatmaps, absenteeism trends and team-level reports for leadership." },
];

const howItWorks = [
  { n: "01", title: "Open the app", desc: "Employee opens HR Greatly on their phone or web." },
  { n: "02", title: "Tap check-in", desc: "Location and identity verified in under 2 seconds." },
  { n: "03", title: "Apply leave anytime", desc: "Pick dates, type and reason — manager approves in one tap." },
  { n: "04", title: "Auto-sync to payroll", desc: "Hours and leaves flow into payroll without manual entry." },
];

const AttendanceLeave = () => (
  <PageLayout
    eyebrow="HR Attendance & Leave Application"
    title="Attendance & leave, made effortless"
    subtitle="Smart sign-in, instant approvals, and a leave balance everyone can trust — for office, remote and hybrid teams."
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

    <div className="mt-16">
      <h2 className="text-center text-3xl font-extrabold tracking-tight">How it works</h2>
      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-4">
        {howItWorks.map((s) => (
          <div key={s.n} className="rounded-2xl border border-border/70 bg-card p-6">
            <span className="text-sm font-bold text-primary">{s.n}</span>
            <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-16 rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 to-secondary/10 p-8 sm:p-12">
      <h2 className="text-3xl font-extrabold tracking-tight">Built for every kind of team</h2>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          "Hybrid teams with rotating office days",
          "Field staff with multiple client sites",
          "Factory shifts with biometric integration",
          "Remote-first companies across time zones",
        ].map((b) => (
          <li key={b} className="flex items-start gap-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" className="gap-2">
          <Link to="/login?mode=signup">Try it free <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/contact">Book a demo</Link>
        </Button>
      </div>
    </div>
  </PageLayout>
);

export default AttendanceLeave;
