import {
  ArrowLeft,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  KeyRound,
  Mail,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
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

type AppMode = "create" | "join";

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
const bottomTabs = [
  { icon: CalendarCheck, label: "Book" },
  { icon: MapPin, label: "Map" },
  { icon: BarChart3, label: "Admin" },
  { icon: Users, label: "Team" },
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

const Index = () => {
  const [mode, setMode] = useState<AppMode>("create");
  const [form, setForm] = useState<CompanyForm>({
    companyName: "",
    orgCode: "",
    displayName: "",
    email: "",
  });
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [desks, setDesks] = useState(initialDesks);
  const [selectedDeskId, setSelectedDeskId] = useState("A1");
  const [selectedSlot, setSelectedSlot] = useState("Morning");
  const [isLoadingDesks, setIsLoadingDesks] = useState(true);
  const [isBookingDesk, setIsBookingDesk] = useState(false);
  const [bookingText, setBookingText] = useState("No active booking yet");
  const [clientSessionId] = useState(getClientSessionId);

  const selectedDesk = useMemo(() => desks.find((desk) => desk.id === selectedDeskId), [desks, selectedDeskId]);
  const availableCount = desks.filter((desk) => desk.status === "available").length;

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
      toast.error("Sign in required", { description: "Use Google sign-in before creating or joining a company profile." });
      return;
    }

    if (form.displayName.trim().length < 2 || form.orgCode.length < 3) {
      toast.error("Complete the required fields", { description: "Name and organization code are required." });
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
        toast.error(mode === "create" ? "Company could not be created" : "Company could not be joined", { description: error.message });
        return;
      }

      toast.success(mode === "create" ? "Company profile created" : "Company joined", {
        description: `${data?.name ?? "Workspace"} is ready for Android desk booking.`,
      });
    } finally {
      setIsSubmittingCompany(false);
    }
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
              <div className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
                <div className="grid grid-cols-2 rounded-2xl bg-muted p-1">
                  {(["create", "join"] as AppMode[]).map((item) => (
                    <button
                      key={item}
                      onClick={() => setMode(item)}
                      className={`focus-premium rounded-xl py-2 text-sm font-extrabold transition-all ${
                        mode === item ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
                      }`}
                    >
                      {item === "create" ? "Create company" : "Join company"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGoogleLogin}
                  className="focus-premium mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 font-extrabold shadow-card transition-transform hover:-translate-y-0.5"
                >
                  <Mail className="h-5 w-5 text-primary" /> Continue with Google
                </button>

                <form onSubmit={handleCompanySubmit} className="mt-4 space-y-3">
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
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your name</span>
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
                      placeholder="you@company.com"
                      className="focus-premium mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground placeholder:text-muted-foreground"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isSubmittingCompany}
                    className="focus-premium flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                  >
                    <UserPlus className="h-5 w-5" /> {isSubmittingCompany ? "Saving..." : mode === "create" ? "Create profile" : "Join workspace"}
                  </button>
                </form>
              </div>

              <div id="booking" className="rounded-[1.5rem] bg-surface-raised p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-primary">London HQ · Floor 4</p>
                    <h2 className="font-display text-2xl font-extrabold">Book a desk</h2>
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
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Selected booking</p>
                  <p className="font-display text-xl font-extrabold">Desk {selectedDesk?.id ?? "—"} · {selectedSlot}</p>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">{bookingText}</p>
                  <button
                    onClick={handleCreateBooking}
                    disabled={!selectedDesk || selectedDesk.status === "occupied" || isBookingDesk}
                    className="focus-premium mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-extrabold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                  >
                    <CalendarCheck className="h-5 w-5" /> {isBookingDesk ? "Booking..." : "Book desk"}
                  </button>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 grid grid-cols-4 border-t border-border bg-surface-raised px-3 py-2">
              {bottomTabs.map((tab, index) => (
                <button key={tab.label} className={`focus-premium flex flex-col items-center gap-1 rounded-2xl py-2 text-xs font-extrabold ${index === 0 ? "text-primary" : "text-muted-foreground"}`}>
                  <tab.icon className="h-5 w-5" /> {tab.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6 py-4 lg:py-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface-glass px-4 py-2 text-sm font-bold text-primary shadow-card backdrop-blur">
            <Smartphone className="h-4 w-4" /> Android-first multi-company SaaS
          </div>
          <div>
            <h2 className="font-display text-5xl font-extrabold leading-tight tracking-normal lg:text-7xl">Open Desk Flow helps teams book desks on Android.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Companies can create their own profile, employees can join with an Organization ID, and bookings remain connected to the live backend.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { icon: Building2, title: "Company profile", text: "Each organization can register a workspace and unique Organization ID." },
              { icon: KeyRound, title: "Google login", text: "Managed Google sign-in is enabled for company admins and employees." },
              { icon: ShieldCheck, title: "Role table", text: "Roles are stored separately from profiles to avoid privilege escalation." },
              { icon: QrCode, title: "QR-ready flow", text: "The Android shell keeps desk booking ready for physical check-in steps." },
              { icon: Clock3, title: "Real-time sync", text: "Desk occupancy updates persist and sync across devices." },
              { icon: CheckCircle2, title: "Admin-ready", text: "The data model supports admins, employees, and future company dashboards." },
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