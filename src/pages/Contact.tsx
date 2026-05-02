import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";

// Public contact address shown to users
const PUBLIC_EMAIL = "Support@hrgreatly.com";
// Internal recipients — kept hidden from the UI, used only when sending
const INTERNAL_RECIPIENTS = ["Sachinbiher@gmail.com", "Gurusachinbhai@gmail.com"];

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: "Please fill required fields", description: "Name, email and message are required." });
      return;
    }
    const subject = encodeURIComponent(form.subject || `New enquiry from ${form.name}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nCompany: ${form.company}\n\n${form.message}`
    );
    const bcc = encodeURIComponent(INTERNAL_RECIPIENTS.join(","));
    window.location.href = `mailto:${PUBLIC_EMAIL}?bcc=${bcc}&subject=${subject}&body=${body}`;
    setSent(true);
    toast({ title: "Opening your email app", description: "Your message will be sent to our team." });
  };

  return (
    <PageLayout
      eyebrow="Contact Us"
      title="Get in touch"
      subtitle="Questions, feedback, or want a personalised demo? We'd love to hear from you."
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <Mail className="h-6 w-6 text-primary" />
            <p className="mt-3 font-bold">Email us</p>
            <a href={`mailto:${PUBLIC_EMAIL}`} className="mt-1 block text-sm text-primary hover:underline">
              {PUBLIC_EMAIL}
            </a>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <Phone className="h-6 w-6 text-primary" />
            <p className="mt-3 font-bold">Talk to sales</p>
            <p className="mt-1 text-sm text-muted-foreground">Mon – Fri, 9am – 7pm IST</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <MapPin className="h-6 w-6 text-primary" />
            <p className="mt-3 font-bold">Headquarters</p>
            <p className="mt-1 text-sm text-muted-foreground">Bangalore, India · Singapore · USA</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 shadow-sm lg:col-span-2"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Full name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required />
            </div>
            <div>
              <label className="text-sm font-semibold">Email *</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={200} required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Company</label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={120} />
            </div>
            <div>
              <label className="text-sm font-semibold">Subject</label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={150} />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold">Message *</label>
            <Textarea
              rows={6}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              maxLength={2000}
              required
            />
          </div>
          <Button type="submit" size="lg" className="gap-2">
            {sent ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {sent ? "Message sent" : "Send message"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Your message will be delivered to our support team. We typically reply within 1 business day.
          </p>
        </form>
      </div>
    </PageLayout>
  );
};

export default Contact;
