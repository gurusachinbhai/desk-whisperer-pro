import { Link } from "react-router-dom";
import { useState } from "react";
import {
  LifeBuoy,
  MapPin,
  LogIn,
  ChevronDown,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import hrgreatlyLogo from "@/assets/hrgreatly-logo.png";

export const navMenus: { label: string; items: { title: string; desc: string; href: string }[] }[] = [
  {
    label: "About us",
    items: [
      { title: "Our Story", desc: "Why we built HR Greatly", href: "/about" },
      { title: "Customers", desc: "Teams who trust us", href: "/customers" },
      { title: "Careers", desc: "Join our mission", href: "/careers" },
      { title: "Contact Us", desc: "Get in touch", href: "/contact" },
    ],
  },
  {
    label: "Pricing",
    items: [
      { title: "Plans", desc: "Simple, transparent pricing", href: "/pricing/plans" },
      { title: "Free Trial", desc: "15 days, full access", href: "/pricing/free-trial" },
      { title: "Enterprise", desc: "Built for scale", href: "/pricing/enterprise" },
    ],
  },
  {
    label: "Blogs",
    items: [
      { title: "Latest Articles", desc: "Fresh HR insights", href: "/blogs" },
      { title: "Guides", desc: "Step-by-step playbooks", href: "/guides" },
      { title: "Case Studies", desc: "Real customer stories", href: "/case-studies" },
    ],
  },
  {
    label: "Partners",
    items: [
      { title: "Become a Partner", desc: "Grow with HR Greatly", href: "/contact" },
      { title: "Integrations", desc: "Tools that play nice", href: "/contact" },
      { title: "Resellers", desc: "Channel programme", href: "/contact" },
    ],
  },
  {
    label: "Product",
    items: [
      { title: "Desk Booking", desc: "Open desks, live floor maps", href: "/product/desk-booking" },
      { title: "HR Payroll Application", desc: "Run payroll without panic", href: "/product/payroll" },
      { title: "HR Attendance & Leave", desc: "Smart sign-in and time off", href: "/product/attendance-leave" },
      { title: "CRM Application", desc: "Customer relationships, simplified", href: "/product/crm" },
    ],
  },
];

const countries = ["India", "Singapore", "USA", "Canada", "UK", "Europe"];

const SiteHeader = () => {
  const [country, setCountry] = useState("India");

  return (
    <>
      {/* Utility top bar */}
      <div className="hidden border-b border-border/60 bg-muted/40 text-xs text-muted-foreground md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-end gap-6 px-4 sm:px-6 lg:px-8">
          <Link to="/help" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <LifeBuoy className="h-3.5 w-3.5" /> Help & Support
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 outline-none transition-colors hover:text-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {country}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {countries.map((c) => (
                <DropdownMenuItem key={c} onClick={() => setCountry(c)}>{c}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/login" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            <LogIn className="h-3.5 w-3.5" /> Login
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex min-h-[100px] max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <img src={hrgreatlyLogo} alt="HR Greatly" className="h-[90px] w-auto" />
            <span className="hidden text-2xl font-extrabold tracking-tight text-primary sm:inline lg:text-3xl">
              HR Greatly
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navMenus.map((m) => (
              <DropdownMenu key={m.label}>
                <DropdownMenuTrigger className="group inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-bold text-foreground outline-none transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
                  {m.label}
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[260px] p-2">
                  {m.items.map((it) => (
                    <DropdownMenuItem key={it.title} asChild className="cursor-pointer rounded-md p-3 focus:bg-primary/10">
                      <Link to={it.href} className="flex flex-col items-start gap-0.5">
                        <span className="text-sm font-semibold text-foreground">{it.title}</span>
                        <span className="text-xs text-muted-foreground">{it.desc}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/login?mode=signup">Sign up</Link>
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto">
                <div className="mt-6 flex items-center gap-2">
                  <img src={hrgreatlyLogo} alt="HR Greatly" className="h-[90px] w-auto" />
                  <span className="text-xl font-extrabold text-primary">HR Greatly</span>
                </div>
                <nav className="mt-8 flex flex-col gap-1">
                  {navMenus.map((m) => (
                    <details key={m.label} className="group rounded-md border border-border/60">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-sm font-bold text-foreground">
                        {m.label}
                        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="flex flex-col border-t border-border/60 bg-muted/30 px-3 py-2">
                        {m.items.map((it) => (
                          <Link
                            key={it.title}
                            to={it.href}
                            className="rounded px-2 py-2 text-sm font-medium text-foreground/80 hover:bg-primary/10 hover:text-primary"
                          >
                            {it.title}
                          </Link>
                        ))}
                      </div>
                    </details>
                  ))}
                </nav>
                <div className="mt-6 flex flex-col gap-2">
                  <Button asChild variant="outline">
                    <Link to="/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/login?mode=signup">Sign up</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
};

export default SiteHeader;
