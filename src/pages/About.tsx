import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import hrgreatlyLogo from "@/assets/hrgreatly-logo.png";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-12">
    <h2 className="text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">{title}</h2>
    <div className="mt-4 space-y-4 text-base leading-relaxed text-foreground/90">{children}</div>
  </section>
);

const Sub = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-6">
    <h3 className="text-lg font-bold text-foreground">{title}</h3>
    <div className="mt-2 space-y-2 text-foreground/80">{children}</div>
  </div>
);

const About = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src={hrgreatlyLogo} alt="HR Greatly" className="h-12 w-auto sm:h-14" />
            <span className="text-xl font-extrabold text-primary sm:text-2xl">HR Greatly</span>
          </Link>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            About Us
          </span>
          <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            🌟 Our Story: Why We Built HR Greatly
          </h1>
        </div>

        <Section title="Introduction">
          <p>
            Every company is built on people. Products, profits, and processes matter, but without
            engaged employees, no organization can truly thrive. Yet for decades, human resource
            management has been treated as a back-office function — a necessary but uninspiring set
            of tasks. Attendance tracking, leave approvals, payroll distribution: these processes
            were often clunky, outdated, and disconnected from the real needs of employees and
            managers.
          </p>
          <p>
            We built HR Greatly to change that. Our mission is simple: to make HR not just
            efficient, but inspiring. To transform HR systems into platforms that empower employees,
            support managers, and free HR leaders to focus on what matters most — building great
            workplaces.
          </p>
        </Section>

        <Section title="🌍 The Gap We Saw in Corporate HR">
          <Sub title="1. Outdated Systems">
            <p>
              Many organizations still rely on legacy HR software or manual processes. Employees
              struggle to log attendance, managers drown in paperwork, and HR teams spend more time
              fixing errors than engaging with people. The gap was clear: HR technology had not kept
              pace with modern workplaces.
            </p>
          </Sub>
          <Sub title="2. Lack of Transparency">
            <p>
              Employees often feel disconnected from HR processes. They don't know how deductions
              are calculated, why leave requests are delayed, or when payslips will be available.
              This lack of transparency erodes trust and engagement.
            </p>
          </Sub>
          <Sub title="3. Limited Empowerment">
            <p>
              Traditional HR systems give employees little control. They can request leave but not
              withdraw it, view attendance but not regularize it, and access payslips only after
              delays. We saw the need for employee empowerment — giving individuals the tools to
              manage their own work-life balance.
            </p>
          </Sub>
          <Sub title="4. Managerial Bottlenecks">
            <p>
              Managers are critical to HR workflows, yet they are often overwhelmed. Approving
              leave, reviewing attendance exceptions, and handling escalations consume valuable
              time. We wanted to design a system that streamlines approvals and reduces managerial
              burden.
            </p>
          </Sub>
          <Sub title="5. HR as Administration, Not Strategy">
            <p>
              Too often, HR teams are stuck in administrative loops. Instead of shaping culture,
              they chase attendance records. Instead of driving engagement, they fix payroll errors.
              The gap was clear: HR needed to move from administration to strategy.
            </p>
          </Sub>
        </Section>

        <Section title="🚀 How HR Greatly Fulfills These Gaps">
          <Sub title="Attendance Made Simple">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Overview & Day-wise Records:</strong> Employees can see their attendance at a glance.</li>
              <li><strong>Exception Handling:</strong> Late arrivals and early departures are flagged automatically.</li>
              <li><strong>Deduction Overview:</strong> Transparent calculations ensure employees understand their records.</li>
              <li><strong>Who Is In:</strong> Real-time visibility of colleagues and project members fosters collaboration.</li>
            </ul>
          </Sub>
          <Sub title="Leave Management Reimagined">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Configurable Leave Types:</strong> Annual, Sick, and Compassionate leave with admin-defined limits.</li>
              <li><strong>Approval Workflow:</strong> Employee → Manager → HR Admin → System update.</li>
              <li><strong>Withdrawal Option:</strong> Employees can withdraw leave requests if plans change.</li>
              <li><strong>Leave Balance & Holiday Calendar:</strong> Always visible, customizable by Admin.</li>
            </ul>
          </Sub>
          <Sub title="Payroll Access Without Delays">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Payslip Uploads:</strong> HR/Admin uploads monthly payslips directly to the system.</li>
              <li><strong>Instant Access:</strong> Employees can view and download payslips immediately.</li>
              <li><strong>Secure Storage:</strong> Payslips archived by month for easy retrieval.</li>
            </ul>
          </Sub>
          <Sub title="Subscription & Scalability">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Flexible Plans:</strong> Monthly, quarterly, 6-month, or annual subscriptions.</li>
              <li><strong>Employee-Based Pricing:</strong> $3 per employee per month.</li>
              <li><strong>Trial Period:</strong> 30 days free for every company before subscription.</li>
              <li><strong>Automatic Renewal Tracking:</strong> System displays next renewal date and blocks access if subscription expires.</li>
            </ul>
          </Sub>
        </Section>

        <Section title="💡 Why We Built HR Greatly">
          <p>
            We built HR Greatly because we believe HR should be great — not frustrating, not
            confusing, not hidden in the background. We wanted to create a platform that:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Empowers employees to manage their own attendance, leave, and payroll.</li>
            <li>Supports managers with streamlined workflows and reduced administrative burden.</li>
            <li>Frees HR leaders to focus on culture, engagement, and strategy.</li>
            <li>Builds trust through transparency and fairness.</li>
            <li>Adapts to modern workplaces with cross-platform support and responsive design.</li>
          </ul>
        </Section>

        <Section title="🌟 The Corporate Gap We Fulfill">
          <p>
            Corporate HR often struggles with three interconnected challenges: engagement,
            efficiency, and empowerment.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Engagement:</strong> Employees disengage when HR feels like a black box. HR Greatly makes processes transparent and interactive.</li>
            <li><strong>Efficiency:</strong> Managers and HR teams waste time on manual approvals. HR Greatly automates workflows and reduces bottlenecks.</li>
            <li><strong>Empowerment:</strong> Employees feel powerless when they can't control their own records. HR Greatly gives them tools to regularize attendance, withdraw leave, and access payroll instantly.</li>
          </ul>
          <p>
            By filling these gaps, HR Greatly helps companies move from compliance-driven HR to
            culture-driven HR.
          </p>
        </Section>

        <Section title="🌍 Our Vision for the Future">
          <p>
            We don't just want to build software. We want to build better workplaces. Workplaces
            where:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Employees feel valued and supported.</li>
            <li>Managers lead with empathy and clarity.</li>
            <li>HR teams drive engagement and innovation.</li>
            <li>Technology serves people, not the other way around.</li>
          </ul>
          <p className="font-semibold text-primary">
            Our vision is simple: HR made simple, people made great.
          </p>
        </Section>

        <Section title="✨ Closing Inspiration">
          <p>
            HR Greatly is more than an app. It's a philosophy. It's about believing that HR can be
            inspiring, that employees deserve transparency, and that managers and HR leaders should
            spend their time building culture, not chasing records.
          </p>
          <p>
            We built HR Greatly to fill the gaps we saw in corporate HR — gaps of outdated systems,
            lack of transparency, limited empowerment, and administrative overload. And we built it
            with one goal: to make HR truly great.
          </p>
          <p>
            Every login, every leave request, every payslip is more than a transaction. It's a step
            toward building a workplace where people belong, innovate, and rise together.
          </p>
        </Section>

        <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-muted/30 to-secondary/10 p-8 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-primary">
            Ready to make HR great at your company?
          </h2>
          <Button asChild size="lg">
            <Link to="/login?mode=signup">Start your free trial</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default About;
