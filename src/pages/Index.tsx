import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Filter,
  KeyRound,
  MapPin,
  MonitorUp,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const initialDesks = [
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

const metrics = [
  { label: "Utilization", value: "72%", tone: "primary" },
  { label: "Ghost bookings", value: "4.8%", tone: "accent" },
  { label: "Active tenants", value: "128", tone: "secondary" },
];

const features = [
  { icon: KeyRound, title: "Tenant-aware login", text: "Organization ID, corporate email routing, and SSO-ready entry for every company." },
  { icon: MapPin, title: "Interactive floor mapping", text: "Admins pin desks, rooms, quiet zones, and capacity rules onto each uploaded floor plan." },
  { icon: QrCode, title: "QR check-in control", text: "Employees confirm presence at the desk and unclaimed bookings auto-release." },
];

const Index = () => {
  const [desks, setDesks] = useState(initialDesks);
  const [selectedDeskId, setSelectedDeskId] = useState("A1");
  const [selectedSlot, setSelectedSlot] = useState("Morning");
  const [booking, setBooking] = useState<{ deskId: string; slot: string; label: string } | null>(null);

  const selectedDesk = useMemo(() => desks.find((desk) => desk.id === selectedDeskId), [desks, selectedDeskId]);

  const handleDeskSelect = (deskId: string) => {
    const desk = desks.find((item) => item.id === deskId);
    if (!desk) return;

    setSelectedDeskId(deskId);
    if (desk.status === "occupied") {
      toast.error(`Desk ${desk.id} is already occupied`, {
        description: "Choose a green desk or change your filters.",
      });
    }
  };

  const handleCreateBooking = () => {
    if (!selectedDesk) return;

    if (selectedDesk.status === "occupied") {
      toast.error(`Desk ${selectedDesk.id} cannot be booked`, {
        description: "This desk is currently occupied for the selected slot.",
      });
      return;
    }

    setDesks((currentDesks) =>
      currentDesks.map((desk) =>
        desk.id === selectedDesk.id ? { ...desk, status: "occupied" } : desk,
      ),
    );
    setBooking({ deskId: selectedDesk.id, slot: selectedSlot, label: selectedDesk.label });
    toast.success(`Desk ${selectedDesk.id} booked`, {
      description: `${selectedSlot} slot confirmed. QR check-in reminder scheduled.`,
    });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-hero-field text-foreground">
      <section className="relative px-4 py-5 sm:px-6 lg:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-lg border border-border/70 bg-surface-glass px-4 py-3 shadow-card backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-action-glow text-primary-foreground shadow-glow">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg font-extrabold leading-none">DeskFlow</p>
              <p className="text-xs font-medium text-muted-foreground">Hot desking SaaS</p>
            </div>
          </div>
          <div className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#booking">Employee app</a>
            <a className="transition-colors hover:text-foreground" href="#admin">Admin console</a>
            <a className="transition-colors hover:text-foreground" href="#security">Security</a>
          </div>
          <button className="focus-premium inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">
            Open demo <ChevronRight className="h-4 w-4" />
          </button>
        </nav>

        <div className="mx-auto grid max-w-7xl gap-8 py-10 lg:grid-cols-[0.94fr_1.06fr] lg:items-center lg:py-14">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface-glass px-3 py-1 text-sm font-bold text-primary shadow-card backdrop-blur">
              <ShieldCheck className="h-4 w-4" /> Multi-tenant workspace booking
            </div>
            <h1 className="font-display text-5xl font-extrabold leading-tight tracking-normal sm:text-6xl lg:text-7xl">
              DeskFlow for flexible offices.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              A polished first-version prototype for employees to reserve desks and admins to manage capacity, floor maps, reminders, and occupancy KPIs.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button className="focus-premium inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">
                <Smartphone className="h-5 w-5" /> Preview Android flow
              </button>
              <button className="focus-premium inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface-raised px-6 py-3 font-bold text-foreground shadow-card transition-transform hover:-translate-y-0.5">
                <BarChart3 className="h-5 w-5" /> View admin KPIs
              </button>
            </div>
          </div>

          <div id="booking" className="relative mx-auto w-full max-w-2xl animate-float-desk rounded-lg border border-border/80 bg-panel-sheen p-3 shadow-soft backdrop-blur-xl">
            <div className="rounded-md border border-border bg-surface-raised p-4 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-primary">London HQ · Floor 4</p>
                  <h2 className="font-display text-2xl font-extrabold">Choose your desk</h2>
                </div>
                <div className="rounded-md bg-muted px-3 py-2 text-right">
                  <p className="text-xs font-semibold text-muted-foreground">Today</p>
                  <p className="text-sm font-extrabold">{selectedSlot} slot</p>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-3 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`focus-premium rounded-md border px-3 py-2 text-sm font-extrabold transition-all hover:-translate-y-0.5 ${
                      selectedSlot === slot
                        ? "border-primary bg-primary text-primary-foreground shadow-glow"
                        : "border-border bg-surface text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <div className="mb-4 grid grid-cols-[1fr_auto] gap-3">
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-muted-foreground">
                  <Search className="h-4 w-4" />
                  <span className="text-sm font-medium">Search dual monitor or colleague</span>
                </div>
                <button className="focus-premium rounded-md border border-border bg-surface px-3 text-muted-foreground transition-colors hover:text-foreground" aria-label="Filter desks">
                  <Filter className="h-5 w-5" />
                </button>
              </div>
              <div className="desk-grid relative h-[420px] overflow-hidden rounded-lg border border-border bg-surface">
                <div className="absolute left-[68%] top-[12%] h-24 w-24 rounded-md border border-border bg-surface-raised/80" />
                <div className="absolute bottom-[10%] right-[9%] h-28 w-36 rounded-md border border-dashed border-primary/45 bg-primary/5" />
                <div className="absolute left-0 top-0 h-20 w-full animate-scan-line bg-gradient-to-b from-primary/0 via-primary/20 to-primary/0" />
                {desks.map((desk) => (
                  <button
                    key={desk.id}
                    onClick={() => handleDeskSelect(desk.id)}
                    className={`focus-premium absolute -translate-x-1/2 -translate-y-1/2 rounded-md border px-3 py-2 text-left shadow-card transition-transform hover:scale-105 ${
                      desk.status === "available"
                        ? selectedDeskId === desk.id
                          ? "border-primary bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "border-success/40 bg-success text-success-foreground"
                        : selectedDeskId === desk.id
                          ? "border-occupied bg-occupied text-occupied-foreground ring-4 ring-occupied/20"
                          : "border-occupied/40 bg-occupied text-occupied-foreground"
                    }`}
                    style={{ left: desk.x, top: desk.y }}
                  >
                    <span className="block text-sm font-extrabold">{desk.id}</span>
                    <span className="block text-[11px] font-semibold opacity-90">{desk.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-sm font-bold text-muted-foreground">Selected booking</p>
                  <p className="font-display text-xl font-extrabold">
                    Desk {selectedDesk?.id ?? "—"} · {selectedSlot}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {booking
                      ? `Confirmed: ${booking.slot} at desk ${booking.deskId} (${booking.label}).`
                      : selectedDesk?.status === "available"
                        ? "Available now. Booking will mark this desk occupied."
                        : "Occupied desks cannot be booked for this slot."}
                  </p>
                </div>
                <button
                  onClick={handleCreateBooking}
                  disabled={!selectedDesk || selectedDesk.status === "occupied"}
                  className="focus-premium inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:hover:translate-y-0"
                >
                  <CalendarCheck className="h-5 w-5" /> Book desk
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="admin" className="bg-background/70 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-lg border border-border bg-surface-raised p-6 shadow-card">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Admin dashboard</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold">Capacity, tenants, and occupancy in one command center.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-md border border-border bg-surface p-4">
                  <p className="text-sm font-semibold text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 font-display text-3xl font-extrabold">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-lg border border-border bg-panel-sheen p-5 shadow-card transition-transform hover:-translate-y-1">
                <feature.icon className="mb-4 h-8 w-8 text-primary" />
                <h3 className="font-display text-xl font-extrabold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
              </article>
            ))}
            <article id="security" className="rounded-lg border border-primary/25 bg-primary p-5 text-primary-foreground shadow-glow sm:col-span-2">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-display text-2xl font-extrabold">Logical data separation for every tenant.</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 opacity-90">Designed around company-scoped data, encrypted transit, audit-friendly check-ins, and role-specific access for super admins, company admins, and employees.</p>
                </div>
                <CheckCircle2 className="h-12 w-12 shrink-0" />
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {[
            { icon: CalendarCheck, title: "Next booking", text: "Desk B3 · 9:00–13:00" },
            { icon: Bell, title: "Reminder", text: "Check in 15 minutes early" },
            { icon: Clock3, title: "Auto-release", text: "Unclaimed after 30 minutes" },
            { icon: Users, title: "Colleague proximity", text: "Find desks near your team" },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-border bg-surface-glass p-5 shadow-card backdrop-blur">
              <item.icon className="h-7 w-7 text-secondary" />
              <h3 className="mt-4 font-display text-lg font-extrabold">{item.title}</h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Index;