import { Helmet } from "react-helmet-async";
import { useLocation, matchPath } from "react-router-dom";
import { blogPosts } from "@/pages/Blogs";

const SITE_URL = "https://www.hrgreatly.com";
const SITE_NAME = "HR Greatly";
const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/VLiyHHtey0h11fjw2ty5riO6FMP2/social-images/social-1777658355059-HrGreatly.webp";

type Meta = {
  title: string;
  description: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

const STATIC_META: Record<string, Meta> = {
  "/": {
    title: "HR Greatly — HR & Workspace Flow for modern teams",
    description:
      "Run attendance, leave, payroll and desk booking from one calm workspace. Built for ambitious teams who want HR to feel light.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
      },
    ],
  },
  "/login": {
    title: "Sign in to HR Greatly",
    description: "Sign in or create your HR Greatly account to manage attendance, leave, payroll and desk booking.",
  },
  "/admin": {
    title: "Platform admin console — HR Greatly",
    description: "HR Greatly platform administration: companies, users, subscriptions, support tickets and audit trail.",
  },
  "/about": {
    title: "About HR Greatly — our story and mission",
    description: "Why we built HR Greatly: a calmer, more human way to run people operations for ambitious teams.",
  },
  "/customers": {
    title: "Customers — teams who trust HR Greatly",
    description: "Meet the companies running attendance, leave, payroll and booking on HR Greatly every day.",
  },
  "/careers": {
    title: "Careers at HR Greatly — join our mission",
    description: "Open roles at HR Greatly. Help us make HR feel human for thousands of teams worldwide.",
  },
  "/contact": {
    title: "Contact HR Greatly — talk to our team",
    description: "Get in touch with HR Greatly sales, support or partnerships. We typically reply within one business day.",
  },
  "/pricing/plans": {
    title: "Pricing & plans — HR Greatly",
    description: "Simple, transparent pricing for teams of every size. Start free, upgrade when you're ready.",
  },
  "/pricing/free-trial": {
    title: "Free 15-day trial — HR Greatly",
    description: "Start a full-feature free trial of HR Greatly. No credit card, full access for 15 days.",
  },
  "/pricing/enterprise": {
    title: "HR Greatly for Enterprise — built for scale",
    description: "Enterprise-grade HR, payroll and workspace flow with SSO, audit trails and dedicated support.",
  },
  "/blogs": {
    title: "HR Greatly blog — practical HR insights",
    description: "Fresh HR insights, product tips and stories from teams making HR feel human again.",
  },
  "/guides": {
    title: "Guides — step-by-step HR Greatly playbooks",
    description: "Concise playbooks for onboarding, payroll, leave and desk booking with HR Greatly.",
  },
  "/case-studies": {
    title: "Case studies — real HR Greatly customer stories",
    description: "How real teams cut HR admin time and boosted engagement using HR Greatly.",
  },
  "/privacy": {
    title: "Privacy policy — HR Greatly",
    description: "How HR Greatly collects, stores and protects your personal data.",
  },
  "/terms": {
    title: "Terms of service — HR Greatly",
    description: "The terms that govern your use of the HR Greatly platform.",
  },
  "/security": {
    title: "Security at HR Greatly",
    description: "How HR Greatly secures your workforce data: encryption, access control and compliance.",
  },
  "/product/desk-booking": {
    title: "Desk & meeting room booking — HR Greatly",
    description: "Book desks and rooms in seconds with live floor maps. Hybrid teams thrive when the office works around them.",
  },
  "/product/payroll": {
    title: "Payroll software — HR Greatly",
    description: "Run accurate, tax-ready payroll in minutes. Payslips delivered, compliance handled, every cycle.",
  },
  "/product/attendance-leave": {
    title: "Attendance & leave management — HR Greatly",
    description: "Smart sign-in, geo-fencing and one-tap leave approvals. Replace timesheets and spreadsheets.",
  },
  "/product/crm": {
    title: "CRM application — HR Greatly",
    description: "Manage customer relationships alongside your people operations, all in one workspace.",
  },
  "/help": {
    title: "Help & support — HR Greatly",
    description: "Browse common questions, contact our team, or raise a support ticket and track it end-to-end.",
  },
  "/tickets": {
    title: "Support tickets — HR Greatly",
    description: "Raise a new support ticket or track the status of an existing one by ticket number.",
  },
};

const HELP_FAQS = [
  {
    q: "How do I raise a support ticket?",
    a: "Sign in, then click 'Raise a ticket'. Fill in type (Incident or Request), priority (P1–P4), subject and details. You'll receive a unique ticket number to track progress.",
  },
  {
    q: "What do the priority levels (P1–P4) mean?",
    a: "P1 — Critical: immediate response. P2 — High: within hours. P3 — Medium: normal SLA. P4 — Low: scheduled fix.",
  },
  {
    q: "How do I check the status of an existing ticket?",
    a: "Use 'Track by number' on the ticketing tool and enter your ticket number (TKT-YYYY-000000).",
  },
  {
    q: "Who can see my ticket?",
    a: "Only you, your company's admins and HR Greatly platform super admins.",
  },
  {
    q: "I forgot my password — what now?",
    a: "Use the 'Forgot password' link on the login page to reset it via email.",
  },
];

function getMeta(pathname: string): { meta: Meta; canonicalPath: string } {
  if (STATIC_META[pathname]) return { meta: STATIC_META[pathname], canonicalPath: pathname };

  const blogMatch = matchPath("/blogs/:slug", pathname);
  if (blogMatch?.params.slug) {
    const post = blogPosts.find((p) => p.slug === blogMatch.params.slug);
    if (post) {
      return {
        meta: {
          title: `${post.title} — HR Greatly blog`,
          description: post.excerpt,
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.excerpt,
            image: post.image,
            datePublished: post.date,
            author: { "@type": "Organization", name: SITE_NAME },
          },
        },
        canonicalPath: pathname,
      };
    }
  }

  return {
    meta: {
      title: "Page not found — HR Greatly",
      description: "The page you're looking for doesn't exist.",
    },
    canonicalPath: pathname,
  };
}

const SeoHead = () => {
  const { pathname } = useLocation();
  const { meta, canonicalPath } = getMeta(pathname);
  const url = `${SITE_URL}${canonicalPath}`;

  let jsonLd = meta.jsonLd;
  if (pathname === "/help") {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: HELP_FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };
  }

  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={pathname.startsWith("/blogs/") ? "article" : "website"} />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
      {jsonLdArray.map((obj, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(obj)}</script>
      ))}
    </Helmet>
  );
};

export default SeoHead;
