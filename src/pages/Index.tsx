import {
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  DoorOpen,
  KeyRound,
  Mail,
  MapPin,
  QrCode,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sofa,
  UserPlus,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

type Desk = {
  dbId?: string;
  id: string;
  x: string;
  y: string;
  status: "available" | "occupied";
  label: string;
};

type CompanyForm = {
  companyName: string;
  orgCode: string;
  displayName: string;
  email: string;
};

type InviteForm = {
  employeeName: string;
  employeeEmail: string;
};

type CompanyProfile = {
  id: string;
  name: string;
  organization_code: string;
};

type EmployeeInvite = {
  id: string;
  employee_name: string;
  employee_email: string;
  invite_token: string;
  status: string;
  expires_at: string;
};

type AppMode = "signup" | "login";
type ActiveTab = "home" | "book" | "map" | "admin" | "team";
type LoginStep = "form" | "otp";
type LoginIdentifier = "email" | "phone";

type SignupForm = {
  companyName: string;
  orgCode: string;
  displayName: string;
  email: string;
  phone: string;
};

type LoginMethod = "password" | "otp";

type LoginForm = {
  orgCode: string;
  identifier: string; // email or phone
  identifierKind: LoginIdentifier;
  password: string;
  method: LoginMethod;
};

const initialDesks: Desk[] = [
  { id: "A1", x: "16%", y: "24%", status: "available", label: "Standing" },
  { id: "A2", x: "34%", y: "24%", status: "occupied", label: "Dual" },
  { id: "A3", x: "52%", y: "24%", status: "available", label: "Window" },
  { id: "B1", x: "23%", y: "48%", status: "available", label: "Quiet" },
  { id: "B2", x: "44%", y: "51%", status: "occupied", label: "Focus" },
  { id: "B3", x: "66%", y: "45%", status: "available", label: "Team" },
  { id: "C1", x: "30%", y: "74%", status: "occupied", label: "Near Mia" },
  { id: "C2", x: "56%", y: "72%", status: "available", label: "Monitor" },
];

const timeSlots = ["Full Day", "Morning", "Afternoon"];

const floorOptions = [1, 2, 3, 4, 5, 6];
const seatRows = ["A", "B", "C", "D", "E"] as const;
const seatColumns = [1, 2, 3, 4] as const;
const meetingRooms = ["M01", "M02", "M03", "M04", "M05"] as const;
const hourlyTimeSlots = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
  "08:00 PM",
] as const;
type BookingKind = "desk" | "room";

const bottomTabs: { id: ActiveTab; icon: typeof CalendarCheck; label: string }[] = [
  { id: "home", icon: MapPin, label: "Home" },
  { id: "book", icon: CalendarCheck, label: "Book" },
  { id: "map", icon: MapPin, label: "Map" },
  { id: "admin", icon: BarChart3, label: "Admin" },
  { id: "team", icon: Users, label: "Team" },
];

const getClientSessionId = () => {
  const storageKey = "deskflow-client-session-id";
  const existingSessionId = window.localStorage.getItem(storageKey);
  if (existingSessionId) return existingSessionId;

  const nextSessionId = window.crypto.randomUUID();
  window.localStorage.setItem(storageKey, nextSessionId);
  return nextSessionId;
};

const normalizeOrgCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);

const createInviteUrl = (token: string) => `${window.location.origin}/?invite=${token}`;

const Index = () => {
  const [mode, setMode] = useState<AppMode>("login");
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [signupForm, setSignupForm] = useState<SignupForm>({
    companyName: "",
    orgCode: "",
    displayName: "",
    email: "",
    phone: "",
  });
  const [loginForm, setLoginForm] = useState<LoginForm>({
    orgCode: "",
    identifier: "",
    identifierKind: "email",
    password: "",
    method: "password",
  });
  const [loginStep, setLoginStep] = useState<LoginStep>("form");
  const [otpCode, setOtpCode] = useState("");
  const [pendingLogin, setPendingLogin] = useState<{ email: string; orgCode: string; companyName: string } | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({ employeeName: "", employeeEmail: "" });
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [invites, setInvites] = useState<EmployeeInvite[]>([]);
  const [latestInviteUrl, setLatestInviteUrl] = useState("");
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [desks, setDesks] = useState(initialDesks);
  const [selectedDeskId, setSelectedDeskId] = useState("A1");
  const [selectedSlot, setSelectedSlot] = useState("Morning");
  const [isLoadingDesks, setIsLoadingDesks] = useState(true);
  const [isBookingDesk, setIsBookingDesk] = useState(false);
  const [bookingText, setBookingText] = useState("No active booking yet");
  const [clientSessionId] = useState(getClientSessionId);

  // New booking selection state (floor / seat / room / hourly slot)
  const [bookingKind, setBookingKind] = useState<BookingKind>("desk");
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedSeat, setSelectedSeat] = useState<string>("A1");
  const [selectedRoom, setSelectedRoom] = useState<string>("M01");
  const [selectedHourlySlot, setSelectedHourlySlot] = useState<string>("09:00 AM");
  const [confirmedBookings, setConfirmedBookings] = useState<
    { id: string; kind: BookingKind; floor: number; spot: string; time: string }[]
  >([]);

  const selectedDesk = useMemo(() => desks.find((desk) => desk.id === selectedDeskId), [desks, selectedDeskId]);
  const availableCount = desks.filter((desk) => desk.status === "available").length;
  const inviteToken = new URLSearchParams(window.location.search).get("invite");

  const loadEmployerWorkspace = async () => {
    const { data: roles } = await supabase.from("user_roles").select("company_id, role").eq("role", "admin").limit(1);
    const adminRole = roles?.[0];
    if (!adminRole?.company_id) return;

    setIsAdmin(true);
    const { data: company } = await supabase
      .from("company_profiles")
      .select("id, name, organization_code")
      .eq("id", adminRole.company_id)
      .maybeSingle();

    if (company) {
      setCompanyProfile(company);
      setActiveTab("home");
      await loadInvites(company.id);
    }
  };

  const loadInvites = async (companyId: string) => {
    const { data, error } = await supabase
      .from("employee_invites" as never)
      .select("id, employee_name, employee_email, invite_token, status, expires_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) return;
    setInvites((data ?? []) as unknown as EmployeeInvite[]);
  };

  useEffect(() => {
    const loadSession = async () => {
      await loadEmployerWorkspace();
    };

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => loadEmployerWorkspace(), 0);
    });

    loadSession();
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const acceptInvite = async () => {
      if (!inviteToken) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { error } = await (supabase.rpc as any)("accept_employee_invite", {
        _invite_token: inviteToken,
        _display_name: signupForm.displayName || null,
        _email: signupForm.email || null,
      });

      if (error) {
        toast.error("Invitation could not be accepted", { description: error.message });
        return;
      }

      toast.success("Employee login created", { description: "You can now book desks from this company workspace." });
      setActiveTab("book");
      window.history.replaceState({}, "", window.location.pathname);
    };

    acceptInvite();
  }, [inviteToken]);

  useEffect(() => {
    const loadDesks = async () => {
      const { data, error } = await supabase
        .from("deskflow_desks")
        .select("id, code, label, x_position, y_position, status")
        .order("code", { ascending: true });

      if (error) {
        toast.error("Could not load live desk availability", { description: error.message });
        setIsLoadingDesks(false);
        return;
      }

      setDesks(data.map((desk) => ({
        dbId: desk.id,
        id: desk.code,
        label: desk.label,
        x: desk.x_position,
        y: desk.y_position,
        status: desk.status,
      })));
      setIsLoadingDesks(false);
    };

    loadDesks();

    const channel = supabase
      .channel("deskflow-android-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "deskflow_desks" }, (payload) => {
        const liveDesk = payload.new as {
          id: string;
          code: string;
          label: string;
          x_position: string;
          y_position: string;
          status: "available" | "occupied";
        };

        setDesks((currentDesks) =>
          currentDesks.map((desk) =>
            desk.dbId === liveDesk.id || desk.id === liveDesk.code
              ? {
                  dbId: liveDesk.id,
                  id: liveDesk.code,
                  label: liveDesk.label,
                  x: liveDesk.x_position,
                  y: liveDesk.y_position,
                  status: liveDesk.status,
                }
              : desk,
          ),
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateSignupForm = (field: keyof SignupForm, value: string) => {
    setSignupForm((current) => ({
      ...current,
      [field]: field === "orgCode" ? normalizeOrgCode(value) : value,
    }));
  };

  const updateLoginForm = (field: keyof LoginForm, value: string) => {
    setLoginForm((current) => ({
      ...current,
      [field]: field === "orgCode" ? normalizeOrgCode(value) : value,
    }));
  };

  const handleGoogleLogin = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { prompt: "select_account" },
    });

    if (result.error) {
      toast.error("Google sign-in failed", { description: result.error.message });
    }
  };

  // Employee signup → creates directory record, then sends OTP to email
  const handleEmployeeSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (signupForm.companyName.trim().length < 2) {
      toast.error("Company name required");
      return;
    }
    if (signupForm.orgCode.length < 3) {
      toast.error("Company code must be at least 3 characters");
      return;
    }
    if (signupForm.displayName.trim().length < 2) {
      toast.error("Your name is required");
      return;
    }
    if (!signupForm.email.includes("@")) {
      toast.error("Valid email is required");
      return;
    }

    setIsSubmittingSignup(true);
    try {
      const { error: signupError } = await (supabase.rpc as any)("signup_employee_record", {
        _organization_code: signupForm.orgCode,
        _company_name: signupForm.companyName,
        _display_name: signupForm.displayName,
        _employee_email: signupForm.email,
        _phone: signupForm.phone || null,
      });

      if (signupError) {
        toast.error("Signup failed", { description: signupError.message });
        return;
      }

      // Send OTP to the employee's email
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: signupForm.email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });

      if (otpError) {
        toast.error("Could not send OTP", { description: otpError.message });
        return;
      }

      setPendingLogin({
        email: signupForm.email.trim().toLowerCase(),
        orgCode: signupForm.orgCode,
        companyName: signupForm.companyName,
      });
      setLoginStep("otp");
      setMode("login");
      toast.success("Account created", { description: `OTP sent to ${signupForm.email}` });
    } finally {
      setIsSubmittingSignup(false);
    }
  };

  // Employee login with email + password + company code
  const handleEmployeePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loginForm.orgCode.length < 3) {
      toast.error("Enter your company code");
      return;
    }
    if (loginForm.identifier.trim().length < 3) {
      toast.error(loginForm.identifierKind === "email" ? "Enter your email" : "Enter your phone number");
      return;
    }
    if (loginForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSendingOtp(true);
    try {
      const { data: lookup, error: lookupError } = await (supabase.rpc as any)("lookup_employee_for_login", {
        _organization_code: loginForm.orgCode,
        _identifier: loginForm.identifier.trim(),
      });

      if (lookupError) {
        toast.error("Lookup failed", { description: lookupError.message });
        return;
      }

      const match = Array.isArray(lookup) ? lookup[0] : lookup;
      if (!match || !match.employee_email) {
        toast.error("No employee found", { description: "Check your company code and email or phone." });
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: match.employee_email,
        password: loginForm.password,
      });

      if (signInError) {
        toast.error("Sign in failed", { description: signInError.message });
        return;
      }

      const { error: attachError } = await (supabase.rpc as any)("attach_user_to_employee_record", {
        _organization_code: loginForm.orgCode,
        _employee_email: match.employee_email,
      });

      if (attachError) {
        toast.error("Could not link your employee record", { description: attachError.message });
        return;
      }

      setCompanyProfile({ id: "", name: match.company_name, organization_code: loginForm.orgCode });
      setActiveTab("home");
      toast.success("Welcome", { description: `Signed in to ${match.company_name}` });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Employee login → look up company + employee, send OTP to their email
  const handleEmployeeLoginRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loginForm.orgCode.length < 3) {
      toast.error("Enter your company code");
      return;
    }
    if (loginForm.identifier.trim().length < 3) {
      toast.error(loginForm.identifierKind === "email" ? "Enter your email" : "Enter your phone number");
      return;
    }

    setIsSendingOtp(true);
    try {
      const { data, error } = await (supabase.rpc as any)("lookup_employee_for_login", {
        _organization_code: loginForm.orgCode,
        _identifier: loginForm.identifier.trim(),
      });

      if (error) {
        toast.error("Lookup failed", { description: error.message });
        return;
      }

      const match = Array.isArray(data) ? data[0] : data;
      if (!match || !match.employee_email) {
        toast.error("No employee found", { description: "Check your company code and email or phone." });
        return;
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: match.employee_email,
        options: { shouldCreateUser: true },
      });

      if (otpError) {
        toast.error("Could not send OTP", { description: otpError.message });
        return;
      }

      setPendingLogin({
        email: match.employee_email,
        orgCode: loginForm.orgCode,
        companyName: match.company_name,
      });
      setLoginStep("otp");
      toast.success("OTP sent", { description: `Check ${match.employee_email} for your code.` });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingLogin) return;
    if (otpCode.trim().length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: pendingLogin.email,
        token: otpCode.trim(),
        type: "email",
      });

      if (verifyError) {
        toast.error("OTP verification failed", { description: verifyError.message });
        return;
      }

      // Attach this auth user to the directory record
      const { error: attachError } = await (supabase.rpc as any)("attach_user_to_employee_record", {
        _organization_code: pendingLogin.orgCode,
        _employee_email: pendingLogin.email,
      });

      if (attachError) {
        toast.error("Could not link your employee record", { description: attachError.message });
        return;
      }

      setCompanyProfile({
        id: "",
        name: pendingLogin.companyName,
        organization_code: pendingLogin.orgCode,
      });
      setLoginStep("form");
      setOtpCode("");
      setPendingLogin(null);
      setActiveTab("home");
      toast.success("Welcome", { description: `Signed in to ${pendingLogin.companyName}` });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResetLogin = () => {
    setLoginStep("form");
    setOtpCode("");
    setPendingLogin(null);
  };

  const handleCreateInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!companyProfile) return;
    if (inviteForm.employeeName.trim().length < 2 || !inviteForm.employeeEmail.includes("@")) {
      toast.error("Enter employee details", { description: "Employee name and work email are required." });
      return;
    }

    setIsCreatingInvite(true);
    try {
      const { data, error } = await (supabase.rpc as any)("create_employee_invite", {
        _company_id: companyProfile.id,
        _employee_name: inviteForm.employeeName,
        _employee_email: inviteForm.employeeEmail,
      });

      if (error) {
        toast.error("Invite could not be created", { description: error.message });
        return;
      }

      const invite = data as EmployeeInvite;
      const url = createInviteUrl(invite.invite_token);
      setLatestInviteUrl(url);
      setInviteForm({ employeeName: "", employeeEmail: "" });
      await loadInvites(companyProfile.id);

      const subject = encodeURIComponent("Your Open Desk Flow employee login link");
      const body = encodeURIComponent(`Hi ${invite.employee_name},\n\nUse this secure link to create your employee login for ${companyProfile.name}:\n${url}\n\nThis link expires in 7 days.`);
      window.location.href = `mailto:${invite.employee_email}?subject=${subject}&body=${body}`;
      toast.success("Employee login link created", { description: "Your email app is ready to send the invite." });
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const copyInviteUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  };

  const handleDeskSelect = (deskId: string) => {
    const desk = desks.find((item) => item.id === deskId);
    if (!desk) return;
    setSelectedDeskId(deskId);

    if (desk.status === "occupied") {
      toast.error(`Desk ${desk.id} is occupied`, { description: "Choose a green desk for this slot." });
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedDesk) return;

    if (selectedDesk.status === "occupied") {
      toast.error(`Desk ${selectedDesk.id} cannot be booked`, { description: "This desk is currently occupied." });
      return;
    }

    if (!selectedDesk.dbId) {
      toast.error("Live desk record is still loading");
      return;
    }

    setIsBookingDesk(true);
    try {
      const { error } = await supabase.rpc("deskflow_book_desk", {
        _desk_id: selectedDesk.dbId,
        _time_slot: selectedSlot,
        _client_session_id: clientSessionId,
      });

      if (error) {
        toast.error(`Desk ${selectedDesk.id} could not be booked`, { description: error.message });
        return;
      }

      setBookingText(`Desk ${selectedDesk.id} · ${selectedSlot} confirmed`);
      toast.success(`Desk ${selectedDesk.id} booked`, { description: "Booking persisted and synced across devices." });
    } finally {
      setIsBookingDesk(false);
    }
  };



  const renderEmployeeAuth = () => {
    if (loginStep === "otp" && pendingLogin) {
      return (
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Verify OTP</p>
              <h2 className="font-display text-xl font-extrabold">Enter your code</h2>
            </div>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            We sent a 6-digit code to <span className="font-extrabold text-foreground">{pendingLogin.email}</span>.
          </p>
          <form onSubmit={handleVerifyOtp} className="mt-4 space-y-3">
            <input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="123456"
              className="focus-premium w-full rounded-2xl border border-border bg-background px-4 py-4 text-center font-display text-2xl font-extrabold tracking-[0.5em] text-foreground placeholder:tracking-normal placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={isVerifyingOtp}
              className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              <ShieldCheck className="h-5 w-5" /> {isVerifyingOtp ? "Verifying..." : "Verify & enter Home"}
            </button>
            <button
              type="button"
              onClick={handleResetLogin}
              className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-extrabold text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Use a different account
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Employee access</p>
            <h2 className="font-display text-xl font-extrabold">{mode === "signup" ? "Create your account" : "Sign in to continue"}</h2>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 rounded-2xl bg-muted p-1">
          {(["login", "signup"] as AppMode[]).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setMode(item)}
              className={`focus-premium rounded-xl py-2 text-sm font-extrabold transition-all ${
                mode === item ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
              }`}
            >
              {item === "signup" ? "Signup" : "Login"}
            </button>
          ))}
        </div>

        {mode === "signup" ? (
          <form onSubmit={handleEmployeeSignup} className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Company name</span>
              <input
                value={signupForm.companyName}
                onChange={(event) => updateSignupForm("companyName", event.target.value)}
                placeholder="Acme Workspace"
                className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Company code (unique)</span>
              <input
                value={signupForm.orgCode}
                onChange={(event) => updateSignupForm("orgCode", event.target.value)}
                placeholder="ACME-HQ"
                className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold uppercase text-foreground placeholder:text-muted-foreground"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your name</span>
              <input
                value={signupForm.displayName}
                onChange={(event) => updateSignupForm("displayName", event.target.value)}
                placeholder="Sachin Kumar"
                className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Contact email (unique)</span>
              <input
                type="email"
                value={signupForm.email}
                onChange={(event) => updateSignupForm("email", event.target.value)}
                placeholder="you@company.com"
                className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Mobile (optional)</span>
              <input
                type="tel"
                value={signupForm.phone}
                onChange={(event) => updateSignupForm("phone", event.target.value)}
                placeholder="+91 98xxxxxxxx"
                className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmittingSignup}
              className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              <UserPlus className="h-5 w-5" /> {isSubmittingSignup ? "Creating..." : "Sign up & send OTP"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={loginForm.method === "password" ? handleEmployeePasswordLogin : handleEmployeeLoginRequest}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 rounded-2xl bg-muted p-1">
              {(["email", "phone"] as LoginIdentifier[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => updateLoginForm("identifierKind", kind)}
                  className={`focus-premium flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-extrabold transition-all ${
                    loginForm.identifierKind === kind ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
                  }`}
                >
                  {kind === "email" ? <Mail className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                  {kind === "email" ? "Email" : "Mobile"}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {loginForm.identifierKind === "email" ? "Email address" : "Mobile number"}
              </span>
              <input
                type={loginForm.identifierKind === "email" ? "email" : "tel"}
                value={loginForm.identifier}
                onChange={(event) => updateLoginForm("identifier", event.target.value)}
                placeholder={loginForm.identifierKind === "email" ? "you@company.com" : "+91 98xxxxxxxx"}
                className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
              />
            </label>

            {loginForm.method === "password" && (
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Password</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => updateLoginForm("password", event.target.value)}
                  placeholder="••••••••"
                  className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
                />
              </label>
            )}

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Company code</span>
              <input
                value={loginForm.orgCode}
                onChange={(event) => updateLoginForm("orgCode", event.target.value)}
                placeholder="ACME-HQ"
                className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold uppercase text-foreground placeholder:text-muted-foreground"
              />
            </label>

            <button
              type="submit"
              disabled={isSendingOtp}
              className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              {loginForm.method === "password" ? (
                <>
                  <ShieldCheck className="h-5 w-5" /> {isSendingOtp ? "Signing in..." : "Sign in"}
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" /> {isSendingOtp ? "Sending OTP..." : "Send OTP to email"}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                updateLoginForm("method", loginForm.method === "password" ? "otp" : "password")
              }
              className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-xs font-extrabold text-muted-foreground hover:text-foreground"
            >
              <KeyRound className="h-4 w-4" />
              {loginForm.method === "password" ? "Login with OTP instead" : "Login with password instead"}
            </button>
          </form>
        )}
      </div>
    );
  };

  const renderAdminPanel = () => (
    <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-primary">{companyProfile?.name ?? "Employer workspace"}</p>
          <h2 className="font-display text-2xl font-extrabold">HR admin</h2>
        </div>
        <div className="rounded-2xl bg-success px-3 py-2 text-center text-success-foreground">
          <p className="text-2xl font-extrabold">{invites.length}</p>
          <p className="text-[10px] font-bold uppercase">links</p>
        </div>
      </div>

      <form onSubmit={handleCreateInvite} className="space-y-3">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Employee name</span>
          <input
            value={inviteForm.employeeName}
            onChange={(event) => setInviteForm((current) => ({ ...current, employeeName: event.target.value }))}
            placeholder="Employee full name"
            className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Employee email</span>
          <input
            value={inviteForm.employeeEmail}
            onChange={(event) => setInviteForm((current) => ({ ...current, employeeEmail: event.target.value }))}
            placeholder="employee@company.com"
            className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
          />
        </label>
        <button
          type="submit"
          disabled={isCreatingInvite || !companyProfile}
          className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          <Send className="h-5 w-5" /> {isCreatingInvite ? "Creating link..." : "Create login & send email link"}
        </button>
      </form>

      {latestInviteUrl && (
        <div className="mt-4 rounded-2xl bg-background p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Latest employee link</p>
          <p className="mt-1 break-all text-sm font-semibold text-foreground">{latestInviteUrl}</p>
          <button onClick={() => copyInviteUrl(latestInviteUrl)} className="focus-premium mt-3 flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm font-extrabold text-foreground">
            <Copy className="h-4 w-4" /> Copy link
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {invites.slice(0, 4).map((invite) => (
          <div key={invite.id} className="flex items-center justify-between gap-3 rounded-2xl bg-background p-3">
            <div className="min-w-0">
              <p className="truncate font-bold">{invite.employee_name}</p>
              <p className="truncate text-xs font-semibold text-muted-foreground">{invite.employee_email}</p>
            </div>
            <button onClick={() => copyInviteUrl(createInviteUrl(invite.invite_token))} className="focus-premium grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-muted text-primary">
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const handleConfirmBooking = () => {
    const spot = bookingKind === "desk" ? selectedSeat : selectedRoom;
    const newBooking = {
      id: `${Date.now()}`,
      kind: bookingKind,
      floor: selectedFloor,
      spot,
      time: selectedHourlySlot,
    };
    setConfirmedBookings((current) => [newBooking, ...current].slice(0, 6));
    setBookingText(
      `${bookingKind === "desk" ? "Seat" : "Meeting room"} ${spot} · Floor ${selectedFloor} · ${selectedHourlySlot}`,
    );
    toast.success(
      `${bookingKind === "desk" ? "Seat" : "Meeting room"} ${spot} booked`,
      { description: `Floor ${selectedFloor} · ${selectedHourlySlot}` },
    );
  };

  const renderBookingPanel = () => (
    <div id="booking" className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-primary">Book screen</p>
          <h2 className="font-display text-2xl font-extrabold">Choose your spot</h2>
        </div>
        <div className="rounded-2xl bg-success px-3 py-2 text-center text-success-foreground">
          <p className="text-2xl font-extrabold">{confirmedBookings.length}</p>
          <p className="text-[10px] font-bold uppercase">booked</p>
        </div>
      </div>

      {/* Desk vs Meeting room toggle */}
      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-muted p-1">
        {(["desk", "room"] as BookingKind[]).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setBookingKind(kind)}
            className={`focus-premium flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-extrabold transition-all ${
              bookingKind === kind ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
            }`}
          >
            {kind === "desk" ? <Sofa className="h-4 w-4" /> : <DoorOpen className="h-4 w-4" />}
            {kind === "desk" ? "Desk seat" : "Meeting room"}
          </button>
        ))}
      </div>

      {/* Floor selection 1 - 6 */}
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Floor</p>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {floorOptions.map((floor) => (
            <button
              key={floor}
              type="button"
              onClick={() => setSelectedFloor(floor)}
              className={`focus-premium rounded-2xl py-2 text-sm font-extrabold transition-all ${
                selectedFloor === floor ? "bg-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"
              }`}
            >
              {floor}
            </button>
          ))}
        </div>
      </div>

      {/* Seat or Room selection */}
      {bookingKind === "desk" ? (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Seat</p>
          <div className="mt-2 space-y-2">
            {seatRows.map((row) => (
              <div key={row} className="grid grid-cols-4 gap-2">
                {seatColumns.map((col) => {
                  const seatId = `${row}${col}`;
                  const isSelected = selectedSeat === seatId;
                  return (
                    <button
                      key={seatId}
                      type="button"
                      onClick={() => setSelectedSeat(seatId)}
                      className={`focus-premium rounded-2xl border py-3 text-sm font-extrabold transition-all ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-glow"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {seatId}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Meeting room</p>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {meetingRooms.map((room) => (
              <button
                key={room}
                type="button"
                onClick={() => setSelectedRoom(room)}
                className={`focus-premium rounded-2xl border py-3 text-xs font-extrabold transition-all ${
                  selectedRoom === room
                    ? "border-primary bg-primary text-primary-foreground shadow-glow"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {room}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hourly time slots 8 AM - 8 PM */}
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Time slot · 8 AM to 8 PM</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {hourlyTimeSlots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedHourlySlot(slot)}
              className={`focus-premium rounded-2xl px-1 py-2 text-xs font-extrabold transition-all ${
                selectedHourlySlot === slot
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>

      {/* Summary + confirm */}
      <div className="mt-4 rounded-2xl bg-background p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ready to book</p>
        <p className="font-display text-xl font-extrabold">
          {bookingKind === "desk" ? "Seat" : "Room"} {bookingKind === "desk" ? selectedSeat : selectedRoom} · Floor {selectedFloor}
        </p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">{selectedHourlySlot}</p>
        <p className="mt-2 text-sm font-semibold text-primary">{bookingText}</p>
        <button
          type="button"
          onClick={handleConfirmBooking}
          className="focus-premium mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
        >
          <CalendarCheck className="h-5 w-5" /> Confirm booking
        </button>
      </div>

      {confirmedBookings.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent bookings</p>
          {confirmedBookings.map((booking) => (
            <div key={booking.id} className="flex items-center justify-between gap-3 rounded-2xl bg-background p-3">
              <div className="flex items-center gap-2">
                {booking.kind === "desk" ? (
                  <Sofa className="h-4 w-4 text-primary" />
                ) : (
                  <DoorOpen className="h-4 w-4 text-primary" />
                )}
                <div>
                  <p className="text-sm font-extrabold">
                    {booking.kind === "desk" ? "Seat" : "Room"} {booking.spot} · Floor {booking.floor}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">{booking.time}</p>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTeamPanel = () => (
    <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Employee access</p>
          <h2 className="font-display text-xl font-extrabold">Invite-only login</h2>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">
        Employees use the email link from HR admin to create their login, then book desks from this Android-style app.
      </p>
      {inviteToken && (
        <button onClick={handleGoogleLogin} className="focus-premium mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow">
          <Mail className="h-5 w-5" /> Login to accept invite
        </button>
      )}
    </div>
  );

  const renderHomeScreen = () => (
    <>
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Home</p>
            <h2 className="font-display text-2xl font-extrabold">Login to continue</h2>
          </div>
        </div>
        {companyProfile && (
          <div className="mt-4 rounded-2xl bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Signed in workspace</p>
            <p className="font-display text-xl font-extrabold">{companyProfile.name}</p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">Organization ID · {companyProfile.organization_code}</p>
          </div>
        )}
      </div>
      {companyProfile ? (
        <button onClick={() => setActiveTab("book")} className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow">
          <CalendarCheck className="h-5 w-5" /> Go to Book screen
        </button>
      ) : renderEmployeeAuth()}
    </>
  );

  const shouldShowEmployerFirst = !companyProfile && !inviteToken;

  return (
    <main className="min-h-screen bg-hero-field px-4 py-6 text-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[420px_1fr] lg:items-start">
        <section className="mx-auto w-full max-w-[420px] rounded-[2.25rem] border-[10px] border-foreground bg-foreground p-2 shadow-soft">
          <div className="min-h-[820px] overflow-hidden rounded-[1.65rem] bg-background">
            <div className="flex items-center justify-between bg-primary px-5 pb-4 pt-5 text-primary-foreground">
              <ArrowLeft className="h-5 w-5" />
              <div className="h-6 w-28 rounded-full bg-primary-foreground/20" />
              <Bell className="h-5 w-5" />
            </div>

            <div className="bg-primary px-5 pb-6 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-foreground/15">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold opacity-80">Open Desk Flow</p>
                  <h1 className="font-display text-2xl font-extrabold">Book Your Desk</h1>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              {inviteToken && activeTab === "home" && renderTeamPanel()}
              {activeTab === "home" && renderHomeScreen()}
              {companyProfile && isAdmin && activeTab === "admin" && renderAdminPanel()}
              {companyProfile && activeTab === "team" && renderTeamPanel()}
              {(activeTab === "book" || activeTab === "map") && renderBookingPanel()}
            </div>

            <div className="sticky bottom-0 grid grid-cols-5 border-t border-border bg-surface-raised px-2 py-2">
              {bottomTabs.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab.id)}
                  className={`focus-premium flex flex-col items-center gap-1 rounded-2xl py-2 text-xs font-extrabold ${activeTab === tab.id ? "text-primary" : "text-muted-foreground"}`}
                >
                  <tab.icon className="h-5 w-5" /> {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6 py-4 lg:py-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface-glass px-4 py-2 text-sm font-bold text-primary shadow-card backdrop-blur">
            <Smartphone className="h-4 w-4" /> Android home map login
          </div>
          <div>
            <h2 className="font-display text-5xl font-extrabold leading-tight tracking-normal lg:text-7xl">Home is mapped to login.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Open Desk Flow now starts on Home for login, and the Book tab is where users choose a desk, select a time slot, and confirm booking.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { icon: Building2, title: "Employer signup", text: "Company admins create the organization profile before employees can access booking." },
              { icon: ShieldCheck, title: "HR admin role", text: "Admins are stored securely in the role table and can manage company invitations." },
              { icon: Send, title: "Employee links", text: "HR can create employee login links and open an email draft addressed to the employee." },
              { icon: KeyRound, title: "Google login", text: "Managed Google sign-in is available for employers and invited employees." },
              { icon: Clock3, title: "Real-time sync", text: "Desk occupancy updates persist and sync across different devices." },
              { icon: CheckCircle2, title: "Android-ready", text: "The app stays in a phone-shell layout with bottom tabs and mobile-first controls." },
              { icon: QrCode, title: "Invite token", text: "Employee access is tied to a secure invitation token that expires automatically." },
            ].map((item) => (
              <article key={item.title} className="rounded-[1.5rem] border border-border bg-panel-sheen p-5 shadow-card transition-transform hover:-translate-y-1">
                <item.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-display text-xl font-extrabold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Index;
