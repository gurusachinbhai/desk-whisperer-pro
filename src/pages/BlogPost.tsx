import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";
import { blogPosts } from "./Blogs";

const articles: Record<string, { intro: string; sections: { heading: string; body: string[] }[] }> = {
  "how-to-use-hr-greatly": {
    intro:
      "HR Greatly brings every people-process — attendance, leave, payroll, booking and reporting — into one calm place. Here's a 5-minute tour to help you get the most out of it.",
    sections: [
      {
        heading: "1. Set up your company",
        body: [
          "Sign up with your work email and create your company workspace.",
          "Add your floors, departments and policies in the Admin console — guided, fast, fuss-free.",
          "Invite your team via branded email invites. They log in and get going on day one.",
        ],
      },
      {
        heading: "2. Run attendance",
        body: [
          "Employees mark attendance via web or mobile, with optional geo-fencing.",
          "Late arrivals and early departures are flagged automatically.",
          "Managers see a live 'Who Is In' view and can regularize exceptions in one click.",
        ],
      },
      {
        heading: "3. Approve leave",
        body: [
          "Employees request leave, see balances, and withdraw if plans change.",
          "Managers approve in a tap. HR is auto-notified.",
        ],
      },
      {
        heading: "4. Run payroll & view payslips",
        body: [
          "HR uploads monthly payslips. Employees access them instantly and securely.",
        ],
      },
    ],
  },
  "how-to-login": {
    intro:
      "Logging in to HR Greatly is fast and secure. Whether you're an employee, manager or admin, follow these steps.",
    sections: [
      {
        heading: "Step 1 — Open the login page",
        body: ["Go to hrgreatly.com and click 'Login' in the top-right corner."],
      },
      {
        heading: "Step 2 — Enter your work email",
        body: [
          "Use the email your HR team registered for you.",
          "If your company uses SSO, click 'Continue with Google' or your SSO provider.",
        ],
      },
      {
        heading: "Step 3 — Enter your password",
        body: [
          "First-time users get a setup link by email — set a strong password.",
          "Forgot it? Click 'Forgot password' to reset by email.",
        ],
      },
      {
        heading: "Step 4 — You're in!",
        body: [
          "You'll land on your dashboard. From here you can mark attendance, request leave, view payslips and more.",
        ],
      },
    ],
  },
  "how-to-book-your-seat": {
    intro: "Hybrid teams thrive when the office works around them. Booking a desk or meeting room takes seconds.",
    sections: [
      {
        heading: "Open the Booking module",
        body: ["From the sidebar, click 'Booking'. You'll see a live floor plan of your office."],
      },
      {
        heading: "Pick a desk or room",
        body: [
          "Green = available, grey = occupied. Click any green seat to see details.",
          "For meeting rooms, choose date and time — availability updates in real time.",
        ],
      },
      {
        heading: "Confirm",
        body: [
          "Hit 'Book' — done! Your booking shows up in your dashboard and calendar.",
          "Need to change? Cancel from your dashboard and rebook in seconds.",
        ],
      },
    ],
  },
  "how-to-apply-for-leave": {
    intro:
      "Applying for leave on HR Greatly is designed to be effortless — and getting approved is just as fast.",
    sections: [
      {
        heading: "Step 1 — Open Leave",
        body: ["From the sidebar, click 'Leave'. You'll see your balances and history."],
      },
      {
        heading: "Step 2 — Choose leave type",
        body: [
          "Annual, Sick, Compassionate — the types your admin has configured.",
          "Pick start and end dates. The system shows your remaining balance live.",
        ],
      },
      {
        heading: "Step 3 — Add a reason and submit",
        body: [
          "Write a short note for your manager.",
          "Click 'Submit'. Your manager is notified instantly.",
          "If plans change, you can withdraw the request from the same page.",
        ],
      },
    ],
  },
  "how-to-mark-attendance": {
    intro:
      "Whether you're at the office, at a client site or working from home, HR Greatly makes marking attendance painless.",
    sections: [
      {
        heading: "Web sign-in",
        body: [
          "Open your dashboard and click the big 'Sign in' button at the top.",
          "Sign out at the end of the day with one tap. The system logs hours automatically.",
        ],
      },
      {
        heading: "Mobile sign-in",
        body: [
          "Open the HR Greatly mobile app.",
          "If your company uses geo-fencing, sign-in is enabled when you're inside the office radius.",
        ],
      },
      {
        heading: "Regularizing exceptions",
        body: [
          "Forgot to sign in? Submit a regularization request from the Attendance page.",
          "Your manager approves it — and your record is corrected.",
        ],
      },
    ],
  },
};

const BlogPost = () => {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);
  const article = slug ? articles[slug] : undefined;

  if (!post || !article) {
    return (
      <PageLayout title="Article not found" subtitle="The article you're looking for doesn't exist.">
        <Button asChild>
          <Link to="/blogs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to blogs</Link>
        </Button>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      eyebrow="Blog"
      title={post.title}
      subtitle={post.excerpt}
      heroImage={post.image}
      maxWidth="md"
    >
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> {post.date}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {post.readTime}</span>
      </div>

      <p className="mt-8 text-lg leading-relaxed text-foreground/90">{article.intro}</p>

      {article.sections.map((s) => (
        <section key={s.heading} className="mt-10">
          <h2 className="text-2xl font-extrabold text-primary">{s.heading}</h2>
          <div className="mt-3 space-y-3 text-base leading-relaxed text-foreground/90">
            {s.body.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </section>
      ))}

      <div className="mt-12 flex items-center justify-between border-t border-border/60 pt-8">
        <Button asChild variant="outline">
          <Link to="/blogs"><ArrowLeft className="mr-2 h-4 w-4" /> All articles</Link>
        </Button>
        <Button asChild>
          <Link to="/login?mode=signup">Try HR Greatly free</Link>
        </Button>
      </div>
    </PageLayout>
  );
};

export default BlogPost;
