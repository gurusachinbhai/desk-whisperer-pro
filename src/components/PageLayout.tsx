import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

interface PageLayoutProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  heroImage?: string;
  children: React.ReactNode;
  maxWidth?: "md" | "lg" | "xl";
}

const PageLayout = ({ eyebrow, title, subtitle, heroImage, children, maxWidth = "lg" }: PageLayoutProps) => {
  const widthClass =
    maxWidth === "md" ? "max-w-3xl" : maxWidth === "xl" ? "max-w-6xl" : "max-w-5xl";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/10 via-muted/30 to-secondary/10">
        <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 sm:py-20">
          {eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-4 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">{subtitle}</p>
          )}
          {heroImage && (
            <div className="mx-auto mt-10 overflow-hidden rounded-2xl border border-border/60 shadow-lg">
              <img src={heroImage} alt={title} className="h-72 w-full object-cover sm:h-96" loading="lazy" />
            </div>
          )}
        </div>
      </section>

      <div className={`mx-auto ${widthClass} px-4 py-12 sm:px-6 sm:py-16`}>{children}</div>

      <SiteFooter />
    </div>
  );
};

export default PageLayout;
