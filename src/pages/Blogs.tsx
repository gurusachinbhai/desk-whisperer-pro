import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import PageLayout from "@/components/PageLayout";

export const blogPosts = [
  {
    slug: "how-to-use-hr-greatly",
    title: "How to use HR Greatly: a 5-minute tour",
    excerpt: "A friendly walkthrough of every module — attendance, leave, payroll, booking — and how they fit together.",
    date: "May 1, 2026",
    readTime: "5 min",
    image: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "how-to-login",
    title: "How to log in to HR Greatly (employee guide)",
    excerpt: "Step-by-step instructions to access your account, reset passwords, and sign in from any device.",
    date: "Apr 28, 2026",
    readTime: "3 min",
    image: "https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "how-to-book-your-seat",
    title: "How to book your seat or meeting room",
    excerpt: "Hybrid teams thrive when the office works around them. Here's how to book a desk in seconds.",
    date: "Apr 22, 2026",
    readTime: "4 min",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "how-to-apply-for-leave",
    title: "How to apply for leave (and get approved fast)",
    excerpt: "Everything you need to know about leave types, balances, withdrawal, and approval workflows.",
    date: "Apr 18, 2026",
    readTime: "4 min",
    image: "https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "how-to-mark-attendance",
    title: "How to mark attendance from anywhere",
    excerpt: "Smart sign-in, geo-fencing and shift intelligence — make attendance painless for your team.",
    date: "Apr 12, 2026",
    readTime: "5 min",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  },
];

const Blogs = () => (
  <PageLayout
    eyebrow="Blog"
    title="Fresh HR insights"
    subtitle="Practical guides, product tips and stories from teams making HR feel human again."
  >
    <div className="grid gap-8 sm:grid-cols-2">
      {blogPosts.map((p) => (
        <Link
          key={p.slug}
          to={`/blogs/${p.slug}`}
          className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
        >
          <img src={p.image} alt={p.title} className="h-52 w-full object-cover" loading="lazy" />
          <div className="p-6">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {p.date}</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {p.readTime}</span>
            </div>
            <h2 className="mt-3 text-xl font-bold leading-snug group-hover:text-primary">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Read article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  </PageLayout>
);

export default Blogs;
