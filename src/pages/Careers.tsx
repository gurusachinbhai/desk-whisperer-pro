import { Mail, Heart, Sparkles, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";

const roles = [
  { title: "Senior Full-Stack Engineer", location: "Remote · India / Singapore", type: "Full-time" },
  { title: "Product Designer (HR SaaS)", location: "Remote · Global", type: "Full-time" },
  { title: "Customer Success Manager", location: "Bangalore, India", type: "Full-time" },
  { title: "Content Marketer", location: "Remote", type: "Full-time" },
  { title: "DevOps Engineer", location: "Remote · India", type: "Full-time" },
  { title: "Sales Development Rep", location: "Singapore", type: "Full-time" },
];

const perks = [
  { icon: Heart, title: "People-first culture", desc: "Generous leave, mental-wellness days, and real flexibility." },
  { icon: Sparkles, title: "Meaningful work", desc: "Build the HR platform 2M+ employees rely on every day." },
  { icon: Coffee, title: "Remote, with heart", desc: "Async by default. Annual offsites in beautiful places." },
];

const Careers = () => (
  <PageLayout
    eyebrow="Careers"
    title="Join our mission"
    subtitle="We're building the HR platform that makes work feel human again. Come build it with us."
    heroImage="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80"
  >
    <div className="grid gap-5 sm:grid-cols-3">
      {perks.map((p) => (
        <div key={p.title} className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <p.icon className="h-7 w-7 text-primary" />
          <h3 className="mt-3 text-lg font-bold">{p.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
        </div>
      ))}
    </div>

    <h2 className="mt-16 text-3xl font-extrabold tracking-tight text-primary">Open positions</h2>
    <div className="mt-6 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      {roles.map((r) => (
        <div key={r.title} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-bold">{r.title}</p>
            <p className="text-sm text-muted-foreground">{r.location} · {r.type}</p>
          </div>
          <Button asChild size="sm">
            <a href={`mailto:Support@hrgreatly.com?subject=Application: ${encodeURIComponent(r.title)}`}>
              Apply now
            </a>
          </Button>
        </div>
      ))}
    </div>

    <div className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-muted/30 to-secondary/10 p-8 text-center">
      <Mail className="mx-auto h-8 w-8 text-primary" />
      <h3 className="mt-3 text-2xl font-extrabold">Don't see your role?</h3>
      <p className="mt-2 text-muted-foreground">
        We're always on the lookout for great people. Send your CV to:
      </p>
      <a
        href="mailto:Support@hrgreatly.com?subject=Career%20Application"
        className="mt-3 inline-block text-xl font-bold text-primary hover:underline"
      >
        Support@hrgreatly.com
      </a>
    </div>
  </PageLayout>
);

export default Careers;
