import {
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CreditCard,
  CalendarCheck,
  CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Clock,
  Clock3,
  AlertTriangle,
  LogIn,
  Camera,
  Check,
  Copy,
  Sparkles,
  DoorOpen,
  Download,
  Pencil,
  FileText,
  Globe2,
  History,
  KeyRound,
  LifeBuoy,
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
import { useRecordsPersistence } from "@/hooks/use-records-persistence";
import hrgreatlyLogo from "@/assets/hrgreatly-logo.png";
import DocumentsPanel from "@/components/DocumentsPanel";
import TrainingPanel from "@/components/TrainingPanel";
import AppraisalPanel from "@/components/AppraisalPanel";
import AssistantPanel from "@/components/AssistantPanel";
import AttendanceMap from "@/components/AttendanceMap";
import BiometricCheckIn from "@/components/BiometricCheckIn";
import { GraduationCap, ClipboardList } from "lucide-react";
import AdminDocumentsPanel from "@/components/AdminDocumentsPanel";
import AdminDepartmentsPanel from "@/components/AdminDepartmentsPanel";
import AdminConsole from "@/components/admin/AdminConsole";
import LicenseAlertsCard from "@/components/admin/LicenseAlertsCard";
import EmployeeWorkInfoCard from "@/components/EmployeeWorkInfoCard";
import ManagerHierarchy, { type HierarchyEmployee } from "@/components/ManagerHierarchy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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
type ActiveTab = "home" | "book" | "attendance" | "leave" | "payroll" | "documents" | "training" | "appraisal" | "assistant" | "billing" | "reports" | "map" | "rooms" | "directory" | "admin" | "team";
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
const meetingRoomCatalog: { id: string; name: string; capacity: number; floor: number }[] = [
  { id: "M01", name: "Aurora", capacity: 4, floor: 1 },
  { id: "M02", name: "Borealis", capacity: 6, floor: 1 },
  { id: "M03", name: "Cascade", capacity: 8, floor: 2 },
  { id: "M04", name: "Delta", capacity: 12, floor: 2 },
  { id: "M05", name: "Echo", capacity: 16, floor: 3 },
];

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
  { id: "documents", icon: FileText, label: "Documents" },
  { id: "training", icon: GraduationCap, label: "Training" },
  { id: "appraisal", icon: ClipboardList, label: "Appraisal" },
  { id: "assistant", icon: Sparkles, label: "AI Assistant" },
  { id: "admin", icon: BarChart3, label: "Admin" },
];

// Compute the epoch ms when a shift ends on a given date (handles night-shift wrap)
const computeShiftEnd = (date: Date, shift: typeof shiftDefinitions[number]) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime() + shift.endHour * 60 * 60 * 1000;
};

const shiftOverlaps = (a: ShiftKey | "", b: ShiftKey | "") => {
  if (!a || !b) return true;
  const first = shiftDefinitions.find((shift) => shift.id === a);
  const second = shiftDefinitions.find((shift) => shift.id === b);
  if (!first || !second) return true;
  return first.startHour < second.endHour && second.startHour < first.endHour;
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
  const [employees, setEmployees] = useState<Array<{ id: string; display_name: string; email: string | null; phone: string | null; manager_id?: string | null; photo_url?: string | null; user_id?: string | null }>>([]);
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
  const [authUserId, setAuthUserId] = useState<string | null>(null);
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
    setAuthUserId(null);
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
  const [roomWizard, setRoomWizard] = useState<{
    open: boolean;
    roomId: string;
    startTime: string;
    endTime: string;
    step: "slot" | "review";
    title: string;
  }>({ open: false, roomId: "M01", startTime: "09:00", endTime: "09:30", step: "slot", title: "" });

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
  type GeoPoint = {
    lat: number;
    lng: number;
    accuracyM?: number;
    distanceM?: number;
    address?: string;
  };
  type AttendanceRecord = {
    id: string;
    userId: string;
    userName: string;
    date: string; // yyyy-MM-dd
    signInAt: number | null;
    signOutAt: number | null;
    signInGeo?: GeoPoint;
    signOutGeo?: GeoPoint;
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

  // ============== USER PROFILE (avatar + name override) ==============
  const profileStorageKey = (email: string) => `deskflow-profile-${email.toLowerCase()}`;
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [profileNameDraft, setProfileNameDraft] = useState<string>("");
  const [editingProfile, setEditingProfile] = useState<boolean>(false);
  const [editingTimezone, setEditingTimezone] = useState<boolean>(false);

  // Load profile overrides on user change
  useEffect(() => {
    if (!currentUser?.email) {
      setUserAvatar(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem(profileStorageKey(currentUser.email));
      if (raw) {
        const parsed = JSON.parse(raw) as { avatar?: string; displayName?: string };
        if (parsed.avatar) setUserAvatar(parsed.avatar);
        if (parsed.displayName && parsed.displayName !== currentUser.displayName) {
          setCurrentUser({ ...currentUser, displayName: parsed.displayName });
        }
      } else {
        setUserAvatar(null);
      }
    } catch {
      setUserAvatar(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email]);

  const persistProfile = (next: { avatar?: string | null; displayName?: string }) => {
    if (!currentUser?.email) return;
    const key = profileStorageKey(currentUser.email);
    let prev: { avatar?: string; displayName?: string } = {};
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) prev = JSON.parse(raw);
    } catch { /* noop */ }
    const merged = {
      ...prev,
      ...(next.avatar !== undefined ? { avatar: next.avatar ?? undefined } : {}),
      ...(next.displayName ? { displayName: next.displayName } : {}),
    };
    window.localStorage.setItem(key, JSON.stringify(merged));
  };

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("Image too large — keep it under 1.5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setUserAvatar(dataUrl);
      persistProfile({ avatar: dataUrl });
      toast.success("Profile photo updated");
    };
    reader.onerror = () => toast.error("Couldn't read that image");
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setUserAvatar(null);
    persistProfile({ avatar: null });
    toast.success("Profile photo removed");
  };

  const handleSaveDisplayName = () => {
    const trimmed = profileNameDraft.trim();
    if (trimmed.length < 2) {
      toast.error("Display name must be at least 2 characters");
      return;
    }
    if (currentUser) {
      setCurrentUser({ ...currentUser, displayName: trimmed });
      persistProfile({ displayName: trimmed });
    }
    setEditingProfile(false);
    toast.success("Display name updated");
  };

  const handleChangeTimezone = (next: string) => {
    if (!next) return;
    setUserTimezone(next);
    setDraftTimezone(next);
    window.localStorage.setItem("deskflow-user-timezone", next);
    setEditingTimezone(false);
    toast.success(`Timezone set to ${next}`);
  };

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
    status: "pending" | "manager_approved" | "approved" | "rejected";
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

  // ============== PAYROLL STATE ==============
  type Payslip = {
    id: string;
    employeeId: string; // employee_profiles.id
    employeeName: string;
    employeeEmail: string | null;
    period: string; // yyyy-MM
    grossAmount: number;
    netAmount: number;
    currency: string;
    notes?: string;
    fileName?: string;
    fileType?: string;
    fileDataUrl?: string; // base64 data URL (mock storage)
    uploadedAt: number;
    uploadedBy: string;
  };
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [payslipForm, setPayslipForm] = useState<{
    employeeId: string;
    period: string;
    grossAmount: string;
    netAmount: string;
    currency: string;
    notes: string;
    fileName: string;
    fileType: string;
    fileDataUrl: string;
  }>({
    employeeId: "",
    period: format(new Date(), "yyyy-MM"),
    grossAmount: "",
    netAmount: "",
    currency: "USD",
    notes: "",
    fileName: "",
    fileType: "",
    fileDataUrl: "",
  });
  const payrollStorageKey = (companyId: string) => `deskflow-payroll-${companyId}`;

  useEffect(() => {
    if (!companyProfile) return;
    const raw = window.localStorage.getItem(payrollStorageKey(companyProfile.id));
    if (raw) {
      try {
        setPayslips(JSON.parse(raw));
      } catch {
        setPayslips([]);
      }
    } else {
      setPayslips([]);
    }
  }, [companyProfile?.id]);

  useEffect(() => {
    if (!companyProfile) return;
    window.localStorage.setItem(payrollStorageKey(companyProfile.id), JSON.stringify(payslips));
  }, [payslips, companyProfile?.id]);

  // ============== SUBSCRIPTION / BILLING STATE ==============
  type BillingPlanId = "monthly" | "quarterly" | "halfyear" | "ninemonth" | "annual";
  type BillingPlan = {
    id: BillingPlanId;
    label: string;
    months: number;
    pricePerSeatPerMonth: number; // USD
  };
  const BILLING_PLANS: BillingPlan[] = [
    { id: "monthly", label: "Monthly", months: 1, pricePerSeatPerMonth: 3 },
    { id: "quarterly", label: "Quarterly (3 mo)", months: 3, pricePerSeatPerMonth: 3 },
    { id: "halfyear", label: "6 Months", months: 6, pricePerSeatPerMonth: 3 },
    { id: "ninemonth", label: "9 Months", months: 9, pricePerSeatPerMonth: 3 },
    { id: "annual", label: "1 Year", months: 12, pricePerSeatPerMonth: 3 },
  ];

  type Subscription = {
    planId: BillingPlanId;
    seats: number;
    startedAt: number; // epoch ms
    expiresAt: number; // epoch ms
    autoRenew: boolean;
    lastPaymentAmount: number;
    currency: string;
    activatedBy: string;
    history: Array<{
      planId: BillingPlanId;
      seats: number;
      amount: number;
      paidAt: number;
      periodStart: number;
      periodEnd: number;
    }>;
  };
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [billingForm, setBillingForm] = useState<{ planId: BillingPlanId; seats: string }>({
    planId: "monthly",
    seats: "10",
  });
  const subscriptionStorageKey = (companyId: string) => `deskflow-subscription-${companyId}`;

  useEffect(() => {
    if (!companyProfile) {
      setSubscription(null);
      return;
    }
    const raw = window.localStorage.getItem(subscriptionStorageKey(companyProfile.id));
    if (raw) {
      try {
        setSubscription(JSON.parse(raw));
      } catch {
        setSubscription(null);
      }
    } else {
      setSubscription(null);
    }
  }, [companyProfile?.id]);

  useEffect(() => {
    if (!companyProfile) return;
    if (subscription) {
      window.localStorage.setItem(subscriptionStorageKey(companyProfile.id), JSON.stringify(subscription));
    }
  }, [subscription, companyProfile?.id]);

  const subscriptionExpired = useMemo(() => {
    if (!subscription) return false;
    return subscription.expiresAt <= nowTs;
  }, [subscription, nowTs]);

  const subscriptionActive = Boolean(subscription && !subscriptionExpired);

  // ============== ANNOUNCEMENTS / NOTIFICATIONS STATE ==============
  type AnnouncementPriority = "info" | "important" | "urgent";
  type Announcement = {
    id: string;
    title: string;
    body: string;
    priority: AnnouncementPriority;
    authorName: string;
    authorId: string;
    createdAt: number;
  };
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementForm, setAnnouncementForm] = useState<{ title: string; body: string; priority: AnnouncementPriority }>({
    title: "",
    body: "",
    priority: "info",
  });
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const announcementsStorageKey = (companyId: string) => `deskflow-announcements-${companyId}`;
  const readAnnouncementsStorageKey = (companyId: string, userKey: string) =>
    `deskflow-announcements-read-${companyId}-${userKey}`;

  const userReadKey = currentUser?.email?.toLowerCase() ?? "anon";

  useEffect(() => {
    if (!companyProfile) {
      setAnnouncements([]);
      return;
    }
    const raw = window.localStorage.getItem(announcementsStorageKey(companyProfile.id));
    if (raw) {
      try {
        setAnnouncements(JSON.parse(raw));
      } catch {
        setAnnouncements([]);
      }
    } else {
      setAnnouncements([]);
    }
  }, [companyProfile?.id]);

  useEffect(() => {
    if (!companyProfile) return;
    window.localStorage.setItem(announcementsStorageKey(companyProfile.id), JSON.stringify(announcements));
  }, [announcements, companyProfile?.id]);

  useEffect(() => {
    if (!companyProfile || !currentUser) {
      setReadAnnouncementIds([]);
      return;
    }
    const raw = window.localStorage.getItem(readAnnouncementsStorageKey(companyProfile.id, userReadKey));
    if (raw) {
      try {
        setReadAnnouncementIds(JSON.parse(raw));
      } catch {
        setReadAnnouncementIds([]);
      }
    } else {
      setReadAnnouncementIds([]);
    }
  }, [companyProfile?.id, userReadKey]);

  useEffect(() => {
    if (!companyProfile || !currentUser) return;
    window.localStorage.setItem(
      readAnnouncementsStorageKey(companyProfile.id, userReadKey),
      JSON.stringify(readAnnouncementIds),
    );
  }, [readAnnouncementIds, companyProfile?.id, userReadKey]);

  const sortedAnnouncements = useMemo(
    () => [...announcements].sort((a, b) => b.createdAt - a.createdAt),
    [announcements],
  );
  const unreadAnnouncementCount = useMemo(
    () => sortedAnnouncements.filter((a) => !readAnnouncementIds.includes(a.id)).length,
    [sortedAnnouncements, readAnnouncementIds],
  );

  const markAllAnnouncementsRead = () => {
    setReadAnnouncementIds(announcements.map((a) => a.id));
  };

  const handlePostAnnouncement = (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !currentUser) {
      toast.error("Only admins can post announcements");
      return;
    }
    const title = announcementForm.title.trim();
    const body = announcementForm.body.trim();
    if (title.length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    if (body.length < 3) {
      toast.error("Message body is required");
      return;
    }
    const next: Announcement = {
      id: window.crypto.randomUUID(),
      title,
      body,
      priority: announcementForm.priority,
      authorName: currentUser.displayName,
      authorId: currentUser.email,
      createdAt: Date.now(),
    };
    setAnnouncements((prev) => [next, ...prev]);
    // Author auto-reads their own post
    setReadAnnouncementIds((prev) => (prev.includes(next.id) ? prev : [...prev, next.id]));
    setAnnouncementForm({ title: "", body: "", priority: "info" });
    toast.success("Announcement posted to your team");
  };

  const handleDeleteAnnouncement = (id: string) => {
    if (!isAdmin) return;
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  };

  // ============== ROOM MEETINGS STATE ==============
  type RoomMeeting = {
    id: string;
    roomId: string;
    roomName: string;
    date: string; // yyyy-MM-dd
    startMinutes: number; // minutes from 00:00
    endMinutes: number;
    title: string;
    organizerId: string;
    organizerName: string;
    attendeeIds: string[]; // employee_profiles.id
    attendeeNames: string[];
    createdAt: number;
  };
  const [roomMeetings, setRoomMeetings] = useState<RoomMeeting[]>([]);
  const [meetingForm, setMeetingForm] = useState<{
    roomId: string;
    date: string;
    startTime: string; // HH:mm
    endTime: string;
    title: string;
    attendeeIds: string[];
  }>({
    roomId: meetingRoomCatalog[0].id,
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "10:00",
    title: "",
    attendeeIds: [],
  });
  const roomMeetingsStorageKey = (companyId: string) => `deskflow-room-meetings-${companyId}`;

  useEffect(() => {
    if (!companyProfile) {
      setRoomMeetings([]);
      return;
    }
    const raw = window.localStorage.getItem(roomMeetingsStorageKey(companyProfile.id));
    if (raw) {
      try {
        setRoomMeetings(JSON.parse(raw));
      } catch {
        setRoomMeetings([]);
      }
    } else {
      setRoomMeetings([]);
    }
  }, [companyProfile?.id]);

  useEffect(() => {
    if (!companyProfile) return;
    window.localStorage.setItem(roomMeetingsStorageKey(companyProfile.id), JSON.stringify(roomMeetings));
  }, [roomMeetings, companyProfile?.id]);

  const parseTimeToMinutes = (hhmm: string): number | null => {
    const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
    if (!m) return null;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
    return h * 60 + mm;
  };
  const minutesToLabel = (n: number) => {
    const wrapped = ((n % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(wrapped / 60);
    const mm = wrapped % 60;
    const period = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${String(mm).padStart(2, "0")} ${period}`;
  };
  // 15-minute clock slots around the clock (00:00, 00:15, ... 23:45)
  const CLOCK_SLOTS_15 = useMemo(() => {
    const out: { value: string; label: string; minutes: number }[] = [];
    for (let m = 0; m < 24 * 60; m += 15) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      const value = `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      out.push({ value, label: minutesToLabel(m), minutes: m });
    }
    return out;
  }, []);

  const handleToggleAttendee = (employeeId: string) => {
    setMeetingForm((prev) => ({
      ...prev,
      attendeeIds: prev.attendeeIds.includes(employeeId)
        ? prev.attendeeIds.filter((id) => id !== employeeId)
        : [...prev.attendeeIds, employeeId],
    }));
  };

  const handleBookRoom = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser || !companyProfile) {
      toast.error("Sign in to book a room");
      return;
    }
    const room = meetingRoomCatalog.find((r) => r.id === meetingForm.roomId);
    if (!room) {
      toast.error("Pick a room");
      return;
    }
    const startMin = parseTimeToMinutes(meetingForm.startTime);
    const endMin = parseTimeToMinutes(meetingForm.endTime);
    if (startMin === null || endMin === null) {
      toast.error("Pick a start and end time");
      return;
    }
    if (startMin % 15 !== 0 || endMin % 15 !== 0) {
      toast.error("Times must align to 15-minute slots");
      return;
    }
    if (endMin - startMin < 15) {
      toast.error("Meeting must be at least 15 minutes");
      return;
    }
    // Don't allow booking a slot already in the past for today
    const todayKey = format(new Date(nowTs), "yyyy-MM-dd");
    if (meetingForm.date === todayKey) {
      const nowMin = new Date(nowTs).getHours() * 60 + new Date(nowTs).getMinutes();
      if (endMin <= nowMin) {
        toast.error("That time slot has already passed");
        return;
      }
    }
    if (!meetingForm.title.trim()) {
      toast.error("Add a meeting title");
      return;
    }
    const totalAttendees = meetingForm.attendeeIds.length + 1;
    if (totalAttendees > room.capacity) {
      toast.error(`${room.name} fits ${room.capacity}; you have ${totalAttendees}`);
      return;
    }
    const conflict = roomMeetings.find(
      (m) =>
        m.roomId === room.id &&
        m.date === meetingForm.date &&
        startMin < m.endMinutes &&
        endMin > m.startMinutes,
    );
    if (conflict) {
      toast.error(`Conflicts with "${conflict.title}"`, {
        description: `${minutesToLabel(conflict.startMinutes)} – ${minutesToLabel(conflict.endMinutes)}`,
      });
      return;
    }
    // One user can hold only one room per overlapping time slot
    const ownConflict = roomMeetings.find(
      (m) =>
        m.organizerId === currentUser.email &&
        m.date === meetingForm.date &&
        startMin < m.endMinutes &&
        endMin > m.startMinutes,
    );
    if (ownConflict) {
      toast.error("You already have a room booked for this time", {
        description: `${ownConflict.roomName} · ${minutesToLabel(ownConflict.startMinutes)} – ${minutesToLabel(ownConflict.endMinutes)}`,
      });
      return;
    }
    const attendeeNames = meetingForm.attendeeIds
      .map((id) => employees.find((e) => e.id === id)?.display_name)
      .filter((n): n is string => Boolean(n));
    const meeting: RoomMeeting = {
      id: window.crypto.randomUUID(),
      roomId: room.id,
      roomName: room.name,
      date: meetingForm.date,
      startMinutes: startMin,
      endMinutes: endMin,
      title: meetingForm.title.trim(),
      organizerId: currentUser.email,
      organizerName: currentUser.displayName,
      attendeeIds: meetingForm.attendeeIds,
      attendeeNames,
      createdAt: Date.now(),
    };
    setRoomMeetings((prev) => [meeting, ...prev]);
    setMeetingForm((prev) => ({ ...prev, title: "", attendeeIds: [] }));
    toast.success(`${room.name} booked`, {
      description: `${meeting.date} · ${minutesToLabel(startMin)} – ${minutesToLabel(endMin)}`,
    });
  };

  const handleCancelMeeting = (id: string) => {
    const meeting = roomMeetings.find((m) => m.id === id);
    if (!meeting) return;
    if (!isAdmin && meeting.organizerId !== currentUser?.email) {
      toast.error("Only the organizer or an admin can release this room");
      return;
    }
    setRoomMeetings((prev) => prev.filter((m) => m.id !== id));
    toast.success(`${meeting.roomName} released — now available`);
  };

  // Auto-prune expired meetings (slot ended) so the room is immediately
  // available for the next person.
  useEffect(() => {
    const now = new Date(nowTs);
    const todayKey = format(now, "yyyy-MM-dd");
    const nowMin = now.getHours() * 60 + now.getMinutes();
    setRoomMeetings((prev) => {
      const next = prev.filter((m) => {
        if (m.date < todayKey) return false;
        if (m.date === todayKey && m.endMinutes <= nowMin) return false;
        return true;
      });
      return next.length === prev.length ? prev : next;
    });
  }, [nowTs]);


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
        .select("id, user_id, display_name, email, phone, manager_id, photo_url")
        .eq("company_id", companyProfile.id)
        .order("display_name", { ascending: true });
      setEmployees((data ?? []) as Array<{ id: string; user_id: string | null; display_name: string; email: string | null; phone: string | null; manager_id: string | null; photo_url: string | null }>);
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
      const { data } = await supabase.auth.getSession();
      setAuthUserId(data.session?.user?.id ?? null);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAuthUserId(session?.user?.id ?? null);
      setTimeout(() => loadEmployerWorkspace(), 0);
    });

    loadSession();
    return () => listener.subscription.unsubscribe();
  }, []);

  // Auto sign-out after 10 minutes of no user activity
  useEffect(() => {
    if (!isAuthenticated) return;
    let timer: number;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        toast.message("Signed out due to inactivity", { description: "No activity detected for 10 minutes." });
        handleLogout();
      }, 10 * 60 * 1000);
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [isAuthenticated]);

  // Load current user's profile photo
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  useEffect(() => {
    if (!authUserId) { setProfilePhotoUrl(null); return; }
    supabase.from("employee_profiles").select("photo_url").eq("user_id", authUserId).maybeSingle()
      .then(({ data }) => setProfilePhotoUrl((data?.photo_url as string | null) ?? null));
  }, [authUserId]);

  const handleProfilePhotoUpload = async (file: File) => {
    if (!authUserId || !file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5 MB"); return; }
    try {
      setUploadingPhoto(true);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${authUserId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("profile-photos").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase.from("employee_profiles").update({ photo_url: url }).eq("user_id", authUserId);
      if (updErr) throw updErr;
      setProfilePhotoUrl(url);
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error("Could not upload photo", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Persist attendance, leave & desk bookings to the database (per-user)
  useRecordsPersistence({
    authUserId,
    companyId: companyProfile?.id ?? null,
    userName: currentUser?.displayName ?? "Employee",
    attendance,
    setAttendance,
    leaves,
    setLeaves,
    bookings: confirmedBookings,
    setBookings: setConfirmedBookings,
  });

  // Load company-wide leaves for managers and admins so they can review
  // reports / company leave requests. The persistence hook only loads the
  // current user's own leaves; this fills the gap for reviewers.
  useEffect(() => {
    const companyId = companyProfile?.id;
    if (!companyId || !authUserId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("company_id", companyId)
        .order("start_date", { ascending: false });
      if (cancelled || error || !data) return;
      setLeaves((prev) => {
        const mine = prev.filter((l) => l.userId === authUserId);
        const others = data
          .filter((r: any) => r.user_id !== authUserId)
          .map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            userName: r.user_name,
            type: (r.leave_type ?? "casual") as LeaveType,
            fromDate: r.start_date,
            toDate: r.end_date,
            days: Number(r.days) || 1,
            reason: r.reason ?? "",
            status: (r.status ?? "pending") as LeaveRequest["status"],
            createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
            reviewedBy: r.reviewer_name ?? undefined,
            reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).getTime() : undefined,
            reviewNote: r.reviewer_note ?? undefined,
          }));
        return [...mine, ...others];
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyProfile?.id, authUserId, isAdmin]);


  // Company-wide desk reservations (everyone in the same company) so the seat map
  // can show colleague-booked seats in light red with the booker's name and prevent
  // double-booking.
  type CompanyBooking = {
    id: string;
    user_id: string;
    user_name: string;
    desk_label: string;
    floor: string | null;
    area: string | null;
    booking_date: string;
    time_slot: string;
    status: string;
    notes: string | null;
  };
  const [companyBookings, setCompanyBookings] = useState<CompanyBooking[]>([]);

  useEffect(() => {
    if (!companyProfile?.id) {
      setCompanyBookings([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      await supabase.rpc("release_expired_desk_reservations", { _company_id: companyProfile.id });
      const { data } = await supabase
        .from("desk_reservations")
        .select("id,user_id,user_name,desk_label,floor,area,booking_date,time_slot,status,notes")
        .eq("company_id", companyProfile.id)
        .neq("status", "released")
        .neq("status", "cancelled");
      if (!cancelled && data) setCompanyBookings(data as CompanyBooking[]);
    };
    load();

    const channel = supabase
      .channel(`desk-reservations-${companyProfile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "desk_reservations", filter: `company_id=eq.${companyProfile.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [companyProfile?.id]);

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

      // Also save to permanent per-user history (survives publishes & reloads)
      if (authUserId && companyProfile?.id) {
        const { error: insertErr } = await supabase.from("desk_reservations").insert({
          company_id: companyProfile.id,
          user_id: authUserId,
          user_name: currentUser?.displayName ?? "Employee",
          desk_label: selectedDesk.id,
          floor: null,
          booking_date: format(new Date(), "yyyy-MM-dd"),
          time_slot: selectedSlot,
          status: "confirmed",
          notes: JSON.stringify({ source: "deskflow_rpc" }),
        });
        if (insertErr) {
          // Unique-index / overlap-trigger conflict → another user grabbed it first
          const msg = insertErr.message || "";
          if (insertErr.code === "23505" || /already booked|duplicate key/i.test(msg)) {
            toast.error(`Desk ${selectedDesk.id} was just booked by someone else`, {
              description: "Please pick another seat or time slot.",
            });
          } else {
            toast.error("Could not save booking history", { description: msg });
          }
        }
      }
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

            {loginForm.method === "password" && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="focus-premium w-full text-center text-xs font-extrabold text-primary hover:underline"
              >
                Forgot password?
              </button>
            )}
          </form>
        )}
      </div>
    );
  };

  const handleForgotPassword = async () => {
    const email = loginForm.identifier.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Enter your email above first, then tap Forgot password");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("Couldn't send reset link", { description: error.message });
      return;
    }
    toast.success("Password reset link sent", {
      description: `Check ${email} for instructions.`,
    });
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
        <button
          onClick={() => setActiveTab("billing")}
          className="focus-premium mt-3 flex w-full items-center justify-between rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm font-extrabold"
        >
          <span className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Billing & subscription
          </span>
          <span className={subscriptionActive ? "text-primary" : subscriptionExpired ? "text-destructive" : "text-muted-foreground"}>
            {subscriptionActive
              ? `Active · renews ${subscription ? format(new Date(subscription.expiresAt), "MMM d") : ""}`
              : subscriptionExpired
                ? "Expired"
                : "Not subscribed"}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className="focus-premium mt-2 flex w-full items-center justify-between rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm font-extrabold"
        >
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Reports & analytics
          </span>
          <span className="text-muted-foreground">View</span>
        </button>
      </div>

      {companyProfile?.id && <LicenseAlertsCard companyId={companyProfile.id} />}

      {/* Announcements composer */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Announcements</p>
            <h3 className="font-display text-lg font-extrabold">Notify your team</h3>
          </div>
        </div>
        <form onSubmit={handlePostAnnouncement} className="mt-3 space-y-3">
          <Input
            className="rounded-2xl"
            placeholder="Title (e.g. Office closed Friday)"
            value={announcementForm.title}
            onChange={(e) => setAnnouncementForm((p) => ({ ...p, title: e.target.value }))}
            maxLength={120}
          />
          <Textarea
            className="min-h-[90px] rounded-2xl"
            placeholder="Message body…"
            value={announcementForm.body}
            onChange={(e) => setAnnouncementForm((p) => ({ ...p, body: e.target.value }))}
            maxLength={1000}
          />
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Priority</label>
            <Select
              value={announcementForm.priority}
              onValueChange={(v) => setAnnouncementForm((p) => ({ ...p, priority: v as AnnouncementPriority }))}
            >
              <SelectTrigger className="mt-1 rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            type="submit"
            className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow"
          >
            <Send className="h-5 w-5" /> Post announcement
          </button>
        </form>
        {sortedAnnouncements.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Recent</p>
            <ul className="mt-2 space-y-2">
              {sortedAnnouncements.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface-muted p-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-extrabold">{a.title}</p>
                    <p className="truncate text-[11px] font-semibold text-muted-foreground">
                      {a.priority.toUpperCase()} · {format(new Date(a.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteAnnouncement(a.id)}
                    className="focus-premium grid h-9 w-9 place-items-center rounded-xl bg-destructive/10 text-destructive"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
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

      {/* All bookings — admin view of who booked what */}
      <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-extrabold">All bookings</h3>
            <p className="text-xs font-semibold text-muted-foreground">
              Who booked which seat or meeting room, and the shift
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-extrabold">
            {confirmedBookings.length}
          </span>
        </div>
        {confirmedBookings.length === 0 ? (
          <p className="rounded-2xl bg-background p-4 text-center text-sm font-semibold text-muted-foreground">
            No bookings yet. Bookings made by employees will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Person</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Spot</th>
                  <th className="px-3 py-2">Floor / Area</th>
                  <th className="px-3 py-2">Shift</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {confirmedBookings.map((b) => {
                  const isActive = !b.released && b.endsAt > nowTs;
                  return (
                    <tr key={b.id} className="border-t border-border bg-background">
                      <td className="px-3 py-2 font-bold">
                        {currentUser?.displayName ?? "Employee"}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {b.kind === "desk" ? "Seat" : "Meeting room"}
                      </td>
                      <td className="px-3 py-2 font-extrabold text-primary">{b.spot}</td>
                      <td className="px-3 py-2">Floor {b.floor} · {b.area}</td>
                      <td className="px-3 py-2">
                        {b.shift} <span className="text-muted-foreground">({b.shiftRange})</span>
                      </td>
                      <td className="px-3 py-2">{b.date}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            isActive
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isActive ? "Occupied" : b.released ? "Released" : "Ended"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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

  const handleConfirmBooking = async (overrideSeat?: string, overrideKind?: BookingKind) => {
    const effectiveKind = overrideKind ?? bookingKind;
    const spot = effectiveKind === "desk" ? (overrideSeat ?? selectedSeat) : selectedRoom;
    const dateKey = format(bookingDate, "yyyy-MM-dd");

    if (effectiveKind === "desk") {
      // 1) Don't let same user book two seats for the same shift
      const conflict = activeBookings.find(
        (b) => b.kind === "desk" && b.date === dateKey && shiftOverlaps(b.shiftKey, selectedShift),
      );
      if (conflict) {
        toast.error("You already have a seat for this shift", {
          description: `Release ${conflict.spot} first if you want a different seat.`,
        });
        return;
      }

      // 2) Pre-check company-wide bookings (seat already taken by a colleague)
      const taken = companyBookings.find((cb) => {
        if (cb.user_id === authUserId) return false;
        if (cb.desk_label !== spot) return false;
        if (cb.booking_date !== dateKey) return false;
        let meta: any = {};
        try { meta = cb.notes ? JSON.parse(cb.notes) : {}; } catch { /* ignore */ }
        const cbFloor = Number(meta.floor ?? cb.floor) || 0;
        const cbArea = (cb.area || meta.area || "").toUpperCase();
        const cbShiftKey = (meta.shiftKey || cb.time_slot?.toLowerCase() || "") as ShiftKey | "";
        return cbFloor === selectedFloor && cbArea === selectedArea.toUpperCase() && shiftOverlaps(cbShiftKey, selectedShift);
      });
      if (taken) {
        toast.error("This seat is already booked.", {
          description: `Booked by ${taken.user_name || "another employee"}.`,
        });
        return;
      }
    }

    // 3) DB-first insert for desks so the unique-index / overlap-trigger is authoritative
    if (effectiveKind === "desk" && authUserId && companyProfile?.id) {
      const meta = JSON.stringify({
        kind: "desk",
        floor: selectedFloor,
        area: selectedArea,
        time: selectedHourlySlot,
        shift: currentShift.label,
        shiftKey: currentShift.id,
        shiftRange: currentShift.range,
        endsAt: computeShiftEnd(bookingDate, currentShift),
      });
      const { data, error } = await supabase.rpc("book_desk_reservation", {
        _company_id: companyProfile.id,
        _desk_label: spot,
        _floor: String(selectedFloor),
        _area: selectedArea,
        _booking_date: dateKey,
        _time_slot: currentShift.label || "Full Day",
        _user_name: currentUser?.displayName ?? "Employee",
        _notes: meta,
      });

      if (error) {
        const msg = error.message || "";
        if (error.code === "23505" || /already booked|duplicate key|overlap/i.test(msg)) {
          toast.error("This seat is already booked.", {
            description: "Please pick another seat or time slot.",
          });
        } else {
          toast.error("Could not book seat", { description: msg });
        }
        return;
      }

      const newBooking: ConfirmedBooking = {
        id: data?.id ?? `${Date.now()}`,
        kind: "desk",
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
      const bookerName = currentUser?.displayName ?? "You";
      const bookerEmail = currentUser?.email ?? "";
      setBookingText(
        `Seat ${spot} booked by ${bookerName}${bookerEmail ? ` (${bookerEmail})` : ""}`,
      );
      toast.success(`Seat ${spot} booked by ${bookerName}.`, {
        description: `${bookerEmail ? bookerEmail + " · " : ""}Floor ${selectedFloor} · ${selectedArea} · ${currentShift.label} · ${currentShift.range}`,
      });
      return;
    }

    // Rooms (or unauthenticated demo) — keep local-only flow
    const newBooking: ConfirmedBooking = {
      id: `${Date.now()}`,
      kind: effectiveKind,
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
    const bookerName = currentUser?.displayName ?? "You";
    const bookerEmail = currentUser?.email ?? "";
    setBookingText(
      `${effectiveKind === "desk" ? "Seat" : "Meeting room"} ${spot} booked by ${bookerName}${bookerEmail ? ` (${bookerEmail})` : ""}`,
    );
    toast.success(
      `${effectiveKind === "desk" ? "Seat" : "Meeting room"} ${spot} booked by ${bookerName}.`,
      { description: `${bookerEmail ? bookerEmail + " · " : ""}Floor ${selectedFloor} · ${selectedArea} · ${currentShift.label} · ${currentShift.range}` },
    );
  };

  const handleReleaseBooking = async (id: string) => {
    setConfirmedBookings((current) =>
      current.map((b) => (b.id === id ? { ...b, released: true } : b)),
    );
    if (/^[0-9a-f-]{36}$/i.test(id)) {
      await supabase.from("desk_reservations").update({ status: "released" }).eq("id", id);
    }
    toast.success("Desk released", { description: "Seat is now available for others." });
  };

  const handleCommitTimezone = () => {
    if (!draftTimezone) return;
    window.localStorage.setItem("deskflow-user-timezone", draftTimezone);
    setUserTimezone(draftTimezone);
    toast.success("Timezone locked", { description: `Set to ${draftTimezone}. This is permanent.` });
  };

  // ============== VISUAL FLOOR MAP ==============
  const renderMapPanel = () => {
    const dateKey = format(bookingDate, "yyyy-MM-dd");

    // Merge: own (local) bookings + colleague (DB) bookings — colleagues take precedence visually only when not mine.
    type SeatOcc = { spot: string; bookerName: string; isMine: boolean; shift: string; shiftRange: string; floor: number; area: string };
    const seatOccupants = new Map<string, SeatOcc>();

    // Own bookings (local state — already filtered by current user)
    confirmedBookings.forEach((b) => {
      if (
        b.kind === "desk" &&
        !b.released &&
        b.floor === selectedFloor &&
        b.area === selectedArea &&
        b.shiftKey === selectedShift &&
        b.date === dateKey
      ) {
        seatOccupants.set(b.spot, {
          spot: b.spot,
          bookerName: currentUser?.displayName ?? "You",
          isMine: true,
          shift: b.shift,
          shiftRange: b.shiftRange,
          floor: b.floor,
          area: b.area,
        });
      }
    });

    // Company-wide bookings (other employees) — same floor/shift/date
    companyBookings.forEach((cb) => {
      if (cb.user_id === authUserId) return; // mine already added above
      if (cb.booking_date !== dateKey) return;
      let meta: any = {};
      try { meta = cb.notes ? JSON.parse(cb.notes) : {}; } catch { /* ignore */ }
      const cbFloor = Number(meta.floor ?? cb.floor) || 0;
      const cbArea = (cb.area || meta.area || "").toUpperCase();
      const cbShiftKey = (meta.shiftKey || cb.time_slot?.toLowerCase() || "") as ShiftKey | "";
      if (cbFloor !== selectedFloor) return;
      if (cbArea !== selectedArea.toUpperCase()) return;
      if (!shiftOverlaps(cbShiftKey, selectedShift)) return;
      if (seatOccupants.has(cb.desk_label)) return;
      seatOccupants.set(cb.desk_label, {
        spot: cb.desk_label,
        bookerName: cb.user_name || "Colleague",
        isMine: false,
        shift: meta.shift || cb.time_slot || "",
        shiftRange: meta.shiftRange || "",
        floor: cbFloor,
        area: cbArea,
      });
    });

    const cellsForArea = Array.from(seatOccupants.values());
    const occupiedMap = seatOccupants;

    const totalSeats = seatRows.length * seatColumns.length;
    const occupiedCount = cellsForArea.length;
    const availableCount = totalSeats - occupiedCount;

    const handleMapSeatClick = (seatId: string) => {
      const existing = occupiedMap.get(seatId);
      if (existing) {
        toast.info(`${seatId} is already booked`, {
          description: `Booked by ${existing.bookerName}${existing.shiftRange ? ` · ${existing.shiftRange}` : ""}`,
        });
        return;
      }
      setBookingKind("desk");
      setSelectedSeat(seatId);
      setSelectedDeskId(seatId);
      setTimeout(() => handleConfirmBooking(seatId, "desk"), 0);
    };

    return (
      <div className="space-y-5">
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Floor map</p>
              <h2 className="font-display text-xl font-extrabold">Pick a seat visually</h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Floor</label>
              <Select value={String(selectedFloor)} onValueChange={(v) => setSelectedFloor(Number(v))}>
                <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {companyFloors.map((f) => (
                    <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Area</label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {companyAreas.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Shift</label>
              <Select value={selectedShift} onValueChange={(v) => setSelectedShift(v as ShiftKey)}>
                <SelectTrigger className="mt-1 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {shiftDefinitions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label} · {s.range}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Date</label>
              <Input
                type="date"
                className="mt-1 rounded-2xl"
                value={format(bookingDate, "yyyy-MM-dd")}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  if (!isNaN(d.getTime())) setBookingDate(d);
                }}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-extrabold">
            <div className="rounded-xl bg-success/15 p-2 text-success">
              <p className="font-display text-base">{availableCount}</p>
              <p className="uppercase">Free</p>
            </div>
            <div className="rounded-xl bg-destructive/10 p-2 text-destructive">
              <p className="font-display text-base">{occupiedCount}</p>
              <p className="uppercase">Booked</p>
            </div>
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <p className="font-display text-base">{totalSeats}</p>
              <p className="uppercase">Total</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {selectedArea} · Floor {selectedFloor}
          </p>
          <h3 className="mt-1 font-display text-lg font-extrabold">Tap a seat to book</h3>

          <div className="mt-4 rounded-2xl bg-surface-muted p-4">
            <div className="grid gap-2" style={{ gridTemplateColumns: `auto repeat(${seatColumns.length}, minmax(0, 1fr))` }}>
              <div />
              {seatColumns.map((c) => (
                <div key={`h-${c}`} className="text-center text-[10px] font-extrabold uppercase text-muted-foreground">
                  {c}
                </div>
              ))}
              {seatRows.map((row) => (
                <div key={`row-${row}`} className="contents">
                  <div className="flex items-center justify-center text-[10px] font-extrabold uppercase text-muted-foreground">
                    {row}
                  </div>
                  {seatColumns.map((col) => {
                    const seatId = `${row}${col}`;
                    const occ = occupiedMap.get(seatId);
                    const isMine = !!occ?.isMine;
                    // Available = green; My booking = primary ring; Colleague booking = light red
                    const tone = !occ
                      ? "bg-success/10 text-success border-success/30 hover:bg-success/20"
                      : isMine
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-red-200/60 text-red-700 border-red-300 cursor-not-allowed dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40";
                    const titleText = occ
                      ? isMine
                        ? `${seatId} · booked by you`
                        : `${seatId} · booked by ${occ.bookerName}`
                      : `${seatId} · available`;
                    return (
                      <button
                        key={seatId}
                        onClick={() => handleMapSeatClick(seatId)}
                        disabled={!!occ && !isMine}
                        className={`focus-premium aspect-square rounded-xl border-2 text-xs font-extrabold transition ${tone}`}
                        title={titleText}
                      >
                        <span className="block leading-tight">{seatId}</span>
                        {occ && !isMine && (
                          <span className="mt-0.5 block truncate px-1 text-[8px] font-bold opacity-80">
                            {occ.bookerName.split(" ")[0]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] font-extrabold">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-success/30 ring-1 ring-success/50" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-primary/30 ring-1 ring-primary/50" /> Your seat
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-red-300 ring-1 ring-red-400 dark:bg-red-500/40 dark:ring-red-500/60" /> Booked by colleague
              </span>
            </div>
          </div>

          {cellsForArea.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Booked this shift
              </p>
              <ul className="mt-2 space-y-1">
                {cellsForArea.map((b) => (
                  <li key={b.spot} className="flex items-center justify-between rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs font-extrabold">
                    <span>{b.spot} · <span className="font-bold text-muted-foreground">{b.isMine ? "You" : b.bookerName}</span></span>
                    <span className="text-muted-foreground">{b.shiftRange}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============== DIRECTORY PANEL ==============
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryFilter, setDirectoryFilter] = useState<"all" | "online" | "today">("all");

  const renderDirectoryPanel = () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todaysAttendance = attendance.filter((r) => r.date === todayStr);

    const isOnline = (empName: string) => {
      const target = empName.trim().toLowerCase();
      return todaysAttendance.some(
        (r) => r.signInAt && !r.signOutAt && r.userName?.trim().toLowerCase() === target,
      );
    };
    const hasSignedInToday = (empName: string) => {
      const target = empName.trim().toLowerCase();
      return todaysAttendance.some(
        (r) => r.signInAt && r.userName?.trim().toLowerCase() === target,
      );
    };

    const q = directoryQuery.trim().toLowerCase();
    const filtered = employees.filter((emp) => {
      const matchesQuery =
        !q ||
        emp.display_name.toLowerCase().includes(q) ||
        (emp.email ?? "").toLowerCase().includes(q) ||
        (emp.phone ?? "").toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (directoryFilter === "online") return isOnline(emp.display_name);
      if (directoryFilter === "today") return hasSignedInToday(emp.display_name);
      return true;
    });

    const onlineCount = employees.filter((e) => isOnline(e.display_name)).length;
    const todayCount = employees.filter((e) => hasSignedInToday(e.display_name)).length;

    const initialsOf = (name: string) =>
      name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";

    return (
      <div className="space-y-5">
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg font-extrabold">Directory</h3>
            <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-muted-foreground">
              {employees.length} teammates
            </span>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={directoryQuery}
              onChange={(e) => setDirectoryQuery(e.target.value)}
              placeholder="Search by name, email or phone"
              className="focus-premium h-12 w-full rounded-2xl border border-border bg-background pl-10 pr-4 text-sm font-extrabold"
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {([
              { id: "all", label: `All · ${employees.length}` },
              { id: "online", label: `Online · ${onlineCount}` },
              { id: "today", label: `Today · ${todayCount}` },
            ] as const).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDirectoryFilter(f.id)}
                className={cn(
                  "focus-premium rounded-2xl py-2 text-xs font-extrabold transition-all",
                  directoryFilter === f.id
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          {filtered.length === 0 ? (
            <p className="rounded-2xl bg-background p-4 text-center text-xs font-semibold text-muted-foreground">
              {employees.length === 0
                ? "No teammates yet. Send invites from the Admin console."
                : "No teammates match your search."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((emp) => {
                const online = isOnline(emp.display_name);
                const seenToday = !online && hasSignedInToday(emp.display_name);
                return (
                  <li key={emp.id} className="flex items-center gap-3 rounded-2xl bg-background p-3">
                    <div className="relative">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-primary">
                        <span className="font-display text-sm font-extrabold">{initialsOf(emp.display_name)}</span>
                      </div>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background",
                          online ? "bg-success" : "bg-muted-foreground/40",
                        )}
                        aria-label={online ? "Online" : "Offline"}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold">{emp.display_name}</p>
                      <p className="truncate text-xs font-semibold text-muted-foreground">
                        {emp.email ?? "No email"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {online && (
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-extrabold uppercase text-success">
                            Online
                          </span>
                        )}
                        {seenToday && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold uppercase text-primary">
                            Signed in today
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {emp.email && (
                        <a
                          href={`mailto:${emp.email}`}
                          className="focus-premium grid h-9 w-9 place-items-center rounded-2xl bg-muted text-muted-foreground hover:text-primary"
                          aria-label={`Email ${emp.display_name}`}
                          title="Email"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {emp.phone && (
                        <a
                          href={`tel:${emp.phone}`}
                          className="focus-premium grid h-9 w-9 place-items-center rounded-2xl bg-muted text-muted-foreground hover:text-primary"
                          aria-label={`Call ${emp.display_name}`}
                          title="Call"
                        >
                          <Smartphone className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  // ============== ROOMS PANEL ==============
  const renderRoomsPanel = () => {
    const todayKey = format(new Date(nowTs), "yyyy-MM-dd");
    const nowMin = new Date(nowTs).getHours() * 60 + new Date(nowTs).getMinutes();
    const dayMeetings = roomMeetings
      .filter((m) => m.date === meetingForm.date)
      .filter((m) => !(meetingForm.date === todayKey && m.endMinutes <= nowMin))
      .sort((a, b) => a.startMinutes - b.startMinutes);
    const selectedRoomMeta = meetingRoomCatalog.find((r) => r.id === meetingForm.roomId)!;

    return (
      <div className="space-y-5">
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Meeting rooms</p>
              <h2 className="font-display text-xl font-extrabold">Book a room</h2>
            </div>
          </div>

          <form onSubmit={handleBookRoom} className="mt-4 space-y-3">
            <Input
              className="rounded-2xl"
              placeholder="Meeting title (e.g. Sprint review)"
              value={meetingForm.title}
              onChange={(e) => setMeetingForm((p) => ({ ...p, title: e.target.value }))}
              maxLength={120}
            />

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Room</label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {meetingRoomCatalog.map((r) => {
                  const selected = meetingForm.roomId === r.id;
                  const totalAttendees = meetingForm.attendeeIds.length + 1;
                  const overCap = selected && totalAttendees > r.capacity;
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setMeetingForm((p) => ({ ...p, roomId: r.id }))}
                      className={`focus-premium flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-extrabold transition ${
                        selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-muted text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <DoorOpen className="h-4 w-4" />
                        {r.name} <span className="text-xs font-bold opacity-70">· {r.id}</span>
                      </span>
                      <span className={`text-xs ${overCap ? "text-destructive" : "opacity-80"}`}>
                        Floor {r.floor} · seats {r.capacity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Date</label>
                <Input
                  type="date"
                  className="mt-1 rounded-2xl"
                  value={meetingForm.date}
                  onChange={(e) => setMeetingForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3 w-3" /> Start
                </label>
                <Select
                  value={meetingForm.startTime}
                  onValueChange={(v) => setMeetingForm((p) => ({ ...p, startTime: v }))}
                >
                  <SelectTrigger className="mt-1 rounded-2xl">
                    <SelectValue placeholder="--:--" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {CLOCK_SLOTS_15.map((s) => (
                      <SelectItem key={`s-${s.value}`} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3 w-3" /> End
                </label>
                <Select
                  value={meetingForm.endTime}
                  onValueChange={(v) => setMeetingForm((p) => ({ ...p, endTime: v }))}
                >
                  <SelectTrigger className="mt-1 rounded-2xl">
                    <SelectValue placeholder="--:--" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {CLOCK_SLOTS_15
                      .filter((s) => {
                        const startM = parseTimeToMinutes(meetingForm.startTime);
                        return startM === null ? true : s.minutes >= startM + 15;
                      })
                      .map((s) => (
                        <SelectItem key={`e-${s.value}`} value={s.value}>{s.label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="-mt-1 text-[11px] font-semibold text-muted-foreground">
              Round-the-clock 15-minute slots · room auto-releases when the slot ends
            </p>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Attendees ({meetingForm.attendeeIds.length} + you)
                </label>
                <span className="text-[11px] font-bold text-muted-foreground">
                  Capacity {selectedRoomMeta.capacity}
                </span>
              </div>
              {employees.length === 0 ? (
                <p className="mt-2 rounded-2xl bg-surface-muted p-3 text-xs font-semibold text-muted-foreground">
                  Your roster is empty. Add employees from the Admin console.
                </p>
              ) : (
                <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-2xl border border-border bg-surface-muted p-2">
                  {employees.map((emp) => {
                    const checked = meetingForm.attendeeIds.includes(emp.id);
                    const isMe = emp.email && currentUser?.email && emp.email.toLowerCase() === currentUser.email.toLowerCase();
                    if (isMe) return null;
                    return (
                      <button
                        type="button"
                        key={emp.id}
                        onClick={() => handleToggleAttendee(emp.id)}
                        className={`focus-premium flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold transition ${
                          checked ? "bg-primary/15 text-primary" : "bg-background text-foreground hover:bg-background/60"
                        }`}
                      >
                        <span className="truncate">{emp.display_name}</span>
                        <span className={checked ? "text-primary" : "text-muted-foreground"}>
                          {checked ? "✓ Invited" : "Add"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow"
            >
              <CalendarCheck className="h-5 w-5" /> Book room
            </button>
          </form>
        </div>

        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Schedule for {meetingForm.date}
          </p>
          <h3 className="mt-1 font-display text-lg font-extrabold">{dayMeetings.length} meeting{dayMeetings.length === 1 ? "" : "s"}</h3>
          {dayMeetings.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-surface-muted p-3 text-sm font-semibold text-muted-foreground">
              Nothing booked for this day yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {dayMeetings.map((m) => {
                const canRelease = isAdmin || m.organizerId === currentUser?.email;
                const isLive = meetingForm.date === todayKey && m.startMinutes <= nowMin && nowMin < m.endMinutes;
                const isUpcoming = meetingForm.date > todayKey || (meetingForm.date === todayKey && nowMin < m.startMinutes);
                return (
                  <li key={m.id} className="rounded-2xl border border-border bg-surface-muted p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-display text-sm font-extrabold">{m.title}</p>
                          {isLive && (
                            <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-extrabold uppercase text-destructive-foreground">
                              In use
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold uppercase text-primary">
                              Upcoming
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-foreground">
                          <DoorOpen className="h-3 w-3" /> {m.roomName}
                          <Clock className="ml-2 h-3 w-3" /> {minutesToLabel(m.startMinutes)} – {minutesToLabel(m.endMinutes)}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                          Booked by <span className="font-extrabold text-foreground">{m.organizerName}</span> · until {minutesToLabel(m.endMinutes)}
                          {m.attendeeNames.length > 0 && ` · with ${m.attendeeNames.slice(0, 3).join(", ")}${m.attendeeNames.length > 3 ? ` +${m.attendeeNames.length - 3}` : ""}`}
                        </p>
                      </div>
                      {canRelease && (
                        <button
                          onClick={() => handleCancelMeeting(m.id)}
                          className="focus-premium flex items-center gap-1 rounded-xl bg-destructive/10 px-3 py-1.5 text-[11px] font-extrabold text-destructive"
                          title="Release room"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Release
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const renderBookingPanel = () => {
    const dateKey = format(bookingDate, "yyyy-MM-dd");

    // Build a per-seat status map for the current floor/area/shift/date
    const seatStatusMap = new Map<
      string,
      { state: "mine" | "taken"; bookerName: string; shift: string; shiftRange: string }
    >();
    confirmedBookings.forEach((b) => {
      if (b.kind !== "desk" || b.released) return;
      if (b.date !== dateKey || b.floor !== selectedFloor) return;
      if ((b.area || "").toUpperCase() !== selectedArea.toUpperCase()) return;
      if (!shiftOverlaps(b.shiftKey as ShiftKey, selectedShift)) return;
      seatStatusMap.set(b.spot, {
        state: "mine",
        bookerName: currentUser?.displayName ?? "You",
        shift: b.shift,
        shiftRange: b.shiftRange,
      });
    });
    companyBookings.forEach((cb) => {
      if (cb.user_id === authUserId) return;
      if (cb.booking_date !== dateKey) return;
      let meta: any = {};
      try { meta = cb.notes ? JSON.parse(cb.notes) : {}; } catch { /* ignore */ }
      const cbFloor = Number(meta.floor ?? cb.floor) || 0;
      const cbArea = (cb.area || meta.area || "").toUpperCase();
      const cbShiftKey = (meta.shiftKey || cb.time_slot?.toLowerCase() || "") as ShiftKey | "";
      if (cbFloor !== selectedFloor) return;
      if (cbArea !== selectedArea.toUpperCase()) return;
      if (!shiftOverlaps(cbShiftKey, selectedShift)) return;
      if (seatStatusMap.has(cb.desk_label)) return;
      seatStatusMap.set(cb.desk_label, {
        state: "taken",
        bookerName: cb.user_name || "Colleague",
        shift: meta.shift || cb.time_slot || "",
        shiftRange: meta.shiftRange || "",
      });
    });

    const totalSeats = seatRows.length * seatColumns.length;
    const takenCount = Array.from(seatStatusMap.values()).filter((s) => s.state !== "mine" || true).length;
    const availSeats = totalSeats - takenCount;

    // Quick date helpers
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const lastBooking = confirmedBookings[0];

    const selectedStatus = bookingKind === "desk" ? seatStatusMap.get(selectedSeat) : undefined;
    const canConfirm = bookingKind === "desk" ? !selectedStatus : Boolean(selectedRoom);

    return (
      <div id="booking" className="space-y-4">
        {/* Hero */}
        <div className="overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-primary/15 via-surface-raised to-surface-raised p-4 shadow-card sm:rounded-[1.75rem] sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px] sm:tracking-[0.2em]">Reserve a spot</p>
              <h2 className="mt-1 font-display text-xl font-extrabold leading-tight sm:text-2xl">
                {bookingKind === "desk" ? "Find your seat" : "Book a meeting room"}
              </h2>
              <p className="mt-1 text-[11px] font-semibold text-muted-foreground sm:text-xs">
                {availSeats} of {totalSeats} seats free · {currentShift.label}
              </p>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow sm:h-14 sm:w-14">
              <p className="font-display text-xl font-extrabold leading-none sm:text-2xl">{confirmedBookings.length}</p>
            </div>
          </div>

          {/* Desk vs Room */}
          <div className="mt-4 grid grid-cols-2 rounded-2xl bg-background/70 p-1 backdrop-blur">
            {(["desk", "room"] as BookingKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setBookingKind(kind)}
                className={`focus-premium flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-extrabold transition-all ${
                  bookingKind === kind ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
                }`}
              >
                {kind === "desk" ? <Sofa className="h-4 w-4" /> : <DoorOpen className="h-4 w-4" />}
                {kind === "desk" ? "Desk seat" : "Meeting room"}
              </button>
            ))}
          </div>
        </div>

        {/* Date + Shift — primary controls (Shift hidden for room bookings) */}
        <div className={cn("grid gap-3", bookingKind === "desk" && "sm:grid-cols-2")}>

          {/* Date */}
          <div className="rounded-2xl bg-surface-raised p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Date</p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setBookingDate(today)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase transition ${
                    isSameDay(bookingDate, today) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setBookingDate(tomorrow)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase transition ${
                    isSameDay(bookingDate, tomorrow) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"
                  }`}
                >
                  Tomorrow
                </button>
              </div>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="focus-premium mt-2 flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-left"
                >
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <span className="font-extrabold">{format(bookingDate, "EEE, MMM d")}</span>
                    <span className="text-xs font-semibold text-muted-foreground">{format(bookingDate, "yyyy")}</span>
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
                    const t = new Date(); t.setHours(0, 0, 0, 0);
                    return date < t;
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Shift — only for desk bookings */}
          {bookingKind === "desk" && (
            <div className="rounded-2xl bg-surface-raised p-4 shadow-card">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Shift</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {shiftDefinitions.map((shift) => (
                  <button
                    key={shift.id}
                    type="button"
                    onClick={() => {
                      setSelectedShift(shift.id);
                      setSelectedHourlySlot(shift.times[0]);
                    }}
                    className={`focus-premium rounded-xl px-2 py-1.5 text-left transition-all ${
                      selectedShift === shift.id
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-muted text-muted-foreground hover:bg-primary/10"
                    }`}
                  >
                    <span className="block text-xs font-extrabold leading-tight">{shift.label}</span>
                    <span className="block text-[10px] font-semibold opacity-80">{shift.range}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Seats / Rooms */}
        {bookingKind === "desk" ? (
          <div className="rounded-2xl bg-surface-raised p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Seats · Floor {selectedFloor} · {selectedArea}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Available</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Booked</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2.5 xs:grid-cols-5 sm:gap-3">
              {seatRows.map((row) =>
                seatColumns.map((col) => {
                  const seatId = `${row}${col}`;
                  const status = seatStatusMap.get(seatId);
                  const isSelected = selectedSeat === seatId;
                  const isMine = status?.state === "mine";
                  const isTaken = status?.state === "taken";
                  const initials = (status?.bookerName || "")
                    .split(" ")
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  return (
                    <button
                      key={seatId}
                      type="button"
                      onClick={() => {
                        if (isTaken) {
                          toast.error("This seat is already booked.", {
                            description: `Booked by ${status?.bookerName || "another employee"}.`,
                          });
                          return;
                        }
                        if (isMine) {
                          toast.info("You already booked this seat.", {
                            description: "Release it from Recent bookings to free it up.",
                          });
                          return;
                        }
                        setSelectedSeat(seatId);
                        setTimeout(() => handleConfirmBooking(seatId, "desk"), 0);
                      }}
                      title={status ? `Booked by ${status.bookerName}` : "Available"}
                      className={cn(
                        "focus-premium group relative flex flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3.5 text-xs font-extrabold transition-all min-h-[64px] sm:min-h-0 sm:p-2.5",
                        isTaken || isMine
                          ? "border-red-300/70 bg-red-100/70 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200"
                          : isSelected
                            ? "border-[3px] border-primary bg-primary text-primary-foreground shadow-[0_8px_28px_-8px_hsl(var(--primary)/0.55)] scale-[1.06] ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:scale-[1.04] hover:border-emerald-400 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200",
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {isTaken ? (
                          <Lock className="h-4 w-4 sm:h-3 sm:w-3" />
                        ) : isMine ? (
                          <CheckCircle2 className="h-4 w-4 sm:h-3 sm:w-3" />
                        ) : isSelected ? (
                          <Sparkles className="h-4 w-4 sm:h-3 sm:w-3" />
                        ) : (
                          <Sofa className="h-4 w-4 sm:h-3 sm:w-3" />
                        )}
                        <span className="text-base sm:text-sm">{seatId}</span>
                      </div>
                      {status && (
                        <span className="line-clamp-1 max-w-full text-[10px] font-semibold opacity-80 sm:text-[9px]">
                          {isMine ? "You" : status.bookerName}
                        </span>
                      )}
                      {isTaken && initials && (
                        <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-[10px] font-extrabold text-white shadow-sm ring-2 ring-background sm:h-5 sm:w-5 sm:text-[9px]">
                          {initials}
                        </span>
                      )}
                      {!isTaken && !isMine && isSelected && (
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-primary-foreground px-1.5 py-0.5 text-[9px] font-extrabold text-primary shadow-sm">
                          Selected
                        </span>
                      )}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-raised p-4 shadow-card">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Meeting room</p>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
              Pick a room to choose a 15-minute time slot, then review and confirm.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {meetingRoomCatalog.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoom(room.id);
                    setRoomWizard({
                      open: true,
                      roomId: room.id,
                      startTime: "09:00",
                      endTime: "09:30",
                      step: "slot",
                      title: "",
                    });
                  }}
                  className={cn(
                    "focus-premium flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-xs font-extrabold transition-all",
                    selectedRoom === room.id
                      ? "border-primary bg-primary text-primary-foreground shadow-glow"
                      : "border-border bg-background hover:border-primary/40",
                  )}
                >
                  <DoorOpen className="h-4 w-4" />
                  {room.id}
                  <span className="text-[10px] font-semibold opacity-80">{room.name}</span>
                  <span className="text-[10px] font-semibold opacity-70">Seats {room.capacity}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary + confirm (sticky-ish) */}
        {/* Confirm summary removed — seat/room selection auto-confirms */}

        {/* Quick rebook */}
        {lastBooking && (
          <button
            type="button"
            onClick={() => {
              setBookingKind(lastBooking.kind);
              setSelectedFloor(lastBooking.floor);
              setSelectedArea(lastBooking.area);
              if (lastBooking.kind === "desk") setSelectedSeat(lastBooking.spot);
              else setSelectedRoom(lastBooking.spot);
              setSelectedShift(lastBooking.shiftKey as ShiftKey);
              toast.success("Loaded your last booking selection", { description: "Review the date and tap Confirm." });
            }}
            className="focus-premium flex w-full items-center justify-between rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3 text-left transition hover:bg-primary/10"
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <span className="text-xs font-extrabold">
                Rebook last: {lastBooking.kind === "desk" ? "Seat" : "Room"} {lastBooking.spot} · {lastBooking.shift}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-primary" />
          </button>
        )}

        {/* Recent bookings */}
        {confirmedBookings.length > 0 && (
          <div className="rounded-2xl bg-surface-raised p-4 shadow-card">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Your recent bookings</p>
            <div className="mt-3 space-y-2">
              {confirmedBookings.map((booking) => {
                const isActive = !booking.released && booking.endsAt > nowTs;
                return (
                  <div key={booking.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                        isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      )}>
                        {booking.kind === "desk" ? <Sofa className="h-4 w-4" /> : <DoorOpen className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold">
                          {booking.kind === "desk" ? "Seat" : "Room"} {booking.spot} · F{booking.floor} · {booking.area}
                        </p>
                        <p className="truncate text-[11px] font-semibold text-muted-foreground">
                          {booking.date} · {booking.shift} ({booking.shiftRange})
                        </p>
                      </div>
                    </div>
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => handleReleaseBooking(booking.id)}
                        className="focus-premium flex shrink-0 items-center gap-1 rounded-xl bg-destructive px-3 py-2 text-[11px] font-extrabold text-destructive-foreground shadow-md transition-transform hover:-translate-y-0.5"
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
          </div>
        )}

        {/* ===== Meeting Room Booking Wizard ===== */}
        <Dialog
          open={roomWizard.open}
          onOpenChange={(o) => setRoomWizard((p) => ({ ...p, open: o, step: o ? p.step : "slot" }))}
        >
          <DialogContent className="max-w-lg">
            {(() => {
              const wizardRoom = meetingRoomCatalog.find((r) => r.id === roomWizard.roomId) ?? meetingRoomCatalog[0];
              const dateKey = format(bookingDate, "yyyy-MM-dd");
              const startM = parseTimeToMinutes(roomWizard.startTime);
              const endM = parseTimeToMinutes(roomWizard.endTime);
              const todayKeyW = format(new Date(nowTs), "yyyy-MM-dd");
              const nowMinW = new Date(nowTs).getHours() * 60 + new Date(nowTs).getMinutes();
              const busyForRoom = roomMeetings
                .filter((m) => m.roomId === wizardRoom.id && m.date === dateKey)
                .filter((m) => !(dateKey === todayKeyW && m.endMinutes <= nowMinW))
                .sort((a, b) => a.startMinutes - b.startMinutes);

              const conflictingBookings =
                startM !== null && endM !== null
                  ? busyForRoom.filter((b) => startM < b.endMinutes && endM > b.startMinutes)
                  : [];
              const overlapsBusy = (s: number, e: number) =>
                busyForRoom.some((b) => s < b.endMinutes && e > b.startMinutes);


              // Cross-room: any of my own meetings on this date that overlap
              const myOwnConflict =
                startM !== null && endM !== null && currentUser
                  ? roomMeetings.find(
                      (m) =>
                        m.organizerId === currentUser.email &&
                        m.date === dateKey &&
                        !(dateKey === todayKeyW && m.endMinutes <= nowMinW) &&
                        startM < m.endMinutes &&
                        endM > m.startMinutes,
                    )
                  : undefined;

              const hasOverlap =
                startM !== null && endM !== null && overlapsBusy(startM, endM);

              const validWindow =
                startM !== null &&
                endM !== null &&
                endM >= startM + 15 &&
                !hasOverlap &&
                !myOwnConflict;

              const goReview = () => {
                if (startM === null || endM === null || endM < startM + 15) {
                  toast.error("Pick a valid 15-minute window");
                  return;
                }
                if (hasOverlap) {
                  const c = conflictingBookings[0];
                  toast.error(`${wizardRoom.name} is already booked at that time`, {
                    description: c
                      ? `${minutesToLabel(c.startMinutes)} – ${minutesToLabel(c.endMinutes)} · ${c.organizerName}${c.title ? ` (${c.title})` : ""}`
                      : undefined,
                  });
                  return;
                }

                if (myOwnConflict) {
                  toast.error("You already have a meeting at that time", {
                    description: `${myOwnConflict.roomName} · ${minutesToLabel(myOwnConflict.startMinutes)} – ${minutesToLabel(myOwnConflict.endMinutes)}`,
                  });
                  return;
                }
                setRoomWizard((p) => ({ ...p, step: "review" }));
              };

              const confirmBooking = () => {
                if (!currentUser) {
                  toast.error("Sign in to book a room");
                  return;
                }
                if (startM === null || endM === null || endM < startM + 15) {
                  toast.error("Pick a valid 15-minute window");
                  return;
                }
                if (hasOverlap) {
                  toast.error("This room is already booked for that time");
                  return;
                }
                if (myOwnConflict) {
                  toast.error("You already have a meeting at that time", {
                    description: `${myOwnConflict.roomName} · ${minutesToLabel(myOwnConflict.startMinutes)} – ${minutesToLabel(myOwnConflict.endMinutes)}`,
                  });
                  return;
                }



                const meeting: RoomMeeting = {
                  id: `${Date.now()}`,
                  roomId: wizardRoom.id,
                  roomName: wizardRoom.name,
                  date: dateKey,
                  startMinutes: startM,
                  endMinutes: endM,
                  title: roomWizard.title.trim() || `${wizardRoom.name} meeting`,
                  organizerId: currentUser.email,
                  organizerName: currentUser.displayName ?? currentUser.email,
                  attendeeIds: [],
                  attendeeNames: [],
                  createdAt: Date.now(),
                };
                setRoomMeetings((prev) => [meeting, ...prev]);

                const newBooking: ConfirmedBooking = {
                  id: meeting.id,
                  kind: "room",
                  floor: wizardRoom.floor,
                  area: `Floor ${wizardRoom.floor}`,
                  spot: wizardRoom.id,
                  time: `${minutesToLabel(startM)} – ${minutesToLabel(endM)}`,
                  shift: `${minutesToLabel(startM)} – ${minutesToLabel(endM)}`,
                  shiftKey: "day",
                  shiftRange: `${minutesToLabel(startM)} – ${minutesToLabel(endM)}`,
                  date: dateKey,
                  endsAt: new Date(`${dateKey}T${roomWizard.endTime}:00`).getTime(),
                  released: false,
                };
                setConfirmedBookings((cur) => [newBooking, ...cur].slice(0, 12));

                toast.success(`${wizardRoom.name} booked`, {
                  description: `${dateKey} · ${minutesToLabel(startM)} – ${minutesToLabel(endM)}`,
                });
                setRoomWizard((p) => ({ ...p, open: false, step: "slot", title: "" }));
              };

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5 text-primary" />
                      Book {wizardRoom.name} ({wizardRoom.id})
                    </DialogTitle>
                    <DialogDescription>
                      Floor {wizardRoom.floor} · Seats {wizardRoom.capacity} · {format(bookingDate, "EEE, MMM d")}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Stepper */}
                  <div className="grid grid-cols-2 rounded-2xl bg-muted p-1 text-[11px] font-extrabold uppercase">
                    {[
                      { id: "slot" as const, label: "1 · Time slot" },
                      { id: "review" as const, label: "2 · Review & confirm" },
                    ].map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          "rounded-xl px-2 py-1.5 text-center transition",
                          roomWizard.step === s.id ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground",
                        )}
                      >
                        {s.label}
                      </div>
                    ))}
                  </div>

                  {roomWizard.step === "slot" ? (
                    <div className="space-y-4">
                      <Input
                        placeholder="Meeting title (optional)"
                        value={roomWizard.title}
                        onChange={(e) => setRoomWizard((p) => ({ ...p, title: e.target.value }))}
                        maxLength={120}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            <Clock className="h-3 w-3" /> Start
                          </label>
                          <Select
                            value={roomWizard.startTime}
                            onValueChange={(v) => {
                              const sM = parseTimeToMinutes(v) ?? 0;
                              setRoomWizard((p) => {
                                const eM = parseTimeToMinutes(p.endTime) ?? 0;
                                const newEnd = eM <= sM ? Math.min(sM + 15, 23 * 60 + 45) : eM;
                                const hh = String(Math.floor(newEnd / 60)).padStart(2, "0");
                                const mm = String(newEnd % 60).padStart(2, "0");
                                return { ...p, startTime: v, endTime: `${hh}:${mm}` };
                              });
                            }}
                          >
                            <SelectTrigger className="mt-1 rounded-xl">
                              <SelectValue placeholder="--:--" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {CLOCK_SLOTS_15.map((s) => (
                                <SelectItem key={`ws-${s.value}`} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                            <Clock className="h-3 w-3" /> End
                          </label>
                          <Select
                            value={roomWizard.endTime}
                            onValueChange={(v) => setRoomWizard((p) => ({ ...p, endTime: v }))}
                          >
                            <SelectTrigger className="mt-1 rounded-xl">
                              <SelectValue placeholder="--:--" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {CLOCK_SLOTS_15.filter((s) => (startM === null ? true : s.minutes >= startM + 15)).map((s) => (
                                <SelectItem key={`we-${s.value}`} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        Round-the-clock 15-minute slots. Room auto-releases when the slot ends.
                      </p>

                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                          Already booked for {wizardRoom.name}
                        </p>
                        {busyForRoom.length === 0 ? (
                          <p className="mt-1 rounded-xl bg-surface-muted p-2 text-xs font-semibold text-muted-foreground">
                            No bookings yet — fully available.
                          </p>
                        ) : (
                          <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto">
                            {busyForRoom.map((b) => (
                              <li
                                key={b.id}
                                className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-1.5 text-[11px] font-bold"
                              >
                                <span>{minutesToLabel(b.startMinutes)} – {minutesToLabel(b.endMinutes)}</span>
                                <span className="text-muted-foreground">{b.organizerName}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {startM !== null && endM !== null && overlapsBusy(startM, endM) && (
                        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[11px] font-extrabold text-destructive">
                          This room is already booked for the selected window. Pick a different slot.
                        </p>
                      )}

                      {myOwnConflict && (
                        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-[11px] font-extrabold text-destructive">
                          You already have a meeting at this time in {myOwnConflict.roomName} ({minutesToLabel(myOwnConflict.startMinutes)} – {minutesToLabel(myOwnConflict.endMinutes)}).
                        </p>
                      )}


                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="ghost"
                          onClick={() => setRoomWizard((p) => ({ ...p, open: false }))}
                        >
                          Cancel
                        </Button>
                        <Button onClick={goReview} disabled={!validWindow}>
                          Next: Review
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border bg-surface-muted p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Review your booking</p>
                        <dl className="mt-3 grid grid-cols-3 gap-y-2 text-sm">
                          <dt className="font-bold text-muted-foreground">Room</dt>
                          <dd className="col-span-2 font-extrabold">{wizardRoom.name} · {wizardRoom.id}</dd>
                          <dt className="font-bold text-muted-foreground">Floor</dt>
                          <dd className="col-span-2 font-extrabold">{wizardRoom.floor} · Seats {wizardRoom.capacity}</dd>
                          <dt className="font-bold text-muted-foreground">Date</dt>
                          <dd className="col-span-2 font-extrabold">{format(bookingDate, "EEE, MMM d, yyyy")}</dd>
                          <dt className="font-bold text-muted-foreground">Time</dt>
                          <dd className="col-span-2 font-extrabold">
                            {startM !== null && endM !== null
                              ? `${minutesToLabel(startM)} – ${minutesToLabel(endM)} (${endM - startM} min)`
                              : "—"}
                          </dd>
                          <dt className="font-bold text-muted-foreground">Title</dt>
                          <dd className="col-span-2 font-extrabold">
                            {roomWizard.title.trim() || `${wizardRoom.name} meeting`}
                          </dd>
                          <dt className="font-bold text-muted-foreground">Organizer</dt>
                          <dd className="col-span-2 font-extrabold">
                            {currentUser?.displayName ?? currentUser?.email ?? "—"}
                          </dd>
                        </dl>
                      </div>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        Once confirmed, this room is reserved for the selected window. It auto-releases when the slot ends.
                      </p>
                      <div className="flex justify-between gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setRoomWizard((p) => ({ ...p, step: "slot" }))}>
                          Back
                        </Button>
                        <Button onClick={confirmBooking} disabled={!validWindow}>
                          <CalendarCheck className="h-4 w-4" /> Confirm booking

                        </Button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    );
  };


  // ============== ATTENDANCE HELPERS & RENDER ==============
  const todayKey = format(new Date(nowTs), "yyyy-MM-dd");
  const myUserId = authUserId ?? currentUser?.email ?? "anon";
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

  // ---- Office location (per company, stored locally) ----
  const officeKey = companyProfile?.id ? `deskflow-office-loc-${companyProfile.id}` : null;
  const [officeLoc, setOfficeLoc] = useState<{ lat: number; lng: number; label?: string } | null>(() => {
    if (typeof window === "undefined" || !officeKey) return null;
    try { const raw = window.localStorage.getItem(officeKey); return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  useEffect(() => {
    if (!officeKey) return;
    try {
      const raw = window.localStorage.getItem(officeKey);
      setOfficeLoc(raw ? JSON.parse(raw) : null);
    } catch { setOfficeLoc(null); }
  }, [officeKey]);

  // ---- Geolocation permission + availability state ----
  type GeoStatus = "unknown" | "prompt" | "granted" | "denied" | "unsupported" | "unavailable";
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("unknown");

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }
    const anyNav = navigator as any;
    if (!anyNav.permissions?.query) {
      setGeoStatus("prompt");
      return;
    }
    let cancelled = false;
    let statusRef: any = null;
    anyNav.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status: any) => {
        if (cancelled) return;
        statusRef = status;
        setGeoStatus(status.state as GeoStatus);
        status.onchange = () => setGeoStatus(status.state as GeoStatus);
      })
      .catch(() => !cancelled && setGeoStatus("prompt"));
    return () => {
      cancelled = true;
      if (statusRef) statusRef.onchange = null;
    };
  }, []);

  const describeGeoError = (err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return "Location permission denied. Enable it in your browser settings and try again.";
      case err.POSITION_UNAVAILABLE:
        return "GPS is unavailable. Turn on location services on your device and try again.";
      case err.TIMEOUT:
        return "Couldn't get a GPS fix in time. Move to an open area and retry.";
      default:
        return err.message || "Unable to read your location.";
    }
  };

  const haversineM = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  const getCurrentGeo = (): Promise<GeoPoint | null> =>
    new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setGeoStatus("unsupported");
        toast.error("Geolocation not supported on this device");
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoStatus("granted");
          const point: GeoPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
          };
          if (officeLoc) point.distanceM = haversineM(officeLoc, point);
          resolve(point);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setGeoStatus("denied");
          else if (err.code === err.POSITION_UNAVAILABLE) setGeoStatus("unavailable");
          toast.error(describeGeoError(err));
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    });

  const requestLocationPermission = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported");
      toast.error("Geolocation not supported on this device");
      return;
    }
    toast.info("Requesting location permission…");
    navigator.geolocation.getCurrentPosition(
      () => {
        setGeoStatus("granted");
        toast.success("Location enabled");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoStatus("denied");
        else if (err.code === err.POSITION_UNAVAILABLE) setGeoStatus("unavailable");
        toast.error(describeGeoError(err));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleSetOffice = () => {
    if (!officeKey) { toast.error("Join a company first"); return; }
    if (!navigator.geolocation) { setGeoStatus("unsupported"); toast.error("Geolocation not supported"); return; }
    toast.info("Capturing office location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus("granted");
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        window.localStorage.setItem(officeKey, JSON.stringify(loc));
        setOfficeLoc(loc);
        toast.success("Office location saved");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoStatus("denied");
        else if (err.code === err.POSITION_UNAVAILABLE) setGeoStatus("unavailable");
        toast.error(describeGeoError(err));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };


  const handleSignIn = async (method: "manual" | "thumb" | "face" = "manual") => {
    if (myTodayRecord?.signInAt) {
      toast.error("You've already signed in today");
      return;
    }
    const geo = await getCurrentGeo();
    const id = window.crypto.randomUUID();
    const methodNote =
      method === "thumb" ? "Verified via thumb impression" :
      method === "face" ? "Verified via face recognition" : undefined;
    const newRec: AttendanceRecord = {
      id,
      userId: myUserId,
      userName: myName,
      date: todayKey,
      signInAt: Date.now(),
      signOutAt: null,
      signInGeo: geo ?? undefined,
      note: methodNote,
    };
    setAttendance((prev) => [newRec, ...prev.filter((r) => !(r.userId === myUserId && r.date === todayKey))]);
    const distMsg = geo?.distanceM != null ? ` · ${Math.round(geo.distanceM)}m from office` : geo ? " · location captured" : "";
    const methodMsg = method === "thumb" ? " · 👍 thumb" : method === "face" ? " · 😊 face" : "";
    toast.success(`Signed in at ${format(new Date(), "hh:mm a")}${distMsg}${methodMsg}`);
  };

  const handleSignOut = async () => {
    if (!myTodayRecord || !myTodayRecord.signInAt) {
      toast.error("Sign in first");
      return;
    }
    if (myTodayRecord.signOutAt) {
      toast.error("Already signed out today");
      return;
    }
    const geo = await getCurrentGeo();
    setAttendance((prev) =>
      prev.map((r) => (r.id === myTodayRecord.id ? { ...r, signOutAt: Date.now(), signOutGeo: geo ?? undefined } : r))
    );
    const distMsg = geo?.distanceM != null ? ` · ${Math.round(geo.distanceM)}m from office` : "";
    toast.success(`Signed out at ${format(new Date(), "hh:mm a")}${distMsg}`);
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
            onClick={() => handleSignIn("manual")}
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

        <BiometricCheckIn
          disabled={Boolean(myTodayRecord?.signInAt)}
          onVerified={(method) => handleSignIn(method)}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-background/50 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {officeLoc ? (
              <span>Office set · {officeLoc.lat.toFixed(5)}, {officeLoc.lng.toFixed(5)}</span>
            ) : (
              <span>Office location not set — distances won't be calculated</span>
            )}
          </div>
          <button
            onClick={handleSetOffice}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-foreground hover:bg-accent"
          >
            {officeLoc ? "Update office" : "Set office to here"}
          </button>
        </div>

        {/* Live GPS map */}
        <div className="mt-3">
          {geoStatus !== "granted" && (
            <div
              role="alert"
              className={`mb-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs ${
                geoStatus === "denied" || geoStatus === "unsupported" || geoStatus === "unavailable"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                {geoStatus === "unsupported" && "GPS isn't supported in this browser. Open the app on a phone or a Chromium-based browser."}
                {geoStatus === "denied" && "Location is blocked. Allow it in your browser/site settings, then retry."}
                {geoStatus === "unavailable" && "GPS is off or unavailable. Enable location services on your device and retry."}
                {(geoStatus === "prompt" || geoStatus === "unknown") && "Location access is needed to geo-tag your sign-in / sign-out."}
              </span>
              {geoStatus !== "unsupported" && (
                <button
                  onClick={requestLocationPermission}
                  className="rounded-full border border-current bg-background/60 px-3 py-1 text-[11px] font-bold hover:bg-background"
                >
                  Enable location
                </button>
              )}
            </div>
          )}
          <AttendanceMap

            office={officeLoc ?? null}
            signIn={myTodayRecord?.signInGeo ?? null}
            signOut={myTodayRecord?.signOutGeo ?? null}
            height={240}
          />
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600 align-middle" /> Office
            {" · "}
            <span className="inline-block h-2 w-2 rounded-full bg-green-600 align-middle" /> Sign-in
            {" · "}
            <span className="inline-block h-2 w-2 rounded-full bg-red-600 align-middle" /> Sign-out
          </p>
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
                  {(r.signInGeo || r.signOutGeo) && (
                    <div className="mt-2 space-y-1 rounded-xl bg-background/80 px-2 py-1.5 text-[11px] text-muted-foreground">
                      {r.signInGeo && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-primary" />
                          <span className="font-semibold text-foreground">In:</span>
                          <a
                            href={`https://maps.google.com/?q=${r.signInGeo.lat},${r.signInGeo.lng}`}
                            target="_blank" rel="noreferrer"
                            className="underline decoration-dotted"
                          >
                            {r.signInGeo.lat.toFixed(5)}, {r.signInGeo.lng.toFixed(5)}
                          </a>
                          {r.signInGeo.accuracyM != null && <span>· ±{Math.round(r.signInGeo.accuracyM)}m</span>}
                          {r.signInGeo.distanceM != null && (
                            <span className="font-bold text-primary">· {Math.round(r.signInGeo.distanceM)}m from office</span>
                          )}
                        </div>
                      )}
                      {r.signOutGeo && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-destructive" />
                          <span className="font-semibold text-foreground">Out:</span>
                          <a
                            href={`https://maps.google.com/?q=${r.signOutGeo.lat},${r.signOutGeo.lng}`}
                            target="_blank" rel="noreferrer"
                            className="underline decoration-dotted"
                          >
                            {r.signOutGeo.lat.toFixed(5)}, {r.signOutGeo.lng.toFixed(5)}
                          </a>
                          {r.signOutGeo.accuracyM != null && <span>· ±{Math.round(r.signOutGeo.accuracyM)}m</span>}
                          {r.signOutGeo.distanceM != null && (
                            <span className="font-bold text-primary">· {Math.round(r.signOutGeo.distanceM)}m from office</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {(r.signInGeo || r.signOutGeo) && (
                    <details className="mt-2 group">
                      <summary className="cursor-pointer text-[11px] font-semibold text-primary hover:underline list-none">
                        <span className="group-open:hidden">▸ Show map</span>
                        <span className="hidden group-open:inline">▾ Hide map</span>
                      </summary>
                      <div className="mt-2">
                        <AttendanceMap
                          office={officeLoc ?? null}
                          signIn={r.signInGeo ?? null}
                          signOut={r.signOutGeo ?? null}
                          height={180}
                        />
                      </div>
                    </details>
                  )}
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

  // Reporting-line awareness for two-stage leave approval
  const meEmployee = useMemo(
    () => employees.find((e) => (e.user_id && e.user_id === authUserId) || (e.email && currentUser?.email && e.email.toLowerCase() === currentUser.email.toLowerCase())) ?? null,
    [employees, authUserId, currentUser?.email],
  );
  const reportEmployeeUserIds = useMemo(() => {
    if (!meEmployee) return new Set<string>();
    return new Set(
      employees
        .filter((e) => e.manager_id === meEmployee.id && e.user_id)
        .map((e) => e.user_id as string),
    );
  }, [employees, meEmployee]);
  const isManagerOfAnyone = reportEmployeeUserIds.size > 0;

  const reviewLeave = (id: string, decision: "approved" | "rejected", role: "manager" | "hr") => {
    const target = leaves.find((l) => l.id === id);
    if (!target) return;
    // Hard guard: employees cannot approve/reject their own leave at any stage
    if (target.userId === myUserId) {
      toast.error("You cannot review your own leave request");
      return;
    }
    if (decision === "approved") {
      if (role === "manager") {
        if (target.status !== "pending") {
          toast.error("This request is no longer awaiting manager approval");
          return;
        }
        if (!reportEmployeeUserIds.has(target.userId)) {
          toast.error("Only the employee's reporting manager can approve this");
          return;
        }
        setLeaves((prev) =>
          prev.map((l) =>
            l.id === id
              ? { ...l, status: "manager_approved", reviewedBy: myName, reviewedAt: Date.now() }
              : l,
          ),
        );
        toast.success("Approved — forwarded to HR for final approval");
        return;
      }
      // HR stage
      if (!isAdmin) {
        toast.error("Only HR/Admin can grant final approval");
        return;
      }
      if (target.status !== "manager_approved") {
        toast.error("HR can approve only after the reporting manager approves");
        return;
      }
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, status: "approved", reviewedBy: myName, reviewedAt: Date.now() }
            : l,
        ),
      );
      toast.success("Leave approved by HR");
      return;
    }
    // Rejection — allowed by the relevant reviewer for the current stage
    if (role === "manager" && !reportEmployeeUserIds.has(target.userId)) {
      toast.error("Only the employee's reporting manager can reject at this stage");
      return;
    }
    if (role === "hr" && !isAdmin) {
      toast.error("Only HR/Admin can reject at this stage");
      return;
    }
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, status: "rejected", reviewedBy: myName, reviewedAt: Date.now() }
          : l,
      ),
    );
    toast.success("Leave rejected");
  };


  const cancelLeave = (id: string) => {
    setLeaves((prev) => prev.filter((l) => l.id !== id));
    toast.success("Leave request removed");
  };

  const managerQueue = leaves.filter(
    (l) => l.status === "pending" && reportEmployeeUserIds.has(l.userId) && l.userId !== myUserId,
  );
  const hrQueue = leaves.filter((l) => l.status === "manager_approved" && l.userId !== myUserId);
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
                            : l.status === "manager_approved"
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {l.status === "manager_approved" ? "Manager approved · awaiting HR" : l.status}
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

      {/* Manager queue: first-stage approval by reporting manager */}
      {isManagerOfAnyone && (
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-extrabold">Awaiting your approval (Manager)</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              Stage 1 of 2
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Approve to forward the request to HR. Employees cannot approve their own leaves.
          </p>
          {managerQueue.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No requests from your reports.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {managerQueue.map((l) => (
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
                      onClick={() => reviewLeave(l.id, "approved", "manager")}
                      className="focus-premium flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
                    >
                      Approve & forward to HR
                    </button>
                    <button
                      onClick={() => reviewLeave(l.id, "rejected", "manager")}
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
      )}

      {/* HR/Admin queue: final approval after manager sign-off */}
      {isAdmin && (
        <>
          <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold">HR final approval</h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">
                Stage 2 of 2
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              These have been approved by the reporting manager and are awaiting your final sign-off.
            </p>
            {hrQueue.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No requests awaiting HR approval.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {hrQueue.map((l) => (
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
                    {l.reviewedBy && (
                      <p className="mt-1 text-[10px] font-bold uppercase text-muted-foreground">
                        Manager approved by {l.reviewedBy}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => reviewLeave(l.id, "approved", "hr")}
                        className="focus-premium flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
                      >
                        Final approve
                      </button>
                      <button
                        onClick={() => reviewLeave(l.id, "rejected", "hr")}
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

  // ============== PAYROLL HANDLERS ==============
  const handlePayslipFileChange = async (file: File | null) => {
    if (!file) {
      setPayslipForm((prev) => ({ ...prev, fileName: "", fileType: "", fileDataUrl: "" }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Payslip file must be 2MB or smaller");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPayslipForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileDataUrl: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPayslip = (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !companyProfile || !currentUser) {
      toast.error("Admin access required");
      return;
    }
    const employee = employees.find((emp) => emp.id === payslipForm.employeeId);
    if (!employee) {
      toast.error("Select an employee");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(payslipForm.period)) {
      toast.error("Pay period must be in yyyy-MM format");
      return;
    }
    const gross = Number(payslipForm.grossAmount);
    const net = Number(payslipForm.netAmount);
    if (!Number.isFinite(gross) || gross < 0 || !Number.isFinite(net) || net < 0) {
      toast.error("Enter valid gross and net amounts");
      return;
    }

    const duplicate = payslips.some(
      (p) => p.employeeId === employee.id && p.period === payslipForm.period,
    );
    if (duplicate) {
      toast.error(`A payslip for ${employee.display_name} (${payslipForm.period}) already exists`);
      return;
    }

    const slip: Payslip = {
      id: window.crypto.randomUUID(),
      employeeId: employee.id,
      employeeName: employee.display_name,
      employeeEmail: employee.email,
      period: payslipForm.period,
      grossAmount: gross,
      netAmount: net,
      currency: payslipForm.currency.toUpperCase().slice(0, 4) || "USD",
      notes: payslipForm.notes.trim() || undefined,
      fileName: payslipForm.fileName || undefined,
      fileType: payslipForm.fileType || undefined,
      fileDataUrl: payslipForm.fileDataUrl || undefined,
      uploadedAt: Date.now(),
      uploadedBy: currentUser.displayName,
    };
    setPayslips((prev) => [slip, ...prev]);
    setPayslipForm({
      employeeId: "",
      period: format(new Date(), "yyyy-MM"),
      grossAmount: "",
      netAmount: "",
      currency: slip.currency,
      notes: "",
      fileName: "",
      fileType: "",
      fileDataUrl: "",
    });
    toast.success(`Payslip uploaded for ${employee.display_name}`);
  };

  const handleDeletePayslip = (id: string) => {
    if (!isAdmin) return;
    setPayslips((prev) => prev.filter((p) => p.id !== id));
    toast.success("Payslip removed");
  };

  const handleDownloadPayslip = (slip: Payslip) => {
    if (!slip.fileDataUrl) {
      toast.info("No file attached for this payslip");
      return;
    }
    const a = document.createElement("a");
    a.href = slip.fileDataUrl;
    a.download = slip.fileName || `payslip-${slip.period}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const myEmployeeId = useMemo(() => {
    const me = employees.find((emp) => emp.email && currentUser?.email && emp.email.toLowerCase() === currentUser.email.toLowerCase());
    return me?.id ?? null;
  }, [employees, currentUser?.email]);

  const myPayslips = useMemo(
    () => payslips.filter((p) => p.employeeId === myEmployeeId).sort((a, b) => b.period.localeCompare(a.period)),
    [payslips, myEmployeeId],
  );

  const renderPayrollPanel = () => {
    const sortedAll = [...payslips].sort((a, b) => b.uploadedAt - a.uploadedAt);
    return (
      <div className="space-y-5">
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payroll</p>
              <h2 className="font-display text-xl font-extrabold">My payslips</h2>
            </div>
          </div>
          {myPayslips.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm font-semibold text-muted-foreground">
              No payslips have been issued to you yet. Your admin will upload them here each pay period.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myPayslips.map((slip) => (
                <li key={slip.id} className="rounded-2xl border border-border bg-surface-muted p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-extrabold">{slip.period}</p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Net {slip.currency} {slip.netAmount.toLocaleString()} · Gross {slip.currency} {slip.grossAmount.toLocaleString()}
                      </p>
                      {slip.notes && <p className="mt-1 text-xs font-semibold text-muted-foreground">{slip.notes}</p>}
                    </div>
                    {slip.fileDataUrl && (
                      <button
                        onClick={() => handleDownloadPayslip(slip)}
                        className="focus-premium flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground"
                      >
                        <Download className="h-4 w-4" /> Download
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Issued {format(new Date(slip.uploadedAt), "MMM d, yyyy")} by {slip.uploadedBy}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isAdmin && (
          <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Admin · Upload payslip</p>
                <h2 className="font-display text-xl font-extrabold">Issue a payslip</h2>
              </div>
            </div>
            <form onSubmit={handleUploadPayslip} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Employee</label>
                <Select
                  value={payslipForm.employeeId}
                  onValueChange={(v) => setPayslipForm((prev) => ({ ...prev, employeeId: v }))}
                >
                  <SelectTrigger className="mt-1 rounded-2xl">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.display_name}{emp.email ? ` · ${emp.email}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Period</label>
                  <Input
                    type="month"
                    className="mt-1 rounded-2xl"
                    value={payslipForm.period}
                    onChange={(e) => setPayslipForm((prev) => ({ ...prev, period: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Currency</label>
                  <Input
                    className="mt-1 rounded-2xl"
                    value={payslipForm.currency}
                    onChange={(e) => setPayslipForm((prev) => ({ ...prev, currency: e.target.value }))}
                    maxLength={4}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Gross</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 rounded-2xl"
                    value={payslipForm.grossAmount}
                    onChange={(e) => setPayslipForm((prev) => ({ ...prev, grossAmount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Net</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 rounded-2xl"
                    value={payslipForm.netAmount}
                    onChange={(e) => setPayslipForm((prev) => ({ ...prev, netAmount: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes (optional)</label>
                <Input
                  className="mt-1 rounded-2xl"
                  value={payslipForm.notes}
                  onChange={(e) => setPayslipForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Bonuses, deductions, etc."
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payslip file (PDF/Image, ≤ 2MB)</label>
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  className="mt-1 rounded-2xl"
                  onChange={(e) => handlePayslipFileChange(e.target.files?.[0] ?? null)}
                />
                {payslipForm.fileName && (
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">Attached: {payslipForm.fileName}</p>
                )}
              </div>
              <button
                type="submit"
                className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow"
              >
                <UserPlus className="h-5 w-5" /> Upload payslip
              </button>
            </form>

            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">All issued payslips</p>
              {sortedAll.length === 0 ? (
                <p className="mt-2 rounded-2xl bg-surface-muted p-3 text-sm font-semibold text-muted-foreground">
                  No payslips issued yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {sortedAll.map((slip) => (
                    <li key={slip.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted p-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-extrabold">
                          {slip.employeeName} · {slip.period}
                        </p>
                        <p className="truncate text-xs font-semibold text-muted-foreground">
                          Net {slip.currency} {slip.netAmount.toLocaleString()} · Gross {slip.currency} {slip.grossAmount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {slip.fileDataUrl && (
                          <button
                            onClick={() => handleDownloadPayslip(slip)}
                            className="focus-premium grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePayslip(slip.id)}
                          className="focus-premium grid h-9 w-9 place-items-center rounded-xl bg-destructive/10 text-destructive"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============== BILLING HANDLERS ==============
  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Only admins can manage billing");
      return;
    }
    if (!currentUser) return;
    const plan = BILLING_PLANS.find((p) => p.id === billingForm.planId);
    if (!plan) return;
    const seats = Math.max(1, Math.floor(Number(billingForm.seats) || 0));
    if (seats < 1) {
      toast.error("Seats must be at least 1");
      return;
    }
    const amount = seats * plan.pricePerSeatPerMonth * plan.months;
    const now = Date.now();
    const periodMs = plan.months * 30 * 24 * 60 * 60 * 1000;
    // If currently active and renewing, extend from current expiry; otherwise start now
    const startBase = subscriptionActive && subscription ? subscription.expiresAt : now;
    const expiresAt = startBase + periodMs;
    const history = subscription?.history ?? [];
    const next: Subscription = {
      planId: plan.id,
      seats,
      startedAt: subscription?.startedAt ?? now,
      expiresAt,
      autoRenew: subscription?.autoRenew ?? false,
      lastPaymentAmount: amount,
      currency: "USD",
      activatedBy: currentUser.displayName,
      history: [
        ...history,
        {
          planId: plan.id,
          seats,
          amount,
          paidAt: now,
          periodStart: startBase,
          periodEnd: expiresAt,
        },
      ],
    };
    setSubscription(next);
    toast.success(
      subscriptionActive
        ? `Renewed: ${plan.label} · $${amount.toLocaleString()} (mock)`
        : `Subscribed: ${plan.label} · $${amount.toLocaleString()} (mock)`,
    );
  };

  const handleToggleAutoRenew = () => {
    if (!subscription) return;
    setSubscription({ ...subscription, autoRenew: !subscription.autoRenew });
  };

  const renderBillingPanel = () => {
    const plan = subscription ? BILLING_PLANS.find((p) => p.id === subscription.planId) : null;
    const previewSeats = Math.max(1, Math.floor(Number(billingForm.seats) || 0));
    const previewPlan = BILLING_PLANS.find((p) => p.id === billingForm.planId)!;
    const previewAmount = previewSeats * previewPlan.pricePerSeatPerMonth * previewPlan.months;
    const daysLeft = subscription
      ? Math.max(0, Math.ceil((subscription.expiresAt - nowTs) / (24 * 60 * 60 * 1000)))
      : 0;

    return (
      <div className="space-y-5">
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Subscription</p>
              <h2 className="font-display text-xl font-extrabold">
                {subscription
                  ? subscriptionExpired
                    ? "Subscription expired"
                    : `Active · ${plan?.label}`
                  : "No active subscription"}
              </h2>
            </div>
          </div>

          {subscription ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-surface-muted p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Seats</p>
                  <p className="font-display text-lg font-extrabold">{subscription.seats}</p>
                </div>
                <div className="rounded-2xl bg-surface-muted p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Last payment</p>
                  <p className="font-display text-lg font-extrabold">
                    {subscription.currency} {subscription.lastPaymentAmount.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-muted p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Started</p>
                  <p className="font-display text-sm font-extrabold">
                    {format(new Date(subscription.startedAt), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-muted p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Renewal date</p>
                  <p className="font-display text-sm font-extrabold">
                    {format(new Date(subscription.expiresAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div
                className={`rounded-2xl p-3 text-sm font-semibold ${
                  subscriptionExpired
                    ? "bg-destructive/10 text-destructive"
                    : daysLeft <= 7
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "bg-primary/10 text-primary"
                }`}
              >
                {subscriptionExpired
                  ? "Your subscription has expired. Renew to restore access for your team."
                  : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in current billing period.`}
              </div>
              {isAdmin && (
                <button
                  onClick={handleToggleAutoRenew}
                  className="focus-premium flex w-full items-center justify-between rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm font-extrabold"
                >
                  <span>Auto-renew</span>
                  <span className={subscription.autoRenew ? "text-primary" : "text-muted-foreground"}>
                    {subscription.autoRenew ? "ON" : "OFF"}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm font-semibold text-muted-foreground">
              Your company is on a free trial preview. An admin must subscribe to keep using Open Desk Flow.
            </p>
          )}
        </div>

        {isAdmin && (
          <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {subscriptionActive ? "Renew or change plan" : "Choose a plan"}
            </p>
            <h3 className="mt-1 font-display text-lg font-extrabold">$3 per employee per month</h3>

            <form onSubmit={handleSubscribe} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Number of seats</label>
                <Input
                  type="number"
                  min={1}
                  className="mt-1 rounded-2xl"
                  value={billingForm.seats}
                  onChange={(e) => setBillingForm((prev) => ({ ...prev, seats: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Billing cycle</label>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {BILLING_PLANS.map((p) => {
                    const total = previewSeats * p.pricePerSeatPerMonth * p.months;
                    const selected = billingForm.planId === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setBillingForm((prev) => ({ ...prev, planId: p.id }))}
                        className={`focus-premium flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-extrabold transition ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-surface-muted text-foreground"
                        }`}
                      >
                        <span>{p.label}</span>
                        <span>${total.toLocaleString()} <span className="text-xs font-semibold opacity-70">/ {p.months} mo</span></span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl bg-primary/5 p-3 text-sm font-semibold">
                Total today: <span className="font-display font-extrabold text-primary">${previewAmount.toLocaleString()} USD</span>
              </div>
              <button
                type="submit"
                className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow"
              >
                <CreditCard className="h-5 w-5" />
                {subscriptionActive ? "Renew subscription (mock)" : "Subscribe (mock)"}
              </button>
              <p className="text-[11px] font-semibold text-muted-foreground">
                This is a mock checkout — no real payment is processed.
              </p>
            </form>
          </div>
        )}

        {subscription && subscription.history.length > 0 && (
          <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment history</p>
            <ul className="mt-2 space-y-2">
              {[...subscription.history].reverse().map((h, idx) => {
                const hp = BILLING_PLANS.find((p) => p.id === h.planId);
                return (
                  <li key={idx} className="rounded-2xl border border-border bg-surface-muted p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-sm font-extrabold">
                        {hp?.label} · {h.seats} seats
                      </p>
                      <p className="font-display text-sm font-extrabold text-primary">
                        ${h.amount.toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                      {format(new Date(h.periodStart), "MMM d, yyyy")} → {format(new Date(h.periodEnd), "MMM d, yyyy")}
                      {" · paid "}{format(new Date(h.paidAt), "MMM d, yyyy")}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // ============== REPORTS / ANALYTICS ==============
  const renderReportsPanel = () => {
    if (!isAdmin) {
      return (
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <p className="text-sm font-semibold text-muted-foreground">
            Reports are available to admins only.
          </p>
        </div>
      );
    }

    const todayStr = format(new Date(), "yyyy-MM-dd");
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return format(d, "yyyy-MM-dd");
    });

    // Booking utilization
    const totalBookings = confirmedBookings.length;
    const activeBookings = confirmedBookings.filter((b) => !b.released).length;
    const todayBookings = confirmedBookings.filter((b) => b.date === todayStr).length;

    // Per-shift breakdown (all-time)
    const shiftCounts: Record<string, number> = {};
    confirmedBookings.forEach((b) => {
      shiftCounts[b.shift] = (shiftCounts[b.shift] ?? 0) + 1;
    });
    const shiftEntries = Object.entries(shiftCounts).sort((a, b) => b[1] - a[1]);
    const maxShift = Math.max(1, ...shiftEntries.map(([, n]) => n));

    // Per-floor breakdown
    const floorCounts: Record<string, number> = {};
    confirmedBookings.forEach((b) => {
      const k = `Floor ${b.floor}`;
      floorCounts[k] = (floorCounts[k] ?? 0) + 1;
    });
    const floorEntries = Object.entries(floorCounts).sort((a, b) => b[1] - a[1]);
    const maxFloor = Math.max(1, ...floorEntries.map(([, n]) => n));

    // ===== Desk occupancy analytics (last 14 days) =====
    const last14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return format(d, "yyyy-MM-dd");
    });
    const uniqueFloors = Array.from(new Set(confirmedBookings.map((b) => b.floor))).sort((a, b) => a - b);
    const floorPalette = ["bg-primary", "bg-primary/70", "bg-primary/50", "bg-primary/30", "bg-amber-500/70", "bg-emerald-500/70"];
    const occupancyByDate = last14.map((day) => {
      const perFloor: Record<number, number> = {};
      let total = 0;
      confirmedBookings.forEach((b) => {
        if (b.date === day) {
          perFloor[b.floor] = (perFloor[b.floor] ?? 0) + 1;
          total += 1;
        }
      });
      return { day, perFloor, total };
    });
    const maxDay = Math.max(1, ...occupancyByDate.map((d) => d.total));
    const peakDay = occupancyByDate.reduce((a, b) => (b.total > a.total ? b : a), occupancyByDate[0]);

    // Peak shift / hours
    const shiftPeak: Record<string, number> = {};
    confirmedBookings.forEach((b) => {
      const k = `${b.shift} (${b.shiftRange})`;
      shiftPeak[k] = (shiftPeak[k] ?? 0) + 1;
    });
    const peakShiftEntries = Object.entries(shiftPeak).sort((a, b) => b[1] - a[1]);
    const peakShift = peakShiftEntries[0];

    // Utilization per floor for last 14 days (assume each floor has ~20 desks/day capacity baseline)
    const FLOOR_CAPACITY = 20;
    const floorUtilization = uniqueFloors.map((f) => {
      const used = confirmedBookings.filter((b) => b.floor === f && last14.includes(b.date)).length;
      const capacity = FLOOR_CAPACITY * last14.length;
      const pct = Math.min(100, Math.round((used / capacity) * 100));
      return { floor: f, used, capacity, pct };
    });

    // Attendance trend (last 7 days)
    const attendanceByDay = last7.map((day) => {
      const recs = attendance.filter((r) => r.date === day);
      const present = recs.filter((r) => r.signInAt).length;
      const completed = recs.filter((r) => r.signInAt && r.signOutAt).length;
      return { day, present, completed };
    });
    const maxPresent = Math.max(1, ...attendanceByDay.map((d) => d.present));

    const totalEmployees = employees.length;
    const presentToday = attendance.filter((r) => r.date === todayStr && r.signInAt).length;
    const attendanceRate = totalEmployees > 0
      ? Math.round((presentToday / totalEmployees) * 100)
      : 0;

    // Average work hours (records that have both punches in last 7 days)
    const completedRecent = attendance.filter(
      (r) => last7.includes(r.date) && r.signInAt && r.signOutAt,
    );
    const avgHours = completedRecent.length > 0
      ? completedRecent.reduce((acc, r) => acc + ((r.signOutAt! - r.signInAt!) / 3_600_000), 0) /
        completedRecent.length
      : 0;

    // Leave overview
    const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
    const approvedLeaves = leaves.filter((l) => l.status === "approved").length;
    const rejectedLeaves = leaves.filter((l) => l.status === "rejected").length;

    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    const leaveDaysByType: Record<string, number> = { casual: 0, sick: 0, earned: 0, unpaid: 0 };
    leaves
      .filter((l) => l.status === "approved" && new Date(l.fromDate).getTime() >= yearStart)
      .forEach((l) => {
        leaveDaysByType[l.type] = (leaveDaysByType[l.type] ?? 0) + l.days;
      });

    // Payroll
    const totalPayslips = payslips.length;
    const monthCutoff = format(new Date(), "yyyy-MM");
    const paidThisMonth = payslips
      .filter((p) => p.period === monthCutoff)
      .reduce((acc, p) => acc + p.netAmount, 0);

    const StatCard = ({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) => (
      <div className="rounded-2xl bg-surface-muted p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-extrabold">{value}</p>
        {sub && <p className="text-[11px] font-semibold text-muted-foreground">{sub}</p>}
      </div>
    );

    return (
      <div className="space-y-5">
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Reports</p>
              <h2 className="font-display text-xl font-extrabold">{companyProfile?.name} overview</h2>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard label="Employees" value={totalEmployees} />
            <StatCard label="Present today" value={`${presentToday} / ${totalEmployees}`} sub={`${attendanceRate}% attendance`} />
            <StatCard label="Bookings today" value={todayBookings} sub={`${activeBookings} active now`} />
            <StatCard label="Avg work (7d)" value={`${avgHours.toFixed(1)} h`} sub={`${completedRecent.length} completed`} />
          </div>
        </div>

        {/* Attendance trend */}
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Attendance · last 7 days</p>
          <h3 className="mt-1 font-display text-lg font-extrabold">Daily sign-ins</h3>
          <div className="mt-4 flex h-32 items-end gap-2">
            {attendanceByDay.map((d) => {
              const h = (d.present / maxPresent) * 100;
              const isToday = d.day === todayStr;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t-lg ${isToday ? "bg-primary" : "bg-primary/40"}`}
                      style={{ height: `${Math.max(6, h)}%` }}
                      title={`${d.present} present`}
                    />
                  </div>
                  <p className="text-[10px] font-extrabold text-muted-foreground">
                    {format(new Date(d.day), "EEE")}
                  </p>
                  <p className="text-[10px] font-bold text-foreground">{d.present}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desk occupancy analytics */}
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Desk occupancy · last 14 days</p>
              <h3 className="mt-1 font-display text-lg font-extrabold">Trend by date & floor</h3>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-extrabold">
              {uniqueFloors.map((f, i) => (
                <span key={f} className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-1">
                  <span className={`h-2 w-2 rounded-full ${floorPalette[i % floorPalette.length]}`} />
                  Floor {f}
                </span>
              ))}
              {uniqueFloors.length === 0 && (
                <span className="text-muted-foreground">No floor data yet</span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatCard
              label="Peak day"
              value={peakDay && peakDay.total > 0 ? `${peakDay.total}` : "—"}
              sub={peakDay && peakDay.total > 0 ? format(new Date(peakDay.day), "EEE, MMM d") : "No bookings"}
            />
            <StatCard
              label="Peak shift"
              value={peakShift ? `${peakShift[1]}` : "—"}
              sub={peakShift ? peakShift[0] : "No data"}
            />
            <StatCard
              label="Avg / day"
              value={`${(occupancyByDate.reduce((a, b) => a + b.total, 0) / 14).toFixed(1)}`}
              sub="bookings / day (14d)"
            />
          </div>

          <div className="mt-4 flex h-40 items-end gap-1.5">
            {occupancyByDate.map((d) => {
              const isToday = d.day === todayStr;
              return (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 flex-col-reverse overflow-hidden rounded-t-md bg-surface-muted/40">
                    {uniqueFloors.map((f, i) => {
                      const n = d.perFloor[f] ?? 0;
                      if (n === 0) return null;
                      const h = (n / maxDay) * 100;
                      return (
                        <div
                          key={f}
                          className={`${floorPalette[i % floorPalette.length]} w-full`}
                          style={{ height: `${h}%` }}
                          title={`Floor ${f}: ${n}`}
                        />
                      );
                    })}
                  </div>
                  <p className={`text-[9px] font-extrabold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {format(new Date(d.day), "d/M")}
                  </p>
                </div>
              );
            })}
          </div>

          {floorUtilization.length > 0 && (
            <>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Utilization by floor (14d)</p>
              <ul className="mt-2 space-y-2">
                {floorUtilization.map((u, i) => (
                  <li key={u.floor}>
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span>Floor {u.floor}</span>
                      <span className="text-muted-foreground">
                        {u.used} / {u.capacity} · {u.pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className={`h-full rounded-full ${floorPalette[i % floorPalette.length]}`}
                        style={{ width: `${u.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] font-semibold text-muted-foreground">
                Capacity assumes {FLOOR_CAPACITY} desks/floor/day baseline.
              </p>
            </>
          )}

          {peakShiftEntries.length > 0 && (
            <>
              <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Peak hours by shift</p>
              <ul className="mt-2 space-y-2">
                {peakShiftEntries.map(([label, n], i) => {
                  const max = peakShiftEntries[0][1];
                  return (
                    <li key={label}>
                      <div className="flex items-center justify-between text-xs font-extrabold">
                        <span>{label}</span>
                        <span className="text-muted-foreground">{n}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className={`h-full rounded-full ${i === 0 ? "bg-primary" : "bg-primary/60"}`}
                          style={{ width: `${(n / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Booking utilization */}
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Booking utilization</p>
          <h3 className="mt-1 font-display text-lg font-extrabold">{totalBookings} total bookings</h3>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">By shift</p>
          {shiftEntries.length === 0 ? (
            <p className="mt-2 rounded-2xl bg-surface-muted p-3 text-sm font-semibold text-muted-foreground">
              No bookings recorded yet.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {shiftEntries.map(([shift, n]) => (
                <li key={shift}>
                  <div className="flex items-center justify-between text-xs font-extrabold">
                    <span>{shift}</span>
                    <span className="text-muted-foreground">{n}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(n / maxShift) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {floorEntries.length > 0 && (
            <>
              <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">By floor</p>
              <ul className="mt-2 space-y-2">
                {floorEntries.map(([floor, n]) => (
                  <li key={floor}>
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span>{floor}</span>
                      <span className="text-muted-foreground">{n}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${(n / maxFloor) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Leave overview */}
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Leave overview</p>
              <h3 className="font-display text-lg font-extrabold">This year</h3>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatCard label="Pending" value={pendingLeaves} />
            <StatCard label="Approved" value={approvedLeaves} />
            <StatCard label="Rejected" value={rejectedLeaves} />
          </div>
          <ul className="mt-4 space-y-2">
            {(["casual", "sick", "earned", "unpaid"] as const).map((t) => (
              <li key={t} className="flex items-center justify-between rounded-2xl border border-border bg-surface-muted px-3 py-2 text-xs font-extrabold">
                <span className="capitalize">{t} leave</span>
                <span className="text-muted-foreground">
                  {leaveDaysByType[t] ?? 0} day{(leaveDaysByType[t] ?? 0) === 1 ? "" : "s"} approved
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Payroll snapshot */}
        <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payroll snapshot</p>
              <h3 className="font-display text-lg font-extrabold">{format(new Date(), "MMMM yyyy")}</h3>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard label="Payslips issued" value={totalPayslips} />
            <StatCard label="Net paid this month" value={`$${paidThisMonth.toLocaleString()}`} />
          </div>
        </div>
      </div>
    );
  };

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
              <label
                htmlFor="profile-avatar-input"
                className="group relative grid h-14 w-14 cursor-pointer place-items-center overflow-hidden rounded-full bg-primary text-primary-foreground shadow-glow ring-2 ring-primary/30"
                aria-label="Change profile photo"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="Your profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-xl font-extrabold">{initials || "E"}</span>
                )}
                <span className="absolute inset-x-0 bottom-0 grid place-items-center bg-foreground/55 py-0.5 text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-3.5 w-3.5" />
                </span>
                <input
                  id="profile-avatar-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarFile(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Welcome back</p>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <h2 className="min-w-0 max-w-full truncate font-display text-lg font-extrabold sm:text-xl">
                    {currentUser?.displayName}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileNameDraft(currentUser?.displayName ?? "");
                      setEditingProfile(true);
                    }}
                    className="focus-premium grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground hover:text-primary"
                    aria-label="Edit display name"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
                {companyProfile && (
                  <p className="truncate text-xs font-bold text-muted-foreground">{companyProfile.name}</p>
                )}
                <p className="truncate text-[11px] font-semibold text-muted-foreground sm:text-xs">{currentUser?.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary">
                    Employee
                  </span>
                  {isAdmin && (
                    <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-success-foreground shadow-glow ring-2 ring-success/40">
                      Admin
                    </span>
                  )}
                  {userAvatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="focus-premium rounded-full bg-muted px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground hover:text-destructive"
                    >
                      Remove photo
                    </button>
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

        {/* Timezone */}
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-extrabold">Your timezone</h3>
            {userTimezone && !editingTimezone && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-extrabold uppercase text-success">
                <Lock className="h-3 w-3" /> Saved
              </span>
            )}
          </div>
          {userTimezone && !editingTimezone ? (
            <div className="rounded-2xl bg-background p-3">
              <p className="text-xs font-semibold text-muted-foreground">Committed timezone</p>
              <p className="font-display text-base font-extrabold">{userTimezone}</p>
              <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                Your bookings, attendance and shift cutoffs use this timezone.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDraftTimezone(userTimezone);
                  setEditingTimezone(true);
                }}
                className="focus-premium mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5 text-xs font-extrabold text-primary"
              >
                <Pencil className="h-3.5 w-3.5" /> Change timezone
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                {userTimezone ? "Pick a new timezone — this affects your future bookings and attendance." : "Pick your timezone."}
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
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => (userTimezone ? handleChangeTimezone(draftTimezone) : handleCommitTimezone())}
                  className="focus-premium flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-glow"
                >
                  <Lock className="h-4 w-4" /> {userTimezone ? "Save timezone" : "Commit timezone"}
                </button>
                {userTimezone && (
                  <button
                    type="button"
                    onClick={() => setEditingTimezone(false)}
                    className="focus-premium rounded-2xl border border-border bg-background px-4 py-3 text-sm font-extrabold text-muted-foreground"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <EmployeeWorkInfoCard
          meEmployeeId={myEmployeeId}
          meUserId={authUserId}
          companyId={companyProfile?.id ?? null}
        />

        <ManagerHierarchy
          meId={myEmployeeId}
          employees={employees as HierarchyEmployee[]}
          maxLevels={5}
        />

        {/* Appraisals shortcut (visible to all employees) */}
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-extrabold">Appraisals</h3>
          </div>
          <p className="text-xs font-semibold leading-5 text-muted-foreground">
            View your performance reviews, fill out self-assessments, and track manager feedback across review cycles.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab("appraisal")}
            className="focus-premium mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-glow"
          >
            <ClipboardList className="h-4 w-4" /> Open my appraisals
          </button>
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("directory")}
                className="focus-premium text-xs font-extrabold text-primary"
              >
                Directory
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("book")}
                className="focus-premium text-xs font-extrabold text-primary"
              >
                New booking
              </button>
            </div>
          </div>
          {(() => {
            const recentBookings = [...confirmedBookings]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5);
            return recentBookings.length === 0 ? (
            <p className="rounded-2xl bg-background p-4 text-center text-xs font-semibold text-muted-foreground">
              No bookings yet. Tap Book to reserve a desk or meeting room.
            </p>
          ) : (
            <div className="space-y-2">
              {recentBookings.map((booking) => {
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
          );
          })()}
        </div>

        {/* Settings */}
        <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-extrabold">Settings</h3>
          </div>
          <div className="mb-3 rounded-2xl bg-background p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Profile photo</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-primary/30">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-base font-extrabold text-muted-foreground">
                    {(currentUser?.displayName || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <label className="focus-premium inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-primary px-3 py-2 text-xs font-extrabold text-primary-foreground shadow-glow">
                {uploadingPhoto ? "Uploading..." : profilePhotoUrl ? "Change photo" : "Upload photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingPhoto}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleProfilePhotoUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="mt-2 text-[10px] font-semibold text-muted-foreground">JPG/PNG up to 5 MB.</p>
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

  // Login-only view: full screen responsive layout (mobile, tablet, desktop)
  if (!isAuthenticated) {
    return (
      <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-hero-field" />
        <div className="pointer-events-none absolute -top-40 -left-40 -z-10 h-[520px] w-[520px] rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 -z-10 h-[520px] w-[520px] rounded-full bg-secondary/15 blur-3xl" />

        <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-10 lg:py-12">
          {/* Left: brand / marketing column (desktop + tablet) */}
          <aside className="hidden flex-col justify-between rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-secondary/10 p-8 shadow-card lg:flex xl:p-12">
            <div>
              <img
                src={hrgreatlyLogo}
                alt="HR Greatly"
                className="h-20 w-auto object-contain xl:h-24"
              />
              <h2 className="mt-8 font-display text-4xl font-extrabold leading-tight tracking-tight text-foreground xl:text-5xl">
                Welcome back to{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  HR Greatly
                </span>
              </h2>
              <p className="mt-4 max-w-md text-base text-muted-foreground xl:text-lg">
                Run your entire HR — attendance, leave, payroll — from one calm place.
                Sign in and pick up where you left off.
              </p>
            </div>
            <ul className="mt-10 grid gap-3 text-sm font-medium text-foreground/80">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Secure, role-based access</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 25+ countries · 20,000+ teams</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 15-day free trial — no card required</li>
            </ul>
          </aside>

          {/* Right: auth form (all sizes) */}
          <section className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-card sm:max-w-lg sm:p-8 md:max-w-xl md:p-10">
              <div className="flex flex-col items-center gap-3 text-center lg:hidden">
                <img
                  src={hrgreatlyLogo}
                  alt="HR Greatly"
                  className="h-16 w-auto object-contain sm:h-20"
                />
              </div>
              <div className="mt-2 text-center">
                <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  Sign in to your workspace
                </h1>
                <p className="mt-1 text-sm font-medium text-muted-foreground">hrgreatly.com</p>
              </div>
              <div className="mt-6 space-y-5">
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
    <main className="min-h-screen bg-hero-field text-foreground">
      {/* Top app bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-primary text-primary-foreground shadow-card">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="focus-premium grid h-10 w-10 place-items-center rounded-xl hover:bg-primary-foreground/10"
              aria-label="Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <img src={hrgreatlyLogo} alt="HR Greatly" className="h-9 w-auto object-contain sm:h-11" />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate font-display text-sm font-extrabold sm:text-base">
                {companyProfile?.name ?? "Workspace"}
              </p>
              <p className="truncate text-[11px] font-semibold opacity-80">
                Hi, {currentUser?.displayName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-10 w-10 place-items-center overflow-hidden rounded-xl bg-primary-foreground/15 sm:grid">
              {userAvatar ? (
                <img src={userAvatar} alt="Your profile" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowNotifications(true);
                markAllAnnouncementsRead();
              }}
              className="focus-premium relative grid h-10 w-10 place-items-center rounded-xl hover:bg-primary-foreground/10"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadAnnouncementCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-destructive px-1 text-[10px] font-extrabold text-destructive-foreground">
                  {unreadAnnouncementCount > 9 ? "9+" : unreadAnnouncementCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Primary navigation — horizontal, scrollable on small screens */}
        <nav className="mx-auto w-full max-w-7xl overflow-x-auto px-2 pb-2 sm:px-4 lg:px-6">
          <div className="flex w-max min-w-full items-center gap-1">
            {bottomTabs.filter((t) => t.id !== "admin" || isAdmin).map((tab) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.id)}
                className={`focus-premium flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-extrabold transition-colors sm:text-sm ${
                  activeTab === tab.id
                    ? "bg-primary-foreground text-primary shadow-card"
                    : "text-primary-foreground/80 hover:bg-primary-foreground/10"
                }`}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Content area — fluid, full width up to a comfortable max */}
      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {subscriptionExpired && activeTab !== "billing" ? (
          <div className="rounded-[1.5rem] border-2 border-destructive bg-destructive/5 p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-destructive/15 text-destructive">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-destructive">Access blocked</p>
                <h2 className="font-display text-xl font-extrabold">Subscription expired</h2>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">
              {isAdmin
                ? "Your company's subscription has lapsed. Renew now to restore access for your whole team."
                : "Your company's subscription has lapsed. Please ask your admin to renew to restore access."}
            </p>
            {isAdmin && (
              <button
                onClick={() => setActiveTab("billing")}
                className="focus-premium mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow sm:w-auto"
              >
                <CreditCard className="h-5 w-5" /> Go to billing
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-12">
            <section className="space-y-5 lg:col-span-12">
              {activeTab === "home" && renderHomeScreen()}
              {isAdmin && activeTab === "admin" && companyProfile && (
                <AdminConsole
                  companyId={companyProfile.id}
                  uploaderName={currentUser?.displayName ?? "Admin"}
                  meUserId={authUserId}
                  meEmployeeId={myEmployeeId}
                  renderDashboard={renderAdminPanel}
                  renderReports={renderReportsPanel}
                  renderBilling={renderBillingPanel}
                />
              )}
              {activeTab === "team" && renderTeamPanel()}
              {activeTab === "attendance" && renderAttendancePanel()}
              {activeTab === "leave" && renderLeavePanel()}
              {activeTab === "payroll" && renderPayrollPanel()}
              {activeTab === "documents" && (
                <DocumentsPanel
                  meEmployeeId={myEmployeeId}
                  meUserId={authUserId}
                  companyId={companyProfile?.id ?? null}
                />
              )}
              {activeTab === "training" && (
                <TrainingPanel
                  companyId={companyProfile?.id ?? null}
                  meUserId={authUserId}
                  meName={currentUser?.displayName ?? null}
                  canManage={!!isAdmin}
                />
              )}
              {activeTab === "appraisal" && (
                <AppraisalPanel
                  companyId={companyProfile?.id ?? null}
                  meUserId={authUserId}
                  meEmployeeId={myEmployeeId}
                  meName={currentUser?.displayName ?? null}
                  isAdmin={!!isAdmin}
                />
              )}
              {activeTab === "assistant" && (
                <AssistantPanel userName={currentUser?.displayName ?? null} />
              )}
              {activeTab === "billing" && renderBillingPanel()}
              {isAdmin && activeTab === "reports" && renderReportsPanel()}
              {activeTab === "book" && renderBookingPanel()}
              {activeTab === "map" && renderMapPanel()}
              {activeTab === "rooms" && renderRoomsPanel()}
              {activeTab === "directory" && renderDirectoryPanel()}
            </section>
          </div>
        )}
      </div>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Notifications
            </DialogTitle>
            <DialogDescription>
              Company-wide announcements from your admin team.
            </DialogDescription>
          </DialogHeader>
          {sortedAnnouncements.length === 0 ? (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm font-semibold text-muted-foreground">
              No announcements yet. When your admin posts company news, it appears here.
            </p>
          ) : (
            <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {sortedAnnouncements.map((a) => {
                const tone =
                  a.priority === "urgent"
                    ? "border-destructive/40 bg-destructive/5"
                    : a.priority === "important"
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border bg-surface-muted";
                const badgeTone =
                  a.priority === "urgent"
                    ? "bg-destructive text-destructive-foreground"
                    : a.priority === "important"
                      ? "bg-amber-500 text-white"
                      : "bg-primary/10 text-primary";
                return (
                  <li key={a.id} className={`rounded-2xl border p-3 ${tone}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-sm font-extrabold">{a.title}</p>
                        <p className="mt-1 whitespace-pre-wrap text-xs font-semibold text-muted-foreground">
                          {a.body}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${badgeTone}`}>
                        {a.priority}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                      <span>By {a.authorName} · {format(new Date(a.createdAt), "MMM d, yyyy h:mm a")}</span>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteAnnouncement(a.id)}
                          className="focus-premium grid h-7 w-7 place-items-center rounded-lg bg-destructive/10 text-destructive"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit display name
            </DialogTitle>
            <DialogDescription>
              This is the name your teammates see on bookings, attendance and announcements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Display name
            </label>
            <input
              type="text"
              value={profileNameDraft}
              onChange={(e) => setProfileNameDraft(e.target.value)}
              maxLength={48}
              className="focus-premium h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm font-extrabold"
              placeholder="e.g. Alex Chen"
              autoFocus
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="focus-premium flex-1 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-extrabold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDisplayName}
                className="focus-premium flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-glow"
              >
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Index;
