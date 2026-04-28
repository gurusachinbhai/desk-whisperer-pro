import {
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Clock,
  Clock3,
  AlertTriangle,
  LogIn,
  Copy,
  DoorOpen,
  Globe2,
  History,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Plane,
  QrCode,
  Search,
  Send,
  Settings as SettingsIcon,
  ShieldCheck,
  Smartphone,
  Sofa,
  Sun,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
type ActiveTab = "home" | "book" | "attendance" | "leave" | "map" | "admin" | "team";
type LoginStep = "form" | "otp";
type LoginIdentifier = "email" | "phone";

type SignupForm = {
  companyName: string;
  orgCode: string;
  displayName: string;
  email: string;
  phone: string;
  password: string;
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

const DEFAULT_FLOORS = [1, 2, 3, 4, 5, 6];
const DEFAULT_AREAS = ["AREA-01", "AREA-02", "AREA-03", "AREA-04", "AREA-05", "AREA-06"];
const seatRows = ["A", "B", "C", "D", "E"] as const;
const seatColumns = [1, 2, 3, 4] as const;
const meetingRooms = ["M01", "M02", "M03", "M04", "M05"] as const;

type ShiftKey = "morning" | "day" | "afternoon" | "night";

const shiftDefinitions: { id: ShiftKey; label: string; range: string; startHour: number; endHour: number; times: string[] }[] = [
  {
    id: "morning",
    label: "Morning",
    range: "6 AM – 2 PM",
    startHour: 6,
    endHour: 14,
    times: ["06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM"],
  },
  {
    id: "day",
    label: "Day",
    range: "9 AM – 5 PM",
    startHour: 9,
    endHour: 17,
    times: ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM"],
  },
  {
    id: "afternoon",
    label: "Afternoon",
    range: "2 PM – 10 PM",
    startHour: 14,
    endHour: 22,
    times: ["02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM"],
  },
  {
    id: "night",
    label: "Night",
    range: "10 PM – 6 AM",
    startHour: 22,
    endHour: 30, // wraps to next-day 6 AM (24 + 6)
    times: ["10:00 PM", "11:00 PM", "12:00 AM", "01:00 AM", "02:00 AM", "03:00 AM", "04:00 AM", "05:00 AM"],
  },
];

// Common IANA timezones
const TIMEZONE_OPTIONS = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo", "Asia/Hong_Kong",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Sao_Paulo", "Australia/Sydney", "Pacific/Auckland", "UTC",
];

type ConfirmedBooking = {
  id: string;
  kind: BookingKind;
  floor: number;
  area: string;
  spot: string;
  time: string;
  shift: string;
  shiftKey: ShiftKey;
  shiftRange: string;
  date: string; // yyyy-MM-dd
  endsAt: number; // epoch ms when shift ends, used for auto-release
  released: boolean;
};

type BookingKind = "desk" | "room";

const bottomTabs: { id: ActiveTab; icon: typeof CalendarCheck; label: string }[] = [
  { id: "home", icon: MapPin, label: "Home" },
  { id: "book", icon: CalendarCheck, label: "Book" },
  { id: "attendance", icon: Clock, label: "Attendance" },
  { id: "leave", icon: Plane, label: "Leave" },
  { id: "admin", icon: BarChart3, label: "Admin" },
];

// Compute the epoch ms when a shift ends on a given date (handles night-shift wrap)
const computeShiftEnd = (date: Date, shift: typeof shiftDefinitions[number]) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() + shift.endHour * 60 * 60 * 1000;
};

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
    password: "",
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
  const [employees, setEmployees] = useState<Array<{ id: string; display_name: string; email: string | null }>>([]);
  const [floorDraft, setFloorDraft] = useState<string>("");
  const [areaDraft, setAreaDraft] = useState<string>("");
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
  const [currentUser, setCurrentUser] = useState<{ displayName: string; email: string } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    (typeof window !== "undefined" && window.localStorage.getItem("deskflow-theme") === "dark") ? "dark" : "light"
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("deskflow-theme", theme);
  }, [theme]);

  const isAuthenticated = Boolean(currentUser && companyProfile);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCompanyProfile(null);
    setIsAdmin(false);
    setInvites([]);
    setActiveTab("home");
    setLoginStep("form");
    setOtpCode("");
    setPendingLogin(null);
    setLoginForm({ orgCode: "", identifier: "", identifierKind: "email", password: "", method: "password" });
    toast.success("Signed out");
  };

  // New booking selection state (floor / area / seat / room / shift / hourly slot)
  const [bookingKind, setBookingKind] = useState<BookingKind>("desk");
  const [companyFloors, setCompanyFloors] = useState<number[]>(DEFAULT_FLOORS);
  const [companyAreas, setCompanyAreas] = useState<string[]>(DEFAULT_AREAS);
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [selectedArea, setSelectedArea] = useState<string>(DEFAULT_AREAS[0]);
  const [selectedSeat, setSelectedSeat] = useState<string>("A1");
  const [selectedRoom, setSelectedRoom] = useState<string>("M01");
  const [selectedShift, setSelectedShift] = useState<ShiftKey>("morning");
  const [selectedHourlySlot, setSelectedHourlySlot] = useState<string>("06:00 AM");
  const [bookingDate, setBookingDate] = useState<Date>(() => new Date());
  const [confirmedBookings, setConfirmedBookings] = useState<ConfirmedBooking[]>([]);

  // Timezone — committed once, then locked forever (per device)
  const [userTimezone, setUserTimezone] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("deskflow-user-timezone");
  });
  const [draftTimezone, setDraftTimezone] = useState<string>(
    () =>
      (typeof window !== "undefined" && window.localStorage.getItem("deskflow-user-timezone")) ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "UTC",
  );

  // Tick clock every 30s so the auto-release sweep runs and the home greeting stays fresh
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // ============== ATTENDANCE STATE ==============
  type AttendanceRecord = {
    id: string;
    userId: string;
    userName: string;
    date: string; // yyyy-MM-dd
    signInAt: number | null;
    signOutAt: number | null;
    note?: string;
    regularization?: {
      requestedSignIn?: number;
      requestedSignOut?: number;
      reason: string;
      status: "pending" | "approved" | "rejected";
      reviewedBy?: string;
      reviewedAt?: number;
    };
  };
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [regForm, setRegForm] = useState<{ recordId: string; signIn: string; signOut: string; reason: string }>({
    recordId: "",
    signIn: "",
    signOut: "",
    reason: "",
  });

  const attendanceStorageKey = (companyId: string) => `deskflow-attendance-${companyId}`;

  useEffect(() => {
    if (!companyProfile) return;
    const raw = window.localStorage.getItem(attendanceStorageKey(companyProfile.id));
    if (raw) {
      try {
        setAttendance(JSON.parse(raw));
      } catch {
        setAttendance([]);
      }
    } else {
      setAttendance([]);
    }
  }, [companyProfile?.id]);

  useEffect(() => {
    if (!companyProfile) return;
    window.localStorage.setItem(attendanceStorageKey(companyProfile.id), JSON.stringify(attendance));
  }, [attendance, companyProfile?.id]);

  // ============== LEAVE STATE ==============
  type LeaveType = "casual" | "sick" | "earned" | "unpaid";
  type LeaveRequest = {
    id: string;
    userId: string;
    userName: string;
    type: LeaveType;
    fromDate: string; // yyyy-MM-dd
    toDate: string;
    days: number;
    reason: string;
    status: "pending" | "approved" | "rejected";
    createdAt: number;
    reviewedBy?: string;
    reviewedAt?: number;
    reviewNote?: string;
  };
  const LEAVE_ANNUAL_QUOTA: Record<LeaveType, number> = {
    casual: 12,
    sick: 10,
    earned: 15,
    unpaid: 30,
  };
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveForm, setLeaveForm] = useState<{ type: LeaveType; from: string; to: string; reason: string }>({
    type: "casual",
    from: "",
    to: "",
    reason: "",
  });
  const leaveStorageKey = (companyId: string) => `deskflow-leaves-${companyId}`;

  useEffect(() => {
    if (!companyProfile) return;
    const raw = window.localStorage.getItem(leaveStorageKey(companyProfile.id));
    if (raw) {
      try {
        setLeaves(JSON.parse(raw));
      } catch {
        setLeaves([]);
      }
    } else {
      setLeaves([]);
    }
  }, [companyProfile?.id]);

  useEffect(() => {
    if (!companyProfile) return;
    window.localStorage.setItem(leaveStorageKey(companyProfile.id), JSON.stringify(leaves));
  }, [leaves, companyProfile?.id]);


  // Auto-release any booking whose shift end has passed
  useEffect(() => {
    setConfirmedBookings((current) => {
      let changed = false;
      const next = current.map((b) => {
        if (!b.released && b.endsAt <= nowTs) {
          changed = true;
          return { ...b, released: true };
        }
        return b;
      });
      return changed ? next : current;
    });
  }, [nowTs]);

  // Load admin-managed floors/areas + roster whenever the company changes
  useEffect(() => {
    if (!companyProfile) return;
    try {
      const fRaw = window.localStorage.getItem(`deskflow-floors-${companyProfile.id}`);
      const aRaw = window.localStorage.getItem(`deskflow-areas-${companyProfile.id}`);
      if (fRaw) {
        const parsed = JSON.parse(fRaw) as number[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCompanyFloors(parsed);
          if (!parsed.includes(selectedFloor)) setSelectedFloor(parsed[0]);
        }
      }
      if (aRaw) {
        const parsed = JSON.parse(aRaw) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCompanyAreas(parsed);
          if (!parsed.includes(selectedArea)) setSelectedArea(parsed[0]);
        }
      }
    } catch {
      // ignore corrupt storage
    }

    // Fetch employees for this company (roster) — admin can see all members
    (async () => {
      const { data } = await supabase
        .from("employee_profiles")
        .select("id, display_name, email")
        .eq("company_id", companyProfile.id)
        .order("display_name", { ascending: true });
      setEmployees((data ?? []) as Array<{ id: string; display_name: string; email: string | null }>);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyProfile?.id]);

  // Persist admin-managed floors/areas
  useEffect(() => {
    if (!companyProfile) return;
    window.localStorage.setItem(`deskflow-floors-${companyProfile.id}`, JSON.stringify(companyFloors));
  }, [companyFloors, companyProfile?.id]);
  useEffect(() => {
    if (!companyProfile) return;
    window.localStorage.setItem(`deskflow-areas-${companyProfile.id}`, JSON.stringify(companyAreas));
  }, [companyAreas, companyProfile?.id]);

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
    if (signupForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
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

      // Create the auth user with the chosen password
      const { error: authError } = await supabase.auth.signUp({
        email: signupForm.email.trim().toLowerCase(),
        password: signupForm.password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });

      if (authError) {
        toast.error("Could not create login", { description: authError.message });
        return;
      }

      // Pre-fill login form so the user can sign in immediately with their password
      setLoginForm({
        orgCode: signupForm.orgCode,
        identifier: signupForm.email.trim().toLowerCase(),
        identifierKind: "email",
        password: "",
        method: "password",
      });
      setMode("login");
      setLoginStep("form");
      toast.success("Account created", {
        description: "You can now sign in with your email, password, and company code.",
      });
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
      setCurrentUser({ displayName: match.display_name ?? "Employee", email: match.employee_email });
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
      setCurrentUser({ displayName: pendingLogin.email.split("@")[0], email: pendingLogin.email });
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
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Password (min 6 chars)</span>
              <input
                type="password"
                value={signupForm.password}
                onChange={(event) => updateSignupForm("password", event.target.value)}
                placeholder="••••••••"
                className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmittingSignup}
              className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              <UserPlus className="h-5 w-5" /> {isSubmittingSignup ? "Creating..." : "Create account"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={loginForm.method === "password" ? handleEmployeePasswordLogin : handleEmployeeLoginRequest}
            className="space-y-3"
          >
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email address</span>
              <input
                type="email"
                value={loginForm.identifier}
                onChange={(event) => {
                  updateLoginForm("identifier", event.target.value);
                  if (loginForm.identifierKind !== "email") updateLoginForm("identifierKind", "email");
                }}
                placeholder="you@company.com"
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

  const handleAddFloor = () => {
    const n = Number(floorDraft.trim());
    if (!Number.isInteger(n) || n < 1 || n > 200) {
      toast.error("Floor must be a whole number between 1 and 200");
      return;
    }
    if (companyFloors.includes(n)) {
      toast.error(`Floor ${n} already exists`);
      return;
    }
    setCompanyFloors((current) => [...current, n].sort((a, b) => a - b));
    setFloorDraft("");
    toast.success(`Floor ${n} added`);
  };

  const handleRemoveFloor = (n: number) => {
    if (companyFloors.length <= 1) {
      toast.error("Keep at least one floor");
      return;
    }
    setCompanyFloors((current) => current.filter((f) => f !== n));
    if (selectedFloor === n) setSelectedFloor(companyFloors.find((f) => f !== n) ?? 1);
  };

  const handleAddArea = () => {
    const raw = areaDraft.trim().toUpperCase().replace(/\s+/g, "-");
    if (raw.length < 2 || raw.length > 24) {
      toast.error("Area code must be 2-24 characters");
      return;
    }
    if (companyAreas.includes(raw)) {
      toast.error(`${raw} already exists`);
      return;
    }
    setCompanyAreas((current) => [...current, raw]);
    setAreaDraft("");
    toast.success(`${raw} added`);
  };

  const handleRemoveArea = (a: string) => {
    if (companyAreas.length <= 1) {
      toast.error("Keep at least one area");
      return;
    }
    setCompanyAreas((current) => current.filter((x) => x !== a));
    if (selectedArea === a) setSelectedArea(companyAreas.find((x) => x !== a) ?? DEFAULT_AREAS[0]);
  };

  const renderAdminPanel = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary">{companyProfile?.name ?? "Employer workspace"}</p>
            <h2 className="font-display text-2xl font-extrabold">Admin console</h2>
            <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
              Code · {companyProfile?.organization_code} · Scoped to your company
            </p>
          </div>
          <div className="rounded-2xl bg-success px-3 py-2 text-center text-success-foreground">
            <p className="text-2xl font-extrabold">{employees.length}</p>
            <p className="text-[10px] font-bold uppercase">staff</p>
          </div>
        </div>
      </div>

      {/* Floors management */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold">Floors</h3>
            <p className="text-xs font-semibold text-muted-foreground">Floors employees can pick when booking</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-extrabold">{companyFloors.length}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {companyFloors.map((floor) => (
            <span key={floor} className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm font-extrabold">
              Floor {floor}
              <button
                type="button"
                onClick={() => handleRemoveFloor(floor)}
                className="grid h-6 w-6 place-items-center rounded-full bg-background text-destructive"
                aria-label={`Remove floor ${floor}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={floorDraft}
            onChange={(e) => setFloorDraft(e.target.value)}
            type="number"
            min={1}
            max={200}
            placeholder="Floor number"
            className="focus-premium flex-1 rounded-2xl border border-border bg-background px-4 py-3 font-semibold"
          />
          <button
            type="button"
            onClick={handleAddFloor}
            className="focus-premium rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground"
          >
            Add
          </button>
        </div>
      </div>

      {/* Areas management */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold">Areas</h3>
            <p className="text-xs font-semibold text-muted-foreground">Zones (e.g. AREA-01) within a floor</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-extrabold">{companyAreas.length}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {companyAreas.map((area) => (
            <span key={area} className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-xs font-extrabold">
              {area}
              <button
                type="button"
                onClick={() => handleRemoveArea(area)}
                className="grid h-6 w-6 place-items-center rounded-full bg-background text-destructive"
                aria-label={`Remove ${area}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={areaDraft}
            onChange={(e) => setAreaDraft(e.target.value)}
            placeholder="AREA-07"
            className="focus-premium flex-1 rounded-2xl border border-border bg-background px-4 py-3 font-semibold uppercase"
          />
          <button
            type="button"
            onClick={handleAddArea}
            className="focus-premium rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground"
          >
            Add
          </button>
        </div>
      </div>

      {/* Employee invites */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold">Add employees</h3>
            <p className="text-xs font-semibold text-muted-foreground">Send a one-click email link</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-extrabold">{invites.length} links</span>
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

      {/* Company roster */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold">Company roster</h3>
            <p className="text-xs font-semibold text-muted-foreground">All employees in {companyProfile?.name}</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-extrabold">{employees.length}</span>
        </div>
        {employees.length === 0 ? (
          <p className="rounded-2xl bg-background p-4 text-center text-sm font-semibold text-muted-foreground">
            No employees yet. Send an invite link above.
          </p>
        ) : (
          <div className="space-y-2">
            {employees.map((emp) => (
              <div key={emp.id} className="flex items-center gap-3 rounded-2xl bg-background p-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{emp.display_name}</p>
                  <p className="truncate text-xs font-semibold text-muted-foreground">{emp.email ?? "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );


  const currentShift = useMemo(
    () => shiftDefinitions.find((s) => s.id === selectedShift) ?? shiftDefinitions[0],
    [selectedShift],
  );

  const activeBookings = useMemo(
    () => confirmedBookings.filter((b) => !b.released && b.endsAt > nowTs),
    [confirmedBookings, nowTs],
  );

  const handleConfirmBooking = () => {
    if (bookingKind === "desk") {
      const dateKey = format(bookingDate, "yyyy-MM-dd");
      const conflict = activeBookings.find(
        (b) => b.kind === "desk" && b.shiftKey === selectedShift && b.date === dateKey,
      );
      if (conflict) {
        toast.error("You already have a seat for this shift", {
          description: `Release ${conflict.spot} first if you want a different seat.`,
        });
        return;
      }
    }

    const spot = bookingKind === "desk" ? selectedSeat : selectedRoom;
    const dateKey = format(bookingDate, "yyyy-MM-dd");
    const newBooking: ConfirmedBooking = {
      id: `${Date.now()}`,
      kind: bookingKind,
      floor: selectedFloor,
      area: selectedArea,
      spot,
      time: selectedHourlySlot,
      shift: currentShift.label,
      shiftKey: currentShift.id,
      shiftRange: currentShift.range,
      date: dateKey,
      endsAt: computeShiftEnd(bookingDate, currentShift),
      released: false,
    };
    setConfirmedBookings((current) => [newBooking, ...current].slice(0, 12));
    setBookingText(
      `${bookingKind === "desk" ? "Seat" : "Meeting room"} ${spot} · Floor ${selectedFloor} · ${selectedArea} · ${currentShift.label} (${currentShift.range})`,
    );
    toast.success(
      `${bookingKind === "desk" ? "Seat" : "Meeting room"} ${spot} booked`,
      { description: `Floor ${selectedFloor} · ${selectedArea} · ${currentShift.label} · ${currentShift.range}` },
    );
  };

  const handleReleaseBooking = (id: string) => {
    setConfirmedBookings((current) =>
      current.map((b) => (b.id === id ? { ...b, released: true } : b)),
    );
    toast.success("Desk released", { description: "Seat is now available for others." });
  };

  const handleCommitTimezone = () => {
    if (!draftTimezone) return;
    window.localStorage.setItem("deskflow-user-timezone", draftTimezone);
    setUserTimezone(draftTimezone);
    toast.success("Timezone locked", { description: `Set to ${draftTimezone}. This is permanent.` });
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

      {/* Company header */}
      {companyProfile && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-primary/10 p-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-extrabold">{companyProfile.name}</p>
            <p className="truncate text-xs font-semibold text-muted-foreground">
              Code · {companyProfile.organization_code}
            </p>
          </div>
        </div>
      )}

      {/* Booking date */}
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Booking date</p>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "focus-premium mt-2 flex w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left font-semibold",
                !bookingDate && "text-muted-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                {bookingDate ? format(bookingDate, "EEE, MMM d, yyyy") : "Pick a date"}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={bookingDate}
              onSelect={(d) => d && setBookingDate(d)}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
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

      {/* Floor selection (admin-managed) */}
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Floor</p>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {companyFloors.map((floor) => (
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

      {/* Area selection (admin-managed) */}
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Area</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {companyAreas.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => setSelectedArea(area)}
              className={`focus-premium rounded-2xl py-2 text-xs font-extrabold transition-all ${
                selectedArea === area
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {area}
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

      {/* Shift selection */}
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Shift</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {shiftDefinitions.map((shift) => (
            <button
              key={shift.id}
              type="button"
              onClick={() => {
                setSelectedShift(shift.id);
                setSelectedHourlySlot(shift.times[0]);
              }}
              className={`focus-premium rounded-2xl py-2 text-xs font-extrabold transition-all ${
                selectedShift === shift.id
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="block">{shift.label}</span>
              <span className="block text-[10px] font-semibold opacity-80">{shift.range}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time dropdown — based on selected shift */}
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Time · {currentShift.label} ({currentShift.range})
        </p>
        <Select
          value={selectedHourlySlot}
          onValueChange={(value) => setSelectedHourlySlot(value)}
        >
          <SelectTrigger className="mt-2 h-12 rounded-2xl border-border bg-background text-sm font-extrabold">
            <SelectValue placeholder="Select time" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            {currentShift.times.map((slot) => (
              <SelectItem key={slot} value={slot} className="text-sm font-bold">
                {slot}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary + confirm */}
      <div className="mt-4 rounded-2xl bg-background p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ready to book</p>
        <p className="font-display text-xl font-extrabold">
          {bookingKind === "desk" ? "Seat" : "Room"} {bookingKind === "desk" ? selectedSeat : selectedRoom} · Floor {selectedFloor} · {selectedArea}
        </p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {format(bookingDate, "EEE, MMM d")} · {currentShift.label} ({currentShift.range}) · {selectedHourlySlot}
        </p>
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
          {confirmedBookings.map((booking) => {
            const isActive = !booking.released && booking.endsAt > nowTs;
            return (
              <div key={booking.id} className="flex items-center justify-between gap-3 rounded-2xl bg-background p-3">
                <div className="flex min-w-0 items-center gap-2">
                  {booking.kind === "desk" ? (
                    <Sofa className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <DoorOpen className="h-4 w-4 shrink-0 text-primary" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">
                      {booking.kind === "desk" ? "Seat" : "Room"} {booking.spot} · Floor {booking.floor} · {booking.area}
                    </p>
                    <p className="truncate text-xs font-semibold text-muted-foreground">
                      {booking.date} · {booking.shift} ({booking.shiftRange})
                    </p>
                  </div>
                </div>
                {isActive ? (
                  <button
                    type="button"
                    onClick={() => handleReleaseBooking(booking.id)}
                    className="focus-premium flex shrink-0 items-center gap-1 rounded-2xl bg-destructive px-3 py-2 text-xs font-extrabold text-destructive-foreground shadow-md ring-2 ring-destructive/40 transition-transform hover:-translate-y-0.5"
                    aria-label="Release desk"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Release
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] font-extrabold uppercase text-muted-foreground">
                    {booking.released ? "Released" : "Ended"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============== ATTENDANCE HELPERS & RENDER ==============
  const todayKey = format(new Date(nowTs), "yyyy-MM-dd");
  const myUserId = currentUser?.email ?? "anon";
  const myName = currentUser?.displayName ?? "You";
  const myTodayRecord = attendance.find((r) => r.userId === myUserId && r.date === todayKey) ?? null;

  const formatHm = (ms: number) => format(new Date(ms), "hh:mm a");
  const computeWorkedMs = (r: AttendanceRecord) => {
    if (!r.signInAt) return 0;
    const end = r.signOutAt ?? nowTs;
    return Math.max(0, end - r.signInAt);
  };
  const formatDuration = (ms: number) => {
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  const handleSignIn = () => {
    if (myTodayRecord?.signInAt) {
      toast.error("You've already signed in today");
      return;
    }
    const id = window.crypto.randomUUID();
    const newRec: AttendanceRecord = {
      id,
      userId: myUserId,
      userName: myName,
      date: todayKey,
      signInAt: Date.now(),
      signOutAt: null,
    };
    setAttendance((prev) => [newRec, ...prev.filter((r) => !(r.userId === myUserId && r.date === todayKey))]);
    toast.success(`Signed in at ${format(new Date(), "hh:mm a")}`);
  };

  const handleSignOut = () => {
    if (!myTodayRecord || !myTodayRecord.signInAt) {
      toast.error("Sign in first");
      return;
    }
    if (myTodayRecord.signOutAt) {
      toast.error("Already signed out today");
      return;
    }
    setAttendance((prev) =>
      prev.map((r) => (r.id === myTodayRecord.id ? { ...r, signOutAt: Date.now() } : r))
    );
    toast.success(`Signed out at ${format(new Date(), "hh:mm a")}`);
  };

  const submitRegularization = () => {
    if (!regForm.recordId || !regForm.reason.trim()) {
      toast.error("Pick a day and provide a reason");
      return;
    }
    const parseHm = (hm: string, dateStr: string): number | undefined => {
      if (!hm) return undefined;
      const [h, m] = hm.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
      const d = new Date(dateStr + "T00:00:00");
      d.setHours(h, m, 0, 0);
      return d.getTime();
    };
    setAttendance((prev) =>
      prev.map((r) => {
        if (r.id !== regForm.recordId) return r;
        return {
          ...r,
          regularization: {
            requestedSignIn: parseHm(regForm.signIn, r.date),
            requestedSignOut: parseHm(regForm.signOut, r.date),
            reason: regForm.reason.trim(),
            status: "pending",
          },
        };
      })
    );
    setRegForm({ recordId: "", signIn: "", signOut: "", reason: "" });
    toast.success("Regularization submitted to admin");
  };

  const reviewRegularization = (recordId: string, decision: "approved" | "rejected") => {
    setAttendance((prev) =>
      prev.map((r) => {
        if (r.id !== recordId || !r.regularization) return r;
        const next = { ...r };
        if (decision === "approved") {
          if (r.regularization.requestedSignIn) next.signInAt = r.regularization.requestedSignIn;
          if (r.regularization.requestedSignOut) next.signOutAt = r.regularization.requestedSignOut;
        }
        next.regularization = {
          ...r.regularization,
          status: decision,
          reviewedBy: myName,
          reviewedAt: Date.now(),
        };
        return next;
      })
    );
    toast.success(`Request ${decision}`);
  };

  const whoIsInToday = attendance.filter((r) => r.date === todayKey && r.signInAt && !r.signOutAt);
  const myHistory = attendance.filter((r) => r.userId === myUserId).sort((a, b) => (a.date < b.date ? 1 : -1));
  const exceptions = attendance.filter((r) => {
    if (r.date === todayKey) return false;
    if (!r.signInAt || !r.signOutAt) return true; // missing punch
    const worked = computeWorkedMs(r);
    return worked < 4 * 60 * 60 * 1000; // under 4h flagged
  });
  const pendingRegs = attendance.filter((r) => r.regularization?.status === "pending");

  const renderAttendancePanel = () => (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] bg-gradient-to-br from-primary/15 via-surface-raised to-surface-raised p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Attendance</p>
            <h2 className="font-display text-2xl font-extrabold">
              {format(new Date(nowTs), "EEEE, MMM d")}
            </h2>
            <p className="text-sm text-muted-foreground">{format(new Date(nowTs), "hh:mm:ss a")}</p>
          </div>
          <div className="rounded-2xl bg-background/60 p-3 text-right">
            <p className="text-xs text-muted-foreground">Today's hours</p>
            <p className="font-display text-xl font-extrabold text-primary">
              {myTodayRecord ? formatDuration(computeWorkedMs(myTodayRecord)) : "0h 00m"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={handleSignIn}
            disabled={Boolean(myTodayRecord?.signInAt)}
            className="focus-premium flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-card transition hover:opacity-90 disabled:opacity-40"
          >
            <LogIn className="h-4 w-4" />
            {myTodayRecord?.signInAt ? `In · ${formatHm(myTodayRecord.signInAt)}` : "Sign In"}
          </button>
          <button
            onClick={handleSignOut}
            disabled={!myTodayRecord?.signInAt || Boolean(myTodayRecord?.signOutAt)}
            className="focus-premium flex items-center justify-center gap-2 rounded-2xl bg-destructive px-4 py-3 text-sm font-extrabold text-destructive-foreground shadow-card transition hover:opacity-90 disabled:opacity-40"
          >
            <LogOut className="h-4 w-4" />
            {myTodayRecord?.signOutAt ? `Out · ${formatHm(myTodayRecord.signOutAt)}` : "Sign Out"}
          </button>
        </div>
      </div>

      {/* Who's in today */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold">Who's in today</h3>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            {whoIsInToday.length} active
          </span>
        </div>
        {whoIsInToday.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No one is currently signed in.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {whoIsInToday.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-2xl bg-background/60 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {r.userName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{r.userName}</p>
                    <p className="text-xs text-muted-foreground">In since {formatHm(r.signInAt!)}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary">{formatDuration(computeWorkedMs(r))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* My history */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <h3 className="font-display text-lg font-extrabold">My attendance history</h3>
        {myHistory.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No records yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myHistory.slice(0, 14).map((r) => {
              const missing = !r.signInAt || !r.signOutAt;
              const worked = computeWorkedMs(r);
              const flag = r.date !== todayKey && (missing || worked < 4 * 60 * 60 * 1000);
              return (
                <li key={r.id} className="rounded-2xl bg-background/60 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{r.date}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.signInAt ? `In ${formatHm(r.signInAt)}` : "— no sign in"}
                        {" · "}
                        {r.signOutAt ? `Out ${formatHm(r.signOutAt)}` : r.date === todayKey ? "still in" : "— no sign out"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatDuration(worked)}</p>
                      {flag && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive">
                          <AlertTriangle className="h-3 w-3" /> exception
                        </span>
                      )}
                      {r.regularization && (
                        <p className="text-xs font-bold capitalize text-muted-foreground">
                          reg · {r.regularization.status}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Regularization request */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <h3 className="font-display text-lg font-extrabold">Request regularization</h3>
        <p className="text-xs text-muted-foreground">For missed punches or wrong times — admin will review.</p>
        <div className="mt-3 space-y-3">
          <Select
            value={regForm.recordId}
            onValueChange={(v) => setRegForm((f) => ({ ...f, recordId: v }))}
          >
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="Pick a day to regularize" />
            </SelectTrigger>
            <SelectContent>
              {myHistory.length === 0 && <div className="p-2 text-xs text-muted-foreground">No history</div>}
              {myHistory.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.date} {!r.signInAt && "· no sign in"} {!r.signOutAt && "· no sign out"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Sign-in time
              <input
                type="time"
                value={regForm.signIn}
                onChange={(e) => setRegForm((f) => ({ ...f, signIn: e.target.value }))}
                className="focus-premium rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              Sign-out time
              <input
                type="time"
                value={regForm.signOut}
                onChange={(e) => setRegForm((f) => ({ ...f, signOut: e.target.value }))}
                className="focus-premium rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <textarea
            value={regForm.reason}
            onChange={(e) => setRegForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Why this needs to be corrected..."
            className="focus-premium min-h-[72px] w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={submitRegularization}
            className="focus-premium w-full rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-card hover:opacity-90"
          >
            Submit request
          </button>
        </div>
      </div>

      {/* Admin: review queue + exceptions */}
      {isAdmin && (
        <>
          <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
            <h3 className="font-display text-lg font-extrabold">Pending regularizations</h3>
            {pendingRegs.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {pendingRegs.map((r) => (
                  <li key={r.id} className="rounded-2xl bg-background/60 p-3">
                    <p className="text-sm font-semibold">{r.userName} · {r.date}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.regularization?.requestedSignIn ? `In → ${formatHm(r.regularization.requestedSignIn)}` : ""}
                      {r.regularization?.requestedSignOut ? ` · Out → ${formatHm(r.regularization.requestedSignOut)}` : ""}
                    </p>
                    <p className="mt-1 text-xs italic text-muted-foreground">"{r.regularization?.reason}"</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => reviewRegularization(r.id, "approved")}
                        className="focus-premium flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reviewRegularization(r.id, "rejected")}
                        className="focus-premium flex-1 rounded-xl bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground hover:opacity-90"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
            <h3 className="font-display text-lg font-extrabold">Exceptions (last entries)</h3>
            {exceptions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No exceptions detected.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {exceptions.slice(0, 12).map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-2xl bg-background/60 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{r.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.date} ·{" "}
                        {!r.signInAt
                          ? "missing sign in"
                          : !r.signOutAt
                            ? "missing sign out"
                            : `worked only ${formatDuration(computeWorkedMs(r))}`}
                      </p>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );

  // ============== LEAVE HELPERS & RENDER ==============
  const diffDaysInclusive = (from: string, to: string) => {
    if (!from || !to) return 0;
    const f = new Date(from + "T00:00:00").getTime();
    const t = new Date(to + "T00:00:00").getTime();
    if (Number.isNaN(f) || Number.isNaN(t) || t < f) return 0;
    return Math.floor((t - f) / 86400000) + 1;
  };

  const myLeaves = leaves
    .filter((l) => l.userId === myUserId)
    .sort((a, b) => b.createdAt - a.createdAt);

  const yearOf = (d: string) => new Date(d + "T00:00:00").getFullYear();
  const currentYear = new Date(nowTs).getFullYear();
  const usedByType = (type: LeaveType) =>
    myLeaves
      .filter((l) => l.status === "approved" && l.type === type && yearOf(l.fromDate) === currentYear)
      .reduce((sum, l) => sum + l.days, 0);

  const submitLeave = () => {
    if (!leaveForm.from || !leaveForm.to) {
      toast.error("Pick from and to dates");
      return;
    }
    const days = diffDaysInclusive(leaveForm.from, leaveForm.to);
    if (days <= 0) {
      toast.error("Invalid date range");
      return;
    }
    if (!leaveForm.reason.trim()) {
      toast.error("Please add a reason");
      return;
    }
    const used = usedByType(leaveForm.type);
    const quota = LEAVE_ANNUAL_QUOTA[leaveForm.type];
    if (used + days > quota) {
      toast.error(`Exceeds ${leaveForm.type} quota (${used}/${quota} used)`);
      return;
    }
    const req: LeaveRequest = {
      id: window.crypto.randomUUID(),
      userId: myUserId,
      userName: myName,
      type: leaveForm.type,
      fromDate: leaveForm.from,
      toDate: leaveForm.to,
      days,
      reason: leaveForm.reason.trim(),
      status: "pending",
      createdAt: Date.now(),
    };
    setLeaves((prev) => [req, ...prev]);
    setLeaveForm({ type: "casual", from: "", to: "", reason: "" });
    toast.success("Leave request submitted");
  };

  const reviewLeave = (id: string, decision: "approved" | "rejected") => {
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, status: decision, reviewedBy: myName, reviewedAt: Date.now() }
          : l
      )
    );
    toast.success(`Leave ${decision}`);
  };

  const cancelLeave = (id: string) => {
    setLeaves((prev) => prev.filter((l) => l.id !== id));
    toast.success("Leave request removed");
  };

  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const upcomingApproved = leaves.filter(
    (l) => l.status === "approved" && new Date(l.toDate + "T23:59:59").getTime() >= nowTs
  );

  const leaveTypeMeta: Record<LeaveType, { label: string; tone: string }> = {
    casual: { label: "Casual", tone: "bg-primary/10 text-primary" },
    sick: { label: "Sick", tone: "bg-destructive/10 text-destructive" },
    earned: { label: "Earned", tone: "bg-emerald-500/10 text-emerald-600" },
    unpaid: { label: "Unpaid", tone: "bg-muted text-muted-foreground" },
  };

  const renderLeavePanel = () => (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] bg-gradient-to-br from-primary/15 via-surface-raised to-surface-raised p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Leave</p>
        <h2 className="font-display text-2xl font-extrabold">Time off</h2>
        <p className="text-sm text-muted-foreground">Balances reset every calendar year</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(Object.keys(LEAVE_ANNUAL_QUOTA) as LeaveType[]).map((t) => {
            const used = usedByType(t);
            const quota = LEAVE_ANNUAL_QUOTA[t];
            const remaining = Math.max(0, quota - used);
            return (
              <div key={t} className="rounded-2xl bg-background/60 p-3">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${leaveTypeMeta[t].tone}`}>
                  {leaveTypeMeta[t].label}
                </span>
                <p className="mt-2 font-display text-xl font-extrabold">
                  {remaining}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ {quota}</span>
                </p>
                <p className="text-xs text-muted-foreground">remaining · used {used}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Apply */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <h3 className="font-display text-lg font-extrabold">Apply for leave</h3>
        <div className="mt-3 space-y-3">
          <Select
            value={leaveForm.type}
            onValueChange={(v) => setLeaveForm((f) => ({ ...f, type: v as LeaveType }))}
          >
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LEAVE_ANNUAL_QUOTA) as LeaveType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {leaveTypeMeta[t].label} leave
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold">
              From
              <input
                type="date"
                value={leaveForm.from}
                onChange={(e) => setLeaveForm((f) => ({ ...f, from: e.target.value }))}
                className="focus-premium rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              To
              <input
                type="date"
                value={leaveForm.to}
                onChange={(e) => setLeaveForm((f) => ({ ...f, to: e.target.value }))}
                className="focus-premium rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          {leaveForm.from && leaveForm.to && (
            <p className="text-xs font-semibold text-primary">
              {diffDaysInclusive(leaveForm.from, leaveForm.to)} day(s) requested
            </p>
          )}
          <textarea
            value={leaveForm.reason}
            onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Reason for leave..."
            className="focus-premium min-h-[72px] w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={submitLeave}
            className="focus-premium w-full rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-card hover:opacity-90"
          >
            Submit request
          </button>
        </div>
      </div>

      {/* My requests */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <h3 className="font-display text-lg font-extrabold">My requests</h3>
        {myLeaves.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myLeaves.slice(0, 12).map((l) => (
              <li key={l.id} className="rounded-2xl bg-background/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${leaveTypeMeta[l.type].tone}`}>
                      {leaveTypeMeta[l.type].label}
                    </span>
                    <p className="mt-1 text-sm font-semibold">
                      {l.fromDate} → {l.toDate} · {l.days}d
                    </p>
                    <p className="text-xs italic text-muted-foreground">"{l.reason}"</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        l.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : l.status === "rejected"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {l.status}
                    </span>
                    {l.status === "pending" && (
                      <button
                        onClick={() => cancelLeave(l.id)}
                        className="mt-2 block text-[10px] font-bold text-destructive underline"
                      >
                        cancel
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Admin: review */}
      {isAdmin && (
        <>
          <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
            <h3 className="font-display text-lg font-extrabold">Pending leave requests</h3>
            {pendingLeaves.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {pendingLeaves.map((l) => (
                  <li key={l.id} className="rounded-2xl bg-background/60 p-3">
                    <p className="text-sm font-semibold">
                      {l.userName} ·{" "}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${leaveTypeMeta[l.type].tone}`}>
                        {leaveTypeMeta[l.type].label}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.fromDate} → {l.toDate} · {l.days} day(s)
                    </p>
                    <p className="mt-1 text-xs italic text-muted-foreground">"{l.reason}"</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => reviewLeave(l.id, "approved")}
                        className="focus-premium flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reviewLeave(l.id, "rejected")}
                        className="focus-premium flex-1 rounded-xl bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground hover:opacity-90"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
            <h3 className="font-display text-lg font-extrabold">Upcoming approved leaves</h3>
            {upcomingApproved.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No upcoming leaves.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {upcomingApproved.map((l) => (
                  <li key={l.id} className="flex items-center justify-between rounded-2xl bg-background/60 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{l.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.fromDate} → {l.toDate} · {l.days}d · {leaveTypeMeta[l.type].label}
                      </p>
                    </div>
                    <Plane className="h-4 w-4 text-primary" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
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

  const renderHomeScreen = () => {
    if (!isAuthenticated) return null;
    const initials = (currentUser?.displayName ?? "E")
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");

    const recentActivities = [
      ...confirmedBookings.slice(0, 3).map((booking) => ({
        id: `act-${booking.id}`,
        icon: booking.kind === "desk" ? Sofa : DoorOpen,
        title: `${booking.kind === "desk" ? "Seat" : "Room"} ${booking.spot} · Floor ${booking.floor}`,
        meta: booking.time,
      })),
      { id: "act-login", icon: ShieldCheck, title: "Signed in to workspace", meta: "Just now" },
    ].slice(0, 4);

    return (
      <>
        {/* Profile header */}
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
                <span className="font-display text-xl font-extrabold">{initials || "E"}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Welcome back</p>
                <h2 className="truncate font-display text-xl font-extrabold">
                  {currentUser?.displayName}
                  {companyProfile && (
                    <span className="ml-1 text-sm font-bold text-muted-foreground">· {companyProfile.name}</span>
                  )}
                </h2>
                <p className="truncate text-xs font-semibold text-muted-foreground">{currentUser?.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary">
                    Employee
                  </span>
                  {isAdmin && (
                    <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-success-foreground shadow-glow ring-2 ring-success/40">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="focus-premium grid h-10 w-10 place-items-center rounded-2xl bg-muted text-muted-foreground hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          {companyProfile && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-background p-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Company</p>
                <p className="truncate font-display text-base font-extrabold">{companyProfile.name}</p>
                <p className="truncate text-xs font-semibold text-muted-foreground">Code · {companyProfile.organization_code}</p>
              </div>
              <span className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide",
                isAdmin
                  ? "bg-success text-success-foreground shadow-glow"
                  : "bg-primary/15 text-primary",
              )}>
                {isAdmin ? "Admin" : "Employee"}
              </span>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-primary/10 p-3">
              <p className="text-2xl font-extrabold text-primary">{confirmedBookings.length}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Bookings</p>
            </div>
            <div className="rounded-2xl bg-success/15 p-3">
              <p className="text-2xl font-extrabold text-success">{availableCount}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Desks free</p>
            </div>
          </div>
        </div>

        {/* Activities */}
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-extrabold">Recent activity</h3>
          </div>
          <div className="space-y-2">
            {recentActivities.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-background p-3">
                <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold">{item.title}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{item.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timezone — commit forever */}
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-extrabold">Your timezone</h3>
            {userTimezone && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-extrabold uppercase text-success">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
          </div>
          {userTimezone ? (
            <div className="rounded-2xl bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Committed timezone</p>
              <p className="font-display text-base font-extrabold">{userTimezone}</p>
              <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                This selection is permanent. Contact the Open Desk Flow team to change it.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Pick your timezone — once committed, it cannot be changed from here.
              </p>
              <Select value={draftTimezone} onValueChange={(v) => setDraftTimezone(v)}>
                <SelectTrigger className="h-12 rounded-2xl border-border bg-background text-sm font-extrabold">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-sm font-bold">
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={handleCommitTimezone}
                className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-glow"
              >
                <Lock className="h-4 w-4" /> Commit timezone forever
              </button>
            </div>
          )}
        </div>

        {/* Become an Admin (only show for non-admins) */}
        {!isAdmin && (
          <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="font-display text-base font-extrabold">Become an Admin</h3>
            </div>
            <p className="text-xs font-semibold leading-5 text-muted-foreground">
              To become an admin for {companyProfile?.name ?? "your company"}, send a request email to the Open Desk Flow team. Once approved, the Admin tab and company management tools will appear here.
            </p>
            <a
              href={`mailto:Opendeskflow2026@gmail.com?cc=Admin@Opendeskflow.team&subject=${encodeURIComponent(
                `Admin access request — ${companyProfile?.name ?? ""} (${companyProfile?.organization_code ?? ""})`,
              )}&body=${encodeURIComponent(
                `Hi Open Desk Flow team,\n\nPlease grant admin access to:\nName: ${currentUser?.displayName ?? ""}\nEmail: ${currentUser?.email ?? ""}\nCompany: ${companyProfile?.name ?? ""}\nCompany code: ${companyProfile?.organization_code ?? ""}\n\nThanks.`,
              )}`}
              className="focus-premium mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-glow"
            >
              <Mail className="h-4 w-4" /> Email request to Open Desk Flow
            </a>
          </div>
        )}

        {/* Booking history */}
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              <h3 className="font-display text-base font-extrabold">Booking history</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("book")}
              className="focus-premium text-xs font-extrabold text-primary"
            >
              New booking
            </button>
          </div>
          {confirmedBookings.length === 0 ? (
            <p className="rounded-2xl bg-background p-4 text-center text-xs font-semibold text-muted-foreground">
              No bookings yet. Tap Book to reserve a desk or meeting room.
            </p>
          ) : (
            <div className="space-y-2">
              {confirmedBookings.map((booking) => {
                const isActive = !booking.released && booking.endsAt > nowTs;
                return (
                  <div key={booking.id} className="flex items-center justify-between gap-3 rounded-2xl bg-background p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {booking.kind === "desk" ? (
                        <Sofa className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <DoorOpen className="h-4 w-4 shrink-0 text-primary" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold">
                          {booking.kind === "desk" ? "Seat" : "Room"} {booking.spot} · Floor {booking.floor} · {booking.area}
                        </p>
                        <p className="truncate text-xs font-semibold text-muted-foreground">
                          {booking.date} · {booking.shift} ({booking.shiftRange})
                        </p>
                      </div>
                    </div>
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => handleReleaseBooking(booking.id)}
                        className="focus-premium flex shrink-0 items-center gap-1 rounded-2xl bg-destructive px-3 py-2 text-xs font-extrabold text-destructive-foreground shadow-md ring-2 ring-destructive/40 transition-transform hover:-translate-y-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Release
                      </button>
                    ) : (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[10px] font-extrabold uppercase text-muted-foreground">
                        {booking.released ? "Released" : "Ended"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-extrabold">Settings</h3>
          </div>
          <div className="rounded-2xl bg-background p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Theme</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["light", "dark"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTheme(option)}
                  className={`focus-premium flex items-center justify-center gap-2 rounded-2xl py-2 text-sm font-extrabold transition-all ${
                    theme === option
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {option === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {option === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="focus-premium mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-extrabold text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </>
    );
  };

  // Login-only view: full screen, no bottom nav, no marketing column
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-hero-field px-4 py-6 text-foreground">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[460px] items-center justify-center">
          <section className="w-full rounded-[2.25rem] border-[10px] border-foreground bg-foreground p-2 shadow-soft">
            <div className="overflow-hidden rounded-[1.65rem] bg-background">
              <div className="bg-primary px-5 pb-6 pt-6 text-primary-foreground">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-foreground/15">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold opacity-80">Open Desk Flow</p>
                    <h1 className="font-display text-2xl font-extrabold">Sign in to your workspace</h1>
                  </div>
                </div>
              </div>
              <div className="space-y-5 px-5 py-5">
                {inviteToken && renderTeamPanel()}
                {renderEmployeeAuth()}
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-hero-field px-4 py-6 text-foreground">
      <div className="mx-auto flex w-full max-w-[460px] justify-center">
        <section className="w-full rounded-[2.25rem] border-[10px] border-foreground bg-foreground p-2 shadow-soft">
          <div className="min-h-[820px] overflow-hidden rounded-[1.65rem] bg-background">
            <div className="flex items-center justify-between bg-primary px-5 pb-4 pt-5 text-primary-foreground">
              <ArrowLeft className="h-5 w-5" />
              <div className="h-6 w-28 rounded-full bg-primary-foreground/20" />
              <Bell className="h-5 w-5" />
            </div>

            <div className="bg-primary px-5 pb-6 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-foreground/15">
                  <UserIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold opacity-80">{companyProfile?.name}</p>
                  <h1 className="truncate font-display text-2xl font-extrabold">Hi, {currentUser?.displayName}</h1>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              {activeTab === "home" && renderHomeScreen()}
              {isAdmin && activeTab === "admin" && renderAdminPanel()}
              {activeTab === "team" && renderTeamPanel()}
              {activeTab === "attendance" && renderAttendancePanel()}
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
      </div>
    </main>
  );
};

export default Index;
