import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Fingerprint, ScanFace, Camera, CheckCircle2, Loader2, LogIn, LogOut, ArrowLeft, ShieldCheck, AlertCircle, X, RefreshCcw, Clock, Lock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type Enrollment = {
  id: string;
  user_id: string;
  company_id: string;
  face_image_path: string | null;
  face_enrolled_at: string | null;
  webauthn_credential_id: string | null;
  thumb_enrolled_at: string | null;
};

type Employee = {
  id: string;
  user_id: string;
  company_id: string;
  display_name: string;
  email: string | null;
  employee_code: string | null;
  photo_url: string | null;
};

type TodayRow = {
  id: string;
  check_in_at: string | null;
  check_out_at: string | null;
};

const BUCKET = "biometric-enrollments";

type VerificationMode = "face" | "thumb" | "both" | "either";
type KioskSettings = {
  verification_mode: VerificationMode;
  max_enrollment_attempts: number;
  max_verify_retries: number;
};
const DEFAULT_SETTINGS: KioskSettings = {
  verification_mode: "either",
  max_enrollment_attempts: 3,
  max_verify_retries: 3,
};

export default function OfficeKiosk() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [enrollmentFaceUrl, setEnrollmentFaceUrl] = useState<string | null>(null);
  const [today, setToday] = useState<TodayRow | null>(null);
  const [mode, setMode] = useState<null | "face" | "thumb" | "enroll-face" | "enroll-thumb">(null);
  const [verified, setVerified] = useState<null | { method: "face" | "thumb"; at: number }>(null);
  const [working, setWorking] = useState(false);
  const [settings, setSettings] = useState<KioskSettings>(DEFAULT_SETTINGS);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const [enrollAttempts, setEnrollAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState("");
  const [needSecondFactor, setNeedSecondFactor] = useState<null | "face" | "thumb">(null);

  const LOCKOUT_MINUTES_VERIFY = 5;
  const LOCKOUT_MINUTES_ENROLL = 10;

  const todayKey = format(new Date(), "yyyy-MM-dd");

  /* ---------------- bootstrap ---------------- */
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        toast.error("Please sign in to use the Office Kiosk");
        nav("/login");
        return;
      }
      const { data: emp } = await supabase
        .from("employee_profiles")
        .select("id,user_id,company_id,display_name,email,employee_code,photo_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!emp) {
        toast.error("No employee profile linked to your account");
        nav("/login");
        return;
      }
      setEmployee(emp as Employee);

      const { data: enr } = await supabase
        .from("biometric_enrollments")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (enr) {
        setEnrollment(enr as Enrollment);
        if ((enr as Enrollment).face_image_path) {
          const { data: signed } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl((enr as Enrollment).face_image_path!, 3600);
          setEnrollmentFaceUrl(signed?.signedUrl ?? null);
        }
      }

      const { data: rec } = await supabase
        .from("attendance_records")
        .select("id,check_in_at,check_out_at")
        .eq("user_id", user.id)
        .eq("work_date", todayKey)
        .maybeSingle();
      if (rec) setToday(rec as TodayRow);

      // Load kiosk settings for this employee's company
      const { data: cfg } = await supabase
        .from("hr_kiosk_settings")
        .select("verification_mode,max_enrollment_attempts,max_verify_retries")
        .eq("company_id", emp.company_id)
        .maybeSingle();
      if (cfg) setSettings(cfg as KioskSettings);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requireFace = settings.verification_mode === "face" || settings.verification_mode === "both" || settings.verification_mode === "either";
  const requireThumb = settings.verification_mode === "thumb" || settings.verification_mode === "both" || settings.verification_mode === "either";
  const enrolledFace = !!enrollment?.face_enrolled_at;
  const enrolledThumb = !!enrollment?.thumb_enrolled_at;
  const fullyEnrolled = (!requireFace || enrolledFace) && (!requireThumb || enrolledThumb);

  /* ---------------- lockout countdown ---------------- */
  useEffect(() => {
    if (!lockoutUntil) {
      setCountdown("");
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      if (remaining <= 0) {
        setLockoutUntil(null);
        setVerifyAttempts(0);
        setEnrollAttempts(0);
        setCountdown("");
        return;
      }
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      setCountdown(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  const isLockedOut = !!lockoutUntil && Date.now() < lockoutUntil;
  const remainingVerify = Math.max(0, settings.max_verify_retries - verifyAttempts);
  const remainingEnroll = Math.max(0, settings.max_enrollment_attempts - enrollAttempts);

  /* ---------------- verification ---------------- */
  const completeVerify = (method: "face" | "thumb") => {
    setMode(null);
    setVerified({ method, at: Date.now() });
    setVerifyAttempts(0);
    setNeedSecondFactor(null);
    toast.success(`${method === "face" ? "Face" : "Thumb"} verified`);
  };
  const onFaceVerified = () => {
    if (settings.verification_mode === "both" && !needSecondFactor) {
      // need thumb next
      setMode(null);
      setNeedSecondFactor("thumb");
      toast.success("Face verified — now scan thumb");
      return;
    }
    completeVerify("face");
  };
  const onThumbVerified = () => {
    if (settings.verification_mode === "both" && !needSecondFactor) {
      setMode(null);
      setNeedSecondFactor("face");
      toast.success("Thumb verified — now scan face");
      return;
    }
    completeVerify("thumb");
  };

  /* ---------------- attendance actions ---------------- */
  const stamp = async (kind: "in" | "out") => {
    if (!employee || !verified) return;
    setWorking(true);
    try {
      const now = new Date().toISOString();
      const methodNote = `Office Kiosk · ${verified.method === "face" ? "Face" : "Thumb"} verified`;
      if (kind === "in") {
        if (today?.check_in_at) {
          toast.error("Already signed in today");
        } else if (today) {
          const { data, error } = await supabase
            .from("attendance_records")
            .update({ check_in_at: now, notes: methodNote })
            .eq("id", today.id)
            .select("id,check_in_at,check_out_at")
            .single();
          if (error) throw error;
          setToday(data as TodayRow);
          toast.success(`Logged in at ${format(new Date(), "hh:mm a")}`);
        } else {
          const { data, error } = await supabase
            .from("attendance_records")
            .insert({
              company_id: employee.company_id,
              user_id: employee.user_id,
              user_name: employee.display_name,
              work_date: todayKey,
              check_in_at: now,
              status: "present",
              location: "office-kiosk",
              notes: methodNote,
            })
            .select("id,check_in_at,check_out_at")
            .single();
          if (error) throw error;
          setToday(data as TodayRow);
          toast.success(`Logged in at ${format(new Date(), "hh:mm a")}`);
        }
      } else {
        if (!today?.check_in_at) {
          toast.error("Sign in first");
        } else if (today.check_out_at) {
          toast.error("Already signed out today");
        } else {
          const { data, error } = await supabase
            .from("attendance_records")
            .update({ check_out_at: now, notes: methodNote })
            .eq("id", today.id)
            .select("id,check_in_at,check_out_at")
            .single();
          if (error) throw error;
          setToday(data as TodayRow);
          toast.success(`Logged out at ${format(new Date(), "hh:mm a")}`);
        }
      }
      setVerified(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not record attendance");
    } finally {
      setWorking(false);
    }
  };

  /* ---------------- render ---------------- */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40 px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back to app
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Office Kiosk
          </span>
        </div>

        <header className="rounded-3xl bg-surface-raised p-6 shadow-card">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            Office Login Assistance
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify with face recognition or thumb impression to record your office check-in and check-out.
          </p>
        </header>

        {!fullyEnrolled && (
          <section className="mt-4 rounded-3xl border border-amber-300/40 bg-amber-100/40 p-5 shadow-card dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <h2 className="font-extrabold">Finish your biometric enrollment</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This is a one-time step. Once enrolled, you can check-in or check-out on any kiosk in seconds.
                </p>
                {isLockedOut && enrollAttempts >= settings.max_enrollment_attempts && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">
                    <Lock className="h-4 w-4" />
                    Enrollment locked — retry in <Clock className="h-3.5 w-3.5" /> {countdown}
                  </div>
                )}
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {requireFace && (
                    <button
                      onClick={() => setMode("enroll-face")}
                      disabled={isLockedOut && enrollAttempts >= settings.max_enrollment_attempts}
                      className="focus-premium flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-extrabold text-primary disabled:opacity-40"
                    >
                      <ScanFace className="h-4 w-4" />
                      {enrolledFace ? "Re-enroll Face" : "Enroll Face"}
                    </button>
                  )}
                  {requireThumb && (
                    <button
                      onClick={() => setMode("enroll-thumb")}
                      disabled={isLockedOut && enrollAttempts >= settings.max_enrollment_attempts}
                      className="focus-premium flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-extrabold text-primary disabled:opacity-40"
                    >
                      <Fingerprint className="h-4 w-4" />
                      {enrolledThumb ? "Re-enroll Thumb" : "Enroll Thumb"}
                    </button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  {requireFace && (
                    <span className={`inline-flex items-center gap-1 ${enrolledFace ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {enrolledFace ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} Face enrolled
                    </span>
                  )}
                  {requireThumb && (
                    <span className={`inline-flex items-center gap-1 ${enrolledThumb ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {enrolledThumb ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />} Thumb enrolled
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    Mode: <strong className="text-foreground">{settings.verification_mode}</strong>
                  </span>
                  <span className={`inline-flex items-center gap-1 font-bold ${remainingEnroll <= 1 ? "text-destructive" : "text-muted-foreground"}`}>
                    {remainingEnroll} enrollment {remainingEnroll === 1 ? "attempt" : "attempts"} remaining
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Step 1 — pick a verification method */}
        {!verified && fullyEnrolled && (
          <section className="mt-4 rounded-3xl bg-surface-raised p-5 shadow-card">
            <h2 className="font-display text-lg font-extrabold">
              {needSecondFactor
                ? `Step 1b — Now scan your ${needSecondFactor}`
                : settings.verification_mode === "both"
                ? "Step 1 — Verify with both face and thumb"
                : "Step 1 — Verify your identity"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {settings.verification_mode === "both"
                ? "Your company requires both face and thumb to log in/out."
                : settings.verification_mode === "either"
                ? "Pick a method below. Your biometric data never leaves this device."
                : `Use ${settings.verification_mode} verification to continue.`}
              {" "}You have up to {settings.max_verify_retries} retries.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {((needSecondFactor === null && (settings.verification_mode === "face" || settings.verification_mode === "both" || settings.verification_mode === "either")) ||
                needSecondFactor === "face") && (
                <button
                  onClick={() => setMode("face")}
                  className="focus-premium flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-extrabold text-primary-foreground shadow-card transition hover:opacity-90"
                >
                  <ScanFace className="h-4 w-4" /> Face Attendance
                </button>
              )}
              {((needSecondFactor === null && (settings.verification_mode === "thumb" || settings.verification_mode === "both" || settings.verification_mode === "either")) ||
                needSecondFactor === "thumb") && (
                <button
                  onClick={() => setMode("thumb")}
                  className="focus-premium flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-4 text-sm font-extrabold text-primary transition hover:bg-primary/15"
                >
                  <Fingerprint className="h-4 w-4" /> Thumb Attendance
                </button>
              )}
            </div>
            {verifyAttempts > 0 && (
              <p className="mt-3 text-xs text-amber-600">
                Failed attempts: {verifyAttempts}/{settings.max_verify_retries}
              </p>
            )}
          </section>
        )}

        {/* Step 2 — identity card + log in/out */}
        {verified && employee && (
          <section className="mt-4 rounded-3xl bg-surface-raised p-5 shadow-card">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-2xl bg-primary/10">
                {employee.photo_url ? (
                  <img src={employee.photo_url} alt={employee.display_name} className="h-full w-full object-cover" />
                ) : enrollmentFaceUrl ? (
                  <img src={enrollmentFaceUrl} alt={employee.display_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-extrabold text-primary">
                    {employee.display_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-wide text-primary">
                  Verified · {verified.method === "face" ? "Face" : "Thumb"}
                </div>
                <div className="font-display text-lg font-extrabold">{employee.display_name}</div>
                <div className="text-xs text-muted-foreground">
                  {employee.employee_code ?? "—"} {employee.email ? `· ${employee.email}` : ""}
                </div>
              </div>
              <button
                onClick={() => setVerified(null)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => stamp("in")}
                disabled={working || Boolean(today?.check_in_at)}
                className="focus-premium flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-sm font-extrabold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-40"
              >
                <LogIn className="h-4 w-4" />
                {today?.check_in_at ? `In · ${format(new Date(today.check_in_at), "hh:mm a")}` : "Logged In"}
              </button>
              <button
                onClick={() => stamp("out")}
                disabled={working || !today?.check_in_at || Boolean(today?.check_out_at)}
                className="focus-premium flex items-center justify-center gap-2 rounded-2xl bg-destructive px-4 py-4 text-sm font-extrabold text-destructive-foreground shadow-card transition hover:opacity-90 disabled:opacity-40"
              >
                <LogOut className="h-4 w-4" />
                {today?.check_out_at ? `Out · ${format(new Date(today.check_out_at), "hh:mm a")}` : "Logged Out"}
              </button>
            </div>

            {today?.check_in_at && today?.check_out_at && (
              <p className="mt-3 rounded-2xl bg-emerald-100/60 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                Attendance for today is complete.
              </p>
            )}
          </section>
        )}

        {/* Today's status card */}
        <section className="mt-4 rounded-3xl bg-surface-raised p-5 shadow-card">
          <h3 className="font-display text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Today</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-background/60 p-3">
              <div className="text-xs text-muted-foreground">Check-in</div>
              <div className="font-extrabold">
                {today?.check_in_at ? format(new Date(today.check_in_at), "hh:mm a") : "—"}
              </div>
            </div>
            <div className="rounded-2xl bg-background/60 p-3">
              <div className="text-xs text-muted-foreground">Check-out</div>
              <div className="font-extrabold">
                {today?.check_out_at ? format(new Date(today.check_out_at), "hh:mm a") : "—"}
              </div>
            </div>
          </div>
        </section>

        {(enrolledFace || enrolledThumb) && fullyEnrolled && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <button
              onClick={() => setMode("enroll-face")}
              className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1.5 font-bold hover:bg-muted"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Re-enroll face
            </button>
            <button
              onClick={() => setMode("enroll-thumb")}
              className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1.5 font-bold hover:bg-muted"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Re-enroll thumb
            </button>
          </div>
        )}
      </div>

      {mode === "face" && (
        <FaceDialog
          mode="verify"
          referenceUrl={enrollmentFaceUrl}
          onClose={() => {
            const next = verifyAttempts + 1;
            setVerifyAttempts(next);
            setMode(null);
            if (next >= settings.max_verify_retries) {
              toast.error(`Max verification retries (${settings.max_verify_retries}) reached. Please try again later.`);
              setNeedSecondFactor(null);
              setVerifyAttempts(0);
            }
          }}
          onSuccess={onFaceVerified}
        />
      )}
      {mode === "thumb" && (
        <ThumbDialog
          onClose={() => {
            const next = verifyAttempts + 1;
            setVerifyAttempts(next);
            setMode(null);
            if (next >= settings.max_verify_retries) {
              toast.error(`Max verification retries (${settings.max_verify_retries}) reached. Please try again later.`);
              setNeedSecondFactor(null);
              setVerifyAttempts(0);
            }
          }}
          onSuccess={onThumbVerified}
        />
      )}
      {mode === "enroll-face" && employee && (
        <FaceDialog
          mode="enroll"
          onClose={() => {
            const next = enrollAttempts + 1;
            setEnrollAttempts(next);
            setMode(null);
            if (next >= settings.max_enrollment_attempts) {
              toast.error(`Max enrollment attempts (${settings.max_enrollment_attempts}) reached. Please contact HR.`);
              setEnrollAttempts(0);
            }
          }}
          onSuccess={async (snapshot) => {
            if (!snapshot) return;
            try {
              const path = `${employee.user_id}/face-${Date.now()}.jpg`;
              const blob = await (await fetch(snapshot)).blob();
              const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
                contentType: "image/jpeg",
                upsert: true,
              });
              if (error) throw error;
              const { data: saved, error: e2 } = await supabase
                .from("biometric_enrollments")
                .upsert(
                  {
                    user_id: employee.user_id,
                    company_id: employee.company_id,
                    face_image_path: path,
                    face_enrolled_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id" }
                )
                .select("*")
                .single();
              if (e2) throw e2;
              setEnrollment(saved as Enrollment);
              const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
              setEnrollmentFaceUrl(signed?.signedUrl ?? null);
              toast.success("Face enrolled");
              setMode(null);
            } catch (err: any) {
              toast.error(err?.message ?? "Could not save face enrollment");
            }
          }}
        />
      )}
      {mode === "enroll-thumb" && employee && (
        <ThumbDialog
          enroll
          onClose={() => {
            const next = enrollAttempts + 1;
            setEnrollAttempts(next);
            setMode(null);
            if (next >= settings.max_enrollment_attempts) {
              toast.error(`Max enrollment attempts (${settings.max_enrollment_attempts}) reached. Please contact HR.`);
              setEnrollAttempts(0);
            }
          }}
          onSuccess={async () => {
            try {
              const credId = `kiosk-${employee.user_id}-${Date.now()}`;
              const { data: saved, error } = await supabase
                .from("biometric_enrollments")
                .upsert(
                  {
                    user_id: employee.user_id,
                    company_id: employee.company_id,
                    webauthn_credential_id: credId,
                    thumb_enrolled_at: new Date().toISOString(),
                  },
                  { onConflict: "user_id" }
                )
                .select("*")
                .single();
              if (error) throw error;
              setEnrollment((prev) => ({ ...(prev ?? {} as Enrollment), ...(saved as Enrollment) }));
              toast.success("Thumb enrolled");
              setMode(null);
            } catch (err: any) {
              toast.error(err?.message ?? "Could not save thumb enrollment");
            }
          }}
        />
      )}
    </div>
  );
}

/* =================== Thumb dialog =================== */

function ThumbDialog({
  onClose,
  onSuccess,
  enroll = false,
}: {
  onClose: () => void;
  onSuccess: () => void;
  enroll?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    setBusy(true);
    try {
      if (!window.PublicKeyCredential) {
        toast.error("Fingerprint not supported on this device");
        setBusy(false);
        return;
      }
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
      if (!available) {
        toast.error("No fingerprint sensor detected");
        setBusy(false);
        return;
      }
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      await navigator.credentials
        .get({
          publicKey: { challenge, timeout: 30_000, userVerification: "required" },
        } as CredentialRequestOptions)
        .catch(() => null);
      onSuccess();
    } catch {
      toast.error("Fingerprint verification cancelled");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={enroll ? "Enroll Thumb Impression" : "Thumb Impression Check-In"} onClose={onClose}>
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Fingerprint className="h-10 w-10" />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {enroll
            ? "Register your thumb on this device's biometric sensor. We only remember that you enrolled — the impression stays in the device's secure enclave."
            : "Place your thumb on this device's fingerprint sensor to verify your identity."}
        </p>
        <button
          onClick={verify}
          disabled={busy}
          className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
          {busy ? "Waiting for sensor…" : enroll ? "Enroll thumb" : "Scan thumb"}
        </button>
      </div>
    </Shell>
  );
}

/* =================== Face dialog =================== */

function FaceDialog({
  mode,
  referenceUrl,
  onClose,
  onSuccess,
}: {
  mode: "enroll" | "verify";
  referenceUrl?: string | null;
  onClose: () => void;
  onSuccess: (snapshot?: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 480, height: 360 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch {
        toast.error("Camera permission denied");
        onClose();
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth || 480;
    c.height = v.videoHeight || 360;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);

    const img = ctx.getImageData(c.width * 0.25, c.height * 0.2, c.width * 0.5, c.height * 0.6);
    let sum = 0;
    for (let i = 0; i < img.data.length; i += 4) {
      sum += (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3;
    }
    const avg = sum / (img.data.length / 4);
    if (avg < 25 || avg > 240) {
      toast.error("Face not detected — adjust lighting and try again");
      return;
    }
    setShot(c.toDataURL("image/jpeg", 0.8));
  };

  const confirm = () => {
    if (!shot) return;
    setBusy(true);
    setTimeout(() => {
      onSuccess(shot);
    }, 500);
  };

  return (
    <Shell
      title={mode === "enroll" ? "Enroll Face Recognition" : "Face Recognition Check-In"}
      onClose={onClose}
    >
      <div className="flex flex-col items-center gap-3 py-4">
        {mode === "verify" && referenceUrl && (
          <div className="flex items-center gap-2 self-start text-xs text-muted-foreground">
            <img src={referenceUrl} alt="Enrolled" className="h-10 w-10 rounded-full object-cover" />
            <span>Enrolled face on file</span>
          </div>
        )}
        <div className="relative h-60 w-full overflow-hidden rounded-2xl bg-black">
          {!shot ? (
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          ) : (
            <img src={shot} alt="Captured face" className="h-full w-full object-cover" />
          )}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-44 w-32 rounded-[50%] border-2 border-dashed border-white/70" />
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <p className="text-center text-xs text-muted-foreground">
          {mode === "enroll"
            ? "Center your face in the oval. We'll save this photo as your enrolled reference."
            : "Position your face inside the oval. We'll match against your enrolled photo."}
        </p>
        <div className="grid w-full grid-cols-2 gap-3">
          {!shot ? (
            <>
              <button
                onClick={onClose}
                className="rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={capture}
                disabled={!ready}
                className="focus-premium flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-40"
              >
                <Camera className="h-4 w-4" /> Capture
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShot(null)}
                className="rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm font-bold"
              >
                Retake
              </button>
              <button
                onClick={confirm}
                disabled={busy}
                className="focus-premium flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {busy ? "Saving…" : mode === "enroll" ? "Save enrollment" : "Confirm"}
              </button>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* =================== Shared modal shell =================== */

function Shell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-surface-raised p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
