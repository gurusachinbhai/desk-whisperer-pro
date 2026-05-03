import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import hrgreatlyLogo from "@/assets/hrgreatly-logo.png";

const SiteFooter = () => (
  <footer className="border-t border-border/60 bg-muted/20">
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-foreground">Product</p>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          <li><Link to="/#features" className="hover:text-foreground">Features</Link></li>
          <li><Link to="/#how" className="hover:text-foreground">How it works</Link></li>
          <li><Link to="/blogs" className="hover:text-foreground">Blogs</Link></li>
          <li><Link to="/guides" className="hover:text-foreground">Guides</Link></li>
          <li><Link to="/case-studies" className="hover:text-foreground">Case Studies</Link></li>
        </ul>
      </div>

      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-foreground">Customer</p>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          <li><a href="mailto:support@hrgreatly.com" className="hover:text-foreground">Help & Support</a></li>
          <li><Link to="/login" className="hover:text-foreground">Login</Link></li>
          <li><Link to="/login?mode=signup" className="hover:text-foreground">Sign up</Link></li>
          <li><Link to="/contact" className="hover:text-foreground">Contact Us</Link></li>
        </ul>
      </div>

      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-foreground">About us</p>
        <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
          <li><Link to="/about" className="hover:text-foreground">Our Story</Link></li>
          <li><Link to="/customers" className="hover:text-foreground">Customers</Link></li>
          <li><Link to="/careers" className="hover:text-foreground">Careers</Link></li>
          <li><Link to="/pricing/plans" className="hover:text-foreground">Plans & Pricing</Link></li>
          <li><Link to="/pricing/enterprise" className="hover:text-foreground">Enterprise</Link></li>
        </ul>
      </div>

      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-foreground">Stay in touch</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Get product updates, hiring tips and HR insights delivered every other week.
        </p>
        <form className="mt-4 flex gap-2">
          <input
            type="email"
            placeholder="you@company.com"
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button size="sm" type="submit">Subscribe</Button>
        </form>
        <div className="mt-5 flex gap-3 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <span>·</span>
          <Link to="/security" className="hover:text-foreground">Security</Link>
        </div>
      </div>
    </div>

    <div className="border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <img src={hrgreatlyLogo} alt="HR Greatly" className="h-20 w-auto sm:h-24" />
          <div>
            <p className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">HR Greatly</p>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              Sector 17, Chandigarh, Punjab, India — Pin 140603
            </p>
          </div>
        </div>
      </div>
    </div>

    <div className="border-t border-border/60 bg-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} HR Greatly Software | UBID INDIA SOLUTIONS</p>
        <p>Address: Punjab, India</p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
