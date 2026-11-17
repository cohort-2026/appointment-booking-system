import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { apiFetch } from "../../../services/api";

type Appointment = { id: string; time: string; service: string; providerName: string; status: string };
type AppointmentResponse = { success: boolean; upcoming: Appointment[]; past: Appointment[] };

export default function AppointmentDetails() {
  const { id } = useParams();
  const location = useLocation();
  const isConfirmedBooking = new URLSearchParams(location.search).get("confirmed") === "1";
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch<AppointmentResponse>("/customer/appointments")
      .then((result) => {
        if (!active) return;
        const all = [...(result.upcoming ?? []), ...(result.past ?? [])];
        setAppointment(all.find((item) => item.id === id) ?? null);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Appointment details could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const backLink = <Link to="/dashboard/customer/appointments" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900">← Back to appointments</Link>;
  if (loading) return <div className="space-y-5">{backLink}<div className="h-64 animate-pulse rounded-2xl bg-white" /></div>;

  return <div className="space-y-6">{backLink}{error || !appointment ? <section className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl text-slate-500">▦</span><h1 className="mt-4 text-xl font-bold">Appointment not found</h1><p className="mt-2 text-sm text-slate-500">{error ?? "This appointment may no longer be available."}</p></section> : <>
    {isConfirmedBooking && <section role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="font-bold text-emerald-900">Appointment confirmed</p><p className="mt-1 text-sm text-emerald-800">Your appointment has been saved to your account. Confirmation reference: <span className="font-semibold">{appointment.id}</span></p></section>}
    <div><p className="text-sm font-semibold text-sky-700">APPOINTMENT DETAILS</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{appointment.service}</h1><p className="mt-2 text-sm text-slate-500">Your visit with {appointment.providerName}</p></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-slate-500">Appointment status</p><span className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{appointment.status.toLowerCase().replaceAll("_", " ")}</span></div><span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl text-sky-700 shadow-sm">▦</span></div><div className="grid gap-6 p-6 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Date</p><p className="mt-2 font-semibold">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(appointment.time))}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Time</p><p className="mt-2 font-semibold">{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(appointment.time))}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Service provider</p><p className="mt-2 font-semibold">{appointment.providerName}</p></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Service</p><p className="mt-2 font-semibold">{appointment.service}</p></div></div></section>
    <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">To cancel or reschedule, please contact the provider directly. Those actions are not connected to the customer API yet.</p>
  </>}</div>;
}
