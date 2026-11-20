import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowRight, CalendarDays, Check, Clock3, RotateCcw, X } from "lucide-react";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";

type Appointment = {
  id: string; time: string; service: string; providerName: string;
  staffName: string | null; staffTitle: string | null; durationMinutes: number; price: string | null; status: string;
};
type DashboardResponse = {
  success: boolean;
  stats: { upcomingAppointments: number; todayAppointments: number; completedAppointments: number; cancelledAppointments: number };
  upcomingAppointments: Appointment[];
};

const formatTime = (value: string) => new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
const providerInitials = (value: string) => value.split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "P";

function downloadCalendar(appointment: Appointment) {
  const escape = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("\r", "").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
  const stamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const end = new Date(Date.parse(appointment.time) + appointment.durationMinutes * 60_000).toISOString();
  const event = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ITThynkAppoint//Booking//EN", "BEGIN:VEVENT",
    `UID:${escape(appointment.id)}@itthynkappoint`, `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(appointment.time)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(`${appointment.service} — ${appointment.providerName}`)}`,
    "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
  const url = URL.createObjectURL(new Blob([event], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `appointment-${appointment.id}.ics`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<DashboardResponse>("/customer/dashboard")
      .then(summary => { if (active) setDashboard(summary); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Dashboard information could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const upcoming = dashboard?.upcomingAppointments ?? [];
  const next = upcoming[0];
  const stats = dashboard?.stats;
  const statCards = [
    { label: "Upcoming", value: stats?.upcomingAppointments, note: "appointments", icon: CalendarDays, color: "bg-sky-50 text-sky-700" },
    { label: "Today", value: stats?.todayAppointments, note: "appointments", icon: Clock3, color: "bg-cyan-50 text-cyan-700" },
    { label: "Completed", value: stats?.completedAppointments, note: "appointments", icon: Check, color: "bg-emerald-50 text-emerald-700" },
    { label: "Cancelled", value: stats?.cancelledAppointments, note: "appointments", icon: X, color: "bg-slate-100 text-slate-600" },
  ];
  const dayCount = next ? Math.max(0, Math.ceil((Date.parse(next.time) - Date.now()) / 86_400_000)) : null;
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "C";

  return <div className="space-y-5 sm:space-y-6">
    <div className="flex items-center justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Your account</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Welcome back{user?.firstName ? `, ${user.firstName}` : ""}</h1></div>
      <Link to="/dashboard/customer/profile" className="flex items-center gap-2 rounded-full bg-white p-1.5 pr-3 shadow-sm ring-1 ring-slate-200"><Avatar className="size-8"><AvatarFallback className="bg-sky-100 text-[10px] font-bold text-sky-800">{initials}</AvatarFallback></Avatar><span className="hidden text-right sm:block"><span className="block text-xs font-semibold text-slate-900">{user?.firstName} {user?.lastName}</span><span className="block max-w-36 truncate text-[10px] text-slate-500">{user?.email}</span></span></Link>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

    {next && <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#071827] via-[#09243a] to-[#064b5c] p-5 text-white shadow-sm sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-24 size-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <Badge className="border-0 bg-white/10 text-[10px] uppercase tracking-wider text-cyan-200"><span className="mr-1.5 size-1.5 rounded-full bg-cyan-300"/>Your next appointment{dayCount === 0 ? " · today" : ` · in ${dayCount} ${dayCount === 1 ? "day" : "days"}`}</Badge>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short", day: "numeric", month: "short" }).format(new Date(next.time))} · {formatTime(next.time)}</h2>
          <p className="mt-2 truncate text-sm text-slate-300">{next.service} · {next.providerName}{next.staffName ? `, ${next.staffName}` : ""}{next.price ? ` · R${next.price}` : ""}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm"><Link to={`/dashboard/customer/appointments/${encodeURIComponent(next.id)}`}><RotateCcw className="mr-1.5"/>Reschedule</Link></Button>
            <Button asChild size="sm" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10"><Link to={`/dashboard/customer/appointments/${encodeURIComponent(next.id)}`}>Cancel / manage</Link></Button>
            <Button size="sm" variant="outline" onClick={() => downloadCalendar(next)} className="border-white/20 bg-white/5 text-white hover:bg-white/10"><ArrowDownToLine className="mr-1.5"/>Add to calendar</Button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:min-w-48"><span className="grid size-14 place-items-center rounded-xl bg-cyan-400 text-slate-950"><span className="text-center"><span className="block text-[10px] font-bold uppercase">{new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", month: "short" }).format(new Date(next.time))}</span><span className="block text-xl font-extrabold leading-5">{new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", day: "2-digit" }).format(new Date(next.time))}</span></span></span><div><p className="text-[10px] text-slate-400">Appointment time</p><p className="text-sm font-semibold">{formatTime(next.time)} SAST</p><Link to={`/dashboard/customer/appointments/${encodeURIComponent(next.id)}`} className="mt-1 inline-flex items-center text-[10px] text-cyan-200 hover:text-white">View details <ArrowRight className="ml-1 size-3"/></Link></div></div>
      </div>
    </section>}

    <section aria-label="Appointment summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{statCards.map(({ label, value, note, icon: Icon, color }) => <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div><p className="text-xs font-medium text-slate-500">{label} appointments</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{loading ? <span className="inline-block h-7 w-8 animate-pulse rounded bg-slate-100"/> : value ?? 0}</p></div><span className={`grid size-9 place-items-center rounded-xl ${color}`}><Icon className="size-4"/></span><span className="sr-only">{note}</span></div>)}</section>

    <section>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="text-base font-bold text-slate-950">Upcoming appointments</h2><p className="mt-1 text-xs text-slate-500">Your next scheduled visits.</p></div><Link to="/dashboard/customer/appointments" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900">View all <ArrowRight className="size-3.5"/></Link></header>
        {loading ? <div className="space-y-3 p-5">{[0, 1, 2].map(item => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100"/>)}</div> : upcoming.length ? <div className="divide-y divide-slate-100">{upcoming.slice(0, 4).map(item => <Link key={item.id} to={`/dashboard/customer/appointments/${encodeURIComponent(item.id)}`} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 sm:px-5"><span className="grid size-10 shrink-0 content-center rounded-lg border border-slate-200 bg-white text-center"><span className="text-[9px] font-bold uppercase text-sky-700">{new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", month: "short" }).format(new Date(item.time))}</span><span className="text-sm font-bold leading-4">{new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", day: "2-digit" }).format(new Date(item.time))}</span></span><Avatar className="size-8 shrink-0"><AvatarFallback className="bg-sky-50 text-[10px] font-bold text-sky-800">{providerInitials(item.providerName)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-900">{item.service} · {item.providerName}</p><p className="mt-1 truncate text-[10px] text-slate-500">{formatTime(item.time)}–{formatTime(new Date(Date.parse(item.time) + item.durationMinutes * 60_000).toISOString())}{item.staffName ? ` · ${item.staffName}` : ""}{item.price ? ` · R${item.price}` : ""}</p></div><Badge variant="outline" className={`hidden border text-[9px] capitalize sm:inline-flex ${item.status === "RESCHEDULED" ? "border-violet-200 bg-violet-50 text-violet-700" : "border-sky-200 bg-sky-50 text-sky-700"}`}>{item.status.toLowerCase()}</Badge><ArrowRight className="size-4 shrink-0 text-slate-400"/></Link>)}</div> : <div className="px-5 py-9 text-center"><CalendarDays className="mx-auto size-8 text-slate-300"/><p className="mt-2 text-sm font-semibold text-slate-800">No upcoming appointments</p><p className="mt-1 text-xs text-slate-500">Once you book a visit, it will appear here.</p><Button asChild size="sm" className="mt-3"><Link to="/dashboard/customer/book">Book a service</Link></Button></div>}
      </div>
    </section>
  </div>;
}
