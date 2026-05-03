import PageLayout from "@/components/PageLayout";
import { Shield, Lock, Eye, FileText, UserCheck, Mail } from "lucide-react";

const sections = [
  {
    icon: FileText,
    title: "Information We Collect",
    body: "We collect details you provide when creating an account (name, email, company, role), data your organisation uploads (employee records, attendance, leave, payroll), and technical data like device, browser and IP address used to keep the service secure.",
  },
  {
    icon: Eye,
    title: "How We Use Your Data",
    body: "Your data is used solely to deliver and improve HR Greatly — running attendance, leave and payroll, sending essential service notifications, providing customer support and meeting legal obligations. We never sell your personal information.",
  },
  {
    icon: Lock,
    title: "How We Protect It",
    body: "All data is encrypted in transit (TLS 1.2+) and at rest (AES-256). We follow the principle of least privilege, run regular security audits and store backups in geo-redundant, access-controlled facilities.",
  },
  {
    icon: UserCheck,
    title: "Your Rights",
    body: "You may access, correct, export or delete your personal data at any time. Admins can manage employee data directly inside the app. For any rights request, write to support@hrgreatly.com and we'll respond within 30 days.",
  },
  {
    icon: Shield,
    title: "Cookies & Tracking",
    body: "We use essential cookies for authentication and a small number of analytics cookies to understand usage. You can control non-essential cookies from your browser settings without affecting core functionality.",
  },
  {
    icon: Mail,
    title: "Contact",
    body: "Questions about this Privacy Policy? Reach our Data Protection team at support@hrgreatly.com — we're happy to help.",
  },
];

const Privacy = () => (
  <PageLayout
    eyebrow="Privacy Policy"
    title="Your data, treated with respect"
    subtitle="We believe privacy is a right, not a feature. Here's exactly what we collect, why, and how we keep it safe."
  >
    <p className="mb-10 text-sm text-muted-foreground">Last updated: May 3, 2026</p>

    <div className="space-y-6">
      {sections.map((s) => (
        <div key={s.title} className="rounded-2xl border border-border/70 bg-card p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <s.icon className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-primary">{s.title}</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        </div>
      ))}
    </div>
  </PageLayout>
);

export default Privacy;
