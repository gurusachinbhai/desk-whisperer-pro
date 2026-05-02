import { Link } from "react-router-dom";
import { LogIn, UserPlus, Building2, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";

const Guides = () => (
  <PageLayout
    eyebrow="Guides"
    title="Step-by-step playbooks"
    subtitle="Whether you're an employee logging in for the first time or a company signing up — these guides will get you up and running fast."
  >
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border/60 bg-card p-7 shadow-sm">
        <LogIn className="h-8 w-8 text-primary" />
        <h2 className="mt-3 text-2xl font-extrabold">How to log in</h2>
        <p className="mt-2 text-muted-foreground">For employees who already have an account.</p>
        <ol className="mt-5 space-y-3 text-sm">
          <li><strong>1.</strong> Click the Login button below — or visit hrgreatly.com.</li>
          <li><strong>2.</strong> Enter the work email registered by your HR team.</li>
          <li><strong>3.</strong> Type your password (or use SSO / Google sign-in).</li>
          <li><strong>4.</strong> Forgot your password? Tap "Forgot password" to reset by email.</li>
          <li><strong>5.</strong> You're in — start with attendance, leave or your payslips.</li>
        </ol>
        <Button asChild size="lg" className="mt-6 w-full gap-2">
          <Link to="/login"><LogIn className="h-4 w-4" /> Login to HR Greatly</Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-muted/30 to-secondary/10 p-7 shadow-sm">
        <Building2 className="h-8 w-8 text-primary" />
        <h2 className="mt-3 text-2xl font-extrabold">How your company can sign up</h2>
        <p className="mt-2 text-muted-foreground">For HR leaders setting up a new workspace.</p>
        <ol className="mt-5 space-y-3 text-sm">
          <li><strong>1.</strong> Click "Start free trial" — no credit card required.</li>
          <li><strong>2.</strong> Create your company workspace with a name and admin email.</li>
          <li><strong>3.</strong> Add departments, floors and leave policies in the Admin console.</li>
          <li><strong>4.</strong> Bulk-invite employees via email or CSV upload.</li>
          <li><strong>5.</strong> Run HR on autopilot — for 15 days, all features unlocked.</li>
        </ol>
        <Button asChild size="lg" className="mt-6 w-full gap-2">
          <Link to="/login?mode=signup"><UserPlus className="h-4 w-4" /> Sign up your company</Link>
        </Button>
      </div>
    </div>

    <div className="mt-10 grid gap-5 sm:grid-cols-2">
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <KeyRound className="h-6 w-6 text-primary" />
        <h3 className="mt-3 font-bold">Trouble logging in?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Make sure you're using the email registered by your HR admin. Use "Forgot password" to reset.
        </p>
      </div>
      <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h3 className="mt-3 font-bold">Single sign-on (SSO)</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Enterprise customers can sign in with Google, Okta, Azure AD or any SAML provider.
        </p>
      </div>
    </div>
  </PageLayout>
);

export default Guides;
