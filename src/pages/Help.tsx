import { Link } from "react-router-dom";
import { LifeBuoy, Mail, Phone, MessageSquare, Ticket, Search, BookOpen } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How do I raise a support ticket?",
    a: "Sign in, then click 'Raise a ticket' on this page. Fill in the type (Incident or Request), priority (P1–P4), subject and details. You'll receive a unique ticket number you can use to track progress.",
  },
  {
    q: "What do the priority levels (P1–P4) mean?",
    a: "P1 — Critical: business stopped, immediate response. P2 — High: major impact, response within hours. P3 — Medium: limited impact, normal SLA. P4 — Low: minor or cosmetic, scheduled fix.",
  },
  {
    q: "How do I check the status of an existing ticket?",
    a: "Use 'Track by number' on the ticketing tool and enter your ticket number (format TKT-YYYY-000000). Logged-in employees can also see their tickets in the 'My tickets' tab.",
  },
  {
    q: "Who can see my ticket?",
    a: "Only you and your company's admins (and HR Greatly platform super admins). Other employees in your company cannot see your tickets.",
  },
  {
    q: "Can admins comment privately on my ticket?",
    a: "Yes, admins can leave internal notes that are hidden from the requester, used for triage between teams.",
  },
  {
    q: "I forgot my password — what now?",
    a: "Use the 'Forgot password' link on the login page to reset it via email.",
  },
];

const Help = () => (
  <PageLayout
    eyebrow="Help & Support"
    title="We're here to help"
    subtitle="Browse common questions, contact our team, or raise a ticket and track it end-to-end."
  >
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <Ticket className="h-6 w-6 text-primary" />
          <CardTitle className="text-base">Raise a ticket</CardTitle>
          <CardDescription>Get a tracked response from our support team.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/tickets?tab=new">Open ticketing tool</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <Search className="h-6 w-6 text-primary" />
          <CardTitle className="text-base">Track a ticket</CardTitle>
          <CardDescription>Already have a ticket number? Check its status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link to="/tickets?tab=lookup">Track by number</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <BookOpen className="h-6 w-6 text-primary" />
          <CardTitle className="text-base">Guides & docs</CardTitle>
          <CardDescription>How-tos for HR, attendance, payroll and more.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link to="/guides">Browse guides</Link>
          </Button>
        </CardContent>
      </Card>
    </div>

    <h2 className="mt-12 text-2xl font-extrabold tracking-tight text-primary">Frequently asked questions</h2>
    <Accordion type="single" collapsible className="mt-4">
      {faqs.map((f, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="text-left text-base font-bold">{f.q}</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>

    <h2 className="mt-12 text-2xl font-extrabold tracking-tight text-primary">Contact our team</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <Mail className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Email</CardTitle>
        </CardHeader>
        <CardContent>
          <a href="mailto:support@hrgreatly.com" className="text-sm font-semibold text-primary hover:underline">
            support@hrgreatly.com
          </a>
          <p className="mt-1 text-xs text-muted-foreground">We reply within 1 business day.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Phone className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Phone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold">+1 (800) 555-0144</p>
          <p className="mt-1 text-xs text-muted-foreground">Mon–Fri, 9am–6pm local time.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Live chat</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-semibold">In-app chat (logged-in users)</p>
          <p className="mt-1 text-xs text-muted-foreground">Or raise a ticket for asynchronous help.</p>
        </CardContent>
      </Card>
    </div>

    <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
      <LifeBuoy className="mx-auto h-8 w-8 text-primary" />
      <h3 className="mt-3 text-xl font-extrabold">Still need help?</h3>
      <p className="mt-1 text-sm text-muted-foreground">Raise a ticket and we'll get back to you with a tracked response.</p>
      <Button asChild className="mt-4">
        <Link to="/tickets?tab=new">Raise a ticket now</Link>
      </Button>
    </div>
  </PageLayout>
);

export default Help;
