// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://www.hrgreatly.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const blogSlugs = [
  "how-to-use-hr-greatly",
  "how-to-login",
  "how-to-book-your-seat",
  "how-to-apply-for-leave",
  "how-to-mark-attendance",
];

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/customers", changefreq: "monthly", priority: "0.7" },
  { path: "/careers", changefreq: "weekly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/pricing/plans", changefreq: "monthly", priority: "0.9" },
  { path: "/pricing/free-trial", changefreq: "monthly", priority: "0.8" },
  { path: "/pricing/enterprise", changefreq: "monthly", priority: "0.8" },
  { path: "/product/desk-booking", changefreq: "monthly", priority: "0.8" },
  { path: "/product/payroll", changefreq: "monthly", priority: "0.8" },
  { path: "/product/attendance-leave", changefreq: "monthly", priority: "0.8" },
  { path: "/product/crm", changefreq: "monthly", priority: "0.8" },
  { path: "/blogs", changefreq: "weekly", priority: "0.7" },
  { path: "/guides", changefreq: "monthly", priority: "0.6" },
  { path: "/case-studies", changefreq: "monthly", priority: "0.6" },
  { path: "/help", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/security", changefreq: "yearly", priority: "0.4" },
  ...blogSlugs.map((slug) => ({ path: `/blogs/${slug}`, changefreq: "monthly" as const, priority: "0.6" })),
];

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  ),
  `</urlset>`,
].join("\n");

writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${entries.length} entries)`);
