import PageLayout from "@/components/PageLayout";

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using HR Greatly, you agree to be bound by these Terms of Service and our Privacy Policy. If you're using the service on behalf of an organisation, you confirm you're authorised to bind that organisation.",
  },
  {
    title: "2. Your Account",
    body: "You're responsible for keeping your login credentials confidential and for all activity that happens under your account. Notify us immediately at support@hrgreatly.com if you suspect unauthorised access.",
  },
  {
    title: "3. Acceptable Use",
    body: "You agree not to misuse the service — no reverse engineering, no attempts to disrupt the platform, no uploading of unlawful content, and no use that violates the rights of any employee or third party.",
  },
  {
    title: "4. Subscription & Billing",
    body: "Paid plans are billed in advance on a monthly or annual cycle. Free trials convert only if you choose to upgrade. You can cancel anytime; cancellations take effect at the end of the current billing period.",
  },
  {
    title: "5. Data Ownership",
    body: "You own your data. We process it on your behalf to provide the service. On account closure, you can export your data within 30 days, after which it is permanently deleted from active systems.",
  },
  {
    title: "6. Service Availability",
    body: "We target 99.9% uptime and maintain redundant infrastructure. Planned maintenance is communicated in advance. We're not liable for downtime caused by factors beyond our reasonable control.",
  },
  {
    title: "7. Limitation of Liability",
    body: "To the maximum extent permitted by law, HR Greatly's total liability for any claim is limited to the fees paid by you in the 12 months preceding the claim.",
  },
  {
    title: "8. Changes to Terms",
    body: "We may update these Terms occasionally. Material changes will be notified via email or in-app at least 14 days before they take effect.",
  },
  {
    title: "9. Contact",
    body: "Questions about these Terms? Email support@hrgreatly.com.",
  },
];

const Terms = () => (
  <PageLayout
    eyebrow="Terms of Service"
    title="Clear terms. No surprises."
    subtitle="The ground rules for using HR Greatly — written in plain English so everyone knows where they stand."
  >
    <p className="mb-10 text-sm text-muted-foreground">Last updated: May 3, 2026</p>

    <div className="space-y-5">
      {sections.map((s) => (
        <div key={s.title} className="rounded-2xl border border-border/70 bg-card p-7">
          <h2 className="text-lg font-extrabold tracking-tight text-primary">{s.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        </div>
      ))}
    </div>
  </PageLayout>
);

export default Terms;
