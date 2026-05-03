import PageLayout from "@/components/PageLayout";
import { ShieldCheck, KeyRound, Server, Eye, Bug, FileLock2, Network, AlarmClock } from "lucide-react";

const pillars = [
  {
    icon: ShieldCheck,
    title: "Encryption everywhere",
    desc: "TLS 1.2+ in transit, AES-256 at rest. Sensitive fields like payroll are double-encrypted at the column level.",
  },
  {
    icon: KeyRound,
    title: "Strong authentication",
    desc: "Password policies, optional SSO (Google, SAML) and multi-factor authentication for admins out of the box.",
  },
  {
    icon: Server,
    title: "Hardened infrastructure",
    desc: "Hosted on world-class cloud providers with isolated networks, automated patching and 24/7 monitoring.",
  },
  {
    icon: Eye,
    title: "Least-privilege access",
    desc: "Role-based access control inside the app and inside our team. Engineers never browse customer data.",
  },
  {
    icon: FileLock2,
    title: "Daily encrypted backups",
    desc: "Geo-redundant backups taken every 24 hours and tested regularly so your data is always recoverable.",
  },
  {
    icon: Network,
    title: "Network protection",
    desc: "Web Application Firewall, DDoS protection, rate limiting and bot mitigation guard every endpoint.",
  },
  {
    icon: Bug,
    title: "Responsible disclosure",
    desc: "Found a vulnerability? Email security@hrgreatly.com — we triage within 48 hours and credit responsible reporters.",
  },
  {
    icon: AlarmClock,
    title: "Incident response",
    desc: "A documented playbook, on-call rotation and customer notification within 72 hours of any confirmed incident.",
  },
];

const Security = () => (
  <PageLayout
    eyebrow="Security"
    title="Security built into every line of code"
    subtitle="HR data is some of the most sensitive a company holds. Here's how we keep yours safe — at every layer."
  >
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {pillars.map((p) => (
        <div
          key={p.title}
          className="rounded-2xl border border-border/70 bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary">
            <p.icon className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-extrabold tracking-tight text-primary">{p.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
        </div>
      ))}
    </div>

    <div className="mt-12 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-8 text-center">
      <h3 className="text-2xl font-extrabold tracking-tight text-primary">Report a security concern</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
        We welcome reports from the security community. Please email{" "}
        <a href="mailto:support@hrgreatly.com" className="font-semibold text-primary underline">
          support@hrgreatly.com
        </a>{" "}
        with details — we respond fast and treat every report seriously.
      </p>
    </div>
  </PageLayout>
);

export default Security;
