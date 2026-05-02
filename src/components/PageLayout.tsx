import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import hrgreatlyLogo from "@/assets/hrgreatly-logo.png";

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
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
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

      <main className={`mx-auto ${widthClass} px-4 py-12 sm:px-6 sm:py-16`}>{children}</main>

      <footer className="border-t border-border/60 bg-muted/30 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} HR Greatly. Made with care for people-first teams.
      </footer>
    </div>
  );
};

export default PageLayout;
