import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../../services/api";

type Appointment = { id: string; time: string; service: string; providerName: string; status: string };
type AppointmentResponse = { success: boolean; upcoming: Appointment[]; past: Appointment[] };
type Filter = "Upcoming" | "Past" | "All";

function appointmentDate(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}
function appointmentTime(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", hour: "numeric", minute: "2-digit" }).format(new Date(value)) + " SAST";
}

export default function Appointments() {
  const [data, setData] = useState<AppointmentResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("Upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch<AppointmentResponse>("/customer/appointments")
      .then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Appointments could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const appointments = useMemo(() => {
    const upcoming = data?.upcoming ?? [];
    const past = data?.past ?? [];
    return filter === "Upcoming" ? upcoming : filter === "Past" ? past : [...upcoming, ...past];
  }, [data, filter]);

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-sky-700">YOUR SCHEDULE</p><h1 className="mt-2 text-3xl font-bold tracking-tight">My appointments</h1><p className="mt-2 text-sm text-slate-500">Review your upcoming and past visits.</p></div><Link to="/dashboard/customer/book" className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">＋ Find a service</Link></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6"><div className="flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Filter appointments">{(["Upcoming", "Past", "All"] as Filter[]).map((item) => <button key={item} role="tab" aria-selected={filter === item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${filter === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{item}</button>)}</div><p className="text-sm text-slate-500">{loading ? "Loading…" : `${appointments.length} ${appointments.length === 1 ? "appointment" : "appointments"}`}</p></div>
      {error && <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load appointments: {error}</div>}
      {loading ? <div className="space-y-3 p-5">{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div> : appointments.length ? <div className="divide-y divide-slate-100">{appointments.map((appointment) => <Link key={appointment.id} to={`/dashboard/customer/appointments/${encodeURIComponent(appointment.id)}`} className="flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700">▦</span><div><p className="font-semibold">{appointment.service}</p><p className="mt-1 text-sm text-slate-500">with {appointment.providerName}</p><p className="mt-1 text-sm text-slate-500 sm:hidden">{appointmentDate(appointment.time)} · {appointmentTime(appointment.time)}</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><div className="hidden text-right sm:block"><p className="text-sm font-medium">{appointmentDate(appointment.time)}</p><p className="mt-1 text-sm text-slate-500">{appointmentTime(appointment.time)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${appointment.status === "CONFIRMED" || appointment.status === "RESCHEDULED" ? "bg-emerald-50 text-emerald-700" : appointment.status === "CANCELLED" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{appointment.status.toLowerCase().replaceAll("_", " ")}</span></div></Link>)}</div> : <div className="px-6 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl text-slate-500">▦</span><h2 className="mt-4 font-semibold">No {filter.toLowerCase()} appointments</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Your appointments will appear here when they are available.</p>{filter !== "Past" && <Link to="/dashboard/customer/book" className="mt-5 inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">Explore services</Link>}</div>}
    </section>
  </div>;
}
