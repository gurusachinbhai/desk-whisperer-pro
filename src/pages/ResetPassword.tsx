import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { KeyRound, ShieldCheck } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash; the SDK exchanges it
    // for a session automatically. We just listen for the PASSWORD_RECOVERY
    // event (or an existing session) before letting the user submit.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't update password", { description: error.message });
      return;
    }
    toast.success("Password updated", { description: "You can now sign in with your new password." });
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold">Reset your password</h1>
              <p className="text-xs font-semibold text-muted-foreground">
                Choose a new password for your HR Greatly account.
              </p>
            </div>
          </div>

          {!ready ? (
            <p className="rounded-xl bg-muted p-3 text-sm font-semibold text-muted-foreground">
              Verifying your reset link… If nothing happens, request a new link from the login page.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  New password
                </span>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Confirm password
                </span>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1"
                  autoComplete="new-password"
                />
              </label>
              <Button type="submit" disabled={submitting} className="w-full">
                <ShieldCheck className="mr-2 h-4 w-4" />
                {submitting ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
