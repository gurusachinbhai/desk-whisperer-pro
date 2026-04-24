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

type AppMode = "create" | "login";
type ActiveTab = "home" | "book" | "map" | "admin" | "team";

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
  const [mode, setMode] = useState<AppMode>("create");
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [form, setForm] = useState<CompanyForm>({
    companyName: "",
    orgCode: "",
    displayName: "",
    email: "",
  });
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
        _display_name: form.displayName || null,
        _email: form.email || null,
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

  const updateForm = (field: keyof CompanyForm, value: string) => {
    setForm((current) => ({
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

  const handleCompanySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error("Employer sign-in required", { description: "Use Google sign-in before creating or opening an HR admin workspace." });
      return;
    }

    if (form.displayName.trim().length < 2 || form.orgCode.length < 3 || (mode === "create" && form.companyName.trim().length < 2)) {
      toast.error("Complete employer signup", { description: "Company, Organization ID, and HR admin name are required." });
      return;
    }

    setIsSubmittingCompany(true);
    try {
      const rpcCall = mode === "create"
        ? supabase.rpc("register_company_profile", {
            _company_name: form.companyName,
            _organization_code: form.orgCode,
            _display_name: form.displayName,
            _email: form.email || null,
            _domain: form.email.includes("@") ? form.email.split("@")[1] : null,
          })
        : supabase.rpc("join_company_profile", {
            _organization_code: form.orgCode,
            _display_name: form.displayName,
            _email: form.email || null,
          });

      const { data, error } = await rpcCall;
      if (error) {
        toast.error(mode === "create" ? "Company could not be created" : "Company login failed", { description: error.message });
        return;
      }

      if (data) {
        setCompanyProfile({ id: data.id, name: data.name, organization_code: data.organization_code });
        setIsAdmin(mode === "create");
        setActiveTab(mode === "create" ? "admin" : "book");
        if (mode === "create") await loadInvites(data.id);
      }

      toast.success(mode === "create" ? "Employer admin created" : "Workspace opened", {
        description: mode === "create" ? "You can now create employee logins and send invite links." : "You can now book desks.",
      });
    } finally {
      setIsSubmittingCompany(false);
    }
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

  const renderEmployerLogin = () => (
    <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">First screen</p>
          <h2 className="font-display text-xl font-extrabold">Employer login & signup</h2>
        </div>
      </div>

      <form onSubmit={handleCompanySubmit} className="space-y-3">
        <div className="grid grid-cols-2 rounded-2xl bg-muted p-1">
          {(["create", "login"] as AppMode[]).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setMode(item)}
              className={`focus-premium rounded-xl py-2 text-sm font-extrabold transition-all ${
                mode === item ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
              }`}
            >
              {item === "create" ? "Signup" : "Login"}
            </button>
          ))}
        </div>

        {mode === "create" && (
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Company name</span>
            <input
              value={form.companyName}
              onChange={(event) => updateForm("companyName", event.target.value)}
              placeholder="Acme Workspace"
              className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
            />
          </label>
        )}

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Organization ID</span>
          <input
            value={form.orgCode}
            onChange={(event) => updateForm("orgCode", event.target.value)}
            placeholder="ACME-HQ"
            className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
          />
        </label>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 font-extrabold shadow-card transition-transform hover:-translate-y-0.5"
        >
          <Mail className="h-5 w-5 text-primary" /> Continue with Google
        </button>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">HR admin name</span>
          <input
            value={form.displayName}
            onChange={(event) => updateForm("displayName", event.target.value)}
            placeholder="Priya Sharma"
            className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Work email</span>
          <input
            value={form.email}
            onChange={(event) => updateForm("email", event.target.value)}
            placeholder="hr@company.com"
            className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmittingCompany}
          className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          <ShieldCheck className="h-5 w-5" /> {isSubmittingCompany ? "Opening..." : mode === "create" ? "Create HR admin" : "Open employer account"}
        </button>
      </form>
    </div>
  );

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

  const renderBookingPanel = () => (
    <div id="booking" className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-primary">Book screen · London HQ</p>
          <h2 className="font-display text-2xl font-extrabold">Choose your desk</h2>
        </div>
        <div className="rounded-2xl bg-success px-3 py-2 text-center text-success-foreground">
          <p className="text-2xl font-extrabold">{availableCount}</p>
          <p className="text-[10px] font-bold uppercase">free</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {timeSlots.map((slot) => (
          <button
            key={slot}
            onClick={() => setSelectedSlot(slot)}
            className={`focus-premium rounded-2xl px-2 py-2 text-xs font-extrabold transition-all ${
              selectedSlot === slot ? "bg-primary text-primary-foreground shadow-glow" : "bg-muted text-muted-foreground"
            }`}
          >
            {slot}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-muted-foreground">
        <Search className="h-4 w-4" />
        <span className="text-sm font-semibold">Search features or colleague</span>
      </div>

      <div className="desk-grid relative mt-4 h-[300px] overflow-hidden rounded-[1.4rem] border border-border bg-surface">
        {isLoadingDesks && <div className="absolute inset-0 grid place-items-center text-sm font-bold text-muted-foreground">Syncing live map...</div>}
        {desks.map((desk) => (
          <button
            key={desk.id}
            onClick={() => handleDeskSelect(desk.id)}
            className={`focus-premium absolute -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-3 py-2 text-left shadow-card transition-transform hover:scale-105 ${
              desk.status === "available"
                ? selectedDeskId === desk.id
                  ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "border-success/40 bg-success text-success-foreground"
                : "border-occupied/40 bg-occupied text-occupied-foreground"
            }`}
            style={{ left: desk.x, top: desk.y }}
          >
            <span className="block text-sm font-extrabold">{desk.id}</span>
            <span className="block text-[10px] font-bold opacity-90">{desk.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-background p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ready to book</p>
        <p className="font-display text-xl font-extrabold">Desk {selectedDesk?.id ?? "—"} · {selectedSlot}</p>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Select an available desk, choose a time, then confirm your booking.</p>
        <p className="mt-2 text-sm font-semibold text-primary">{bookingText}</p>
        <button
          onClick={handleCreateBooking}
          disabled={!selectedDesk || selectedDesk.status === "occupied" || isBookingDesk}
          className="focus-premium mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          <CalendarCheck className="h-5 w-5" /> {isBookingDesk ? "Booking..." : "Confirm desk booking"}
        </button>
      </div>
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
      ) : renderEmployerLogin()}
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
              {inviteToken && renderTeamPanel()}
              {shouldShowEmployerFirst && renderHomeScreen()}
              {companyProfile && activeTab === "home" && renderHomeScreen()}
              {companyProfile && isAdmin && activeTab === "admin" && renderAdminPanel()}
              {companyProfile && activeTab === "team" && renderTeamPanel()}
              {companyProfile && (activeTab === "book" || activeTab === "map") && renderBookingPanel()}
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
