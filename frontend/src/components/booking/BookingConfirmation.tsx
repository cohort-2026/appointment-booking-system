import { Link } from "react-router-dom";
import { CalendarDays, Check, CircleX, Clock3, MapPin, UserRound } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import type { SavedAppointment } from "../../services/bookings";
import { formatSast } from "../../lib/bookingTime";
import { Button } from "../ui/button";

function calendarFile(a: SavedAppointment) {
  const escape = (v: string) => v.replaceAll("\\", "\\\\").replaceAll("\r", "").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
  const stamp = (v: string) => new Date(v).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const end = a.endsAt ?? new Date(Date.parse(a.time) + a.durationMinutes * 60_000).toISOString();
  const text = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ITThynkAppoint//Booking//EN", "BEGIN:VEVENT",
    `UID:${escape(a.id)}@itthynkappoint`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(a.time)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(a.service + " — " + a.providerName)}`, `LOCATION:${escape(a.address ?? "")}`, "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `appointment-${a.id}.ics`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function BookingConfirmation({ appointment: a, justBooked }: { appointment: SavedAppointment; justBooked: boolean }) {
  const active = ["CONFIRMED", "RESCHEDULED"].includes(a.status);
  const { user } = useAuth();
  const details = [
    { label: "When", value: formatSast(a.time), icon: Clock3 },
    { label: "With", value: a.staffName ?? "Independent provider", icon: UserRound },
    { label: "Where", value: a.address ?? "Contact your provider for the location", icon: MapPin },
    { label: "Price", value: a.price === null ? "Price on request" : `R${Number(a.price).toFixed(2)}`, icon: null },
  ];
  return <div className="space-y-6">
    <section role={justBooked && active ? "status" : undefined} className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <header className="text-center">
        <span className={`mx-auto grid size-11 place-items-center rounded-full ${a.status === "CANCELLED" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>{a.status === "CANCELLED" ? <CircleX className="size-6" /> : <Check className="size-6 stroke-[3]" />}</span>
        <h1 className="mt-3 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">{justBooked && active ? "Appointment confirmed" : a.status === "CANCELLED" ? "Appointment cancelled" : "Appointment details"}</h1>
        <p className="mt-1 text-xs leading-5 text-slate-500">{justBooked && active ? `You’re booked, ${user?.firstName ?? "there"}. Your booking is saved. Here are the details for your appointment.` : "Your appointment information and booking reference."}</p>
      </header>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
        <div className="flex items-start justify-between gap-3 bg-slate-50 px-4 py-3">
          <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{a.service}</p><p className="mt-0.5 truncate text-xs text-slate-500">{a.providerName}</p></div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${active ? "bg-sky-50 text-sky-700" : a.status === "CANCELLED" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{a.status.toLowerCase().replaceAll("_", " ")}</span>
        </div>
        <dl className="grid gap-x-5 gap-y-4 p-4 sm:grid-cols-2">{details.map(({ label, value, icon: Icon }) => <div key={label} className="flex min-w-0 gap-2.5">{Icon && <Icon className="mt-0.5 size-3.5 shrink-0 text-slate-400" />}<div className="min-w-0"><dt className="text-[10px] text-slate-500">{label}</dt><dd className="mt-0.5 break-words text-xs font-semibold text-slate-900">{value}</dd></div></div>)}
          <div className="flex min-w-0 gap-2.5"><CalendarDays className="mt-0.5 size-3.5 shrink-0 text-slate-400"/><div><dt className="text-[10px] text-slate-500">Duration</dt><dd className="mt-0.5 text-xs font-semibold text-slate-900">{a.durationMinutes} minutes</dd></div></div>
          <div className="min-w-0 sm:col-span-2"><dt className="text-[10px] text-slate-500">Reference</dt><dd className="mt-0.5 break-all text-xs font-semibold text-slate-900">{a.id}</dd></div>
          {a.customerNotes && <div className="min-w-0 sm:col-span-2"><dt className="text-[10px] text-slate-500">Your notes</dt><dd className="mt-0.5 break-words text-xs text-slate-700">{a.customerNotes}</dd></div>}
        </dl>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button asChild size="sm"><Link to="/dashboard/customer/appointments">My appointments</Link></Button>
        {active && <Button size="sm" variant="outline" onClick={() => calendarFile(a)}><CalendarDays className="mr-1.5" />Add to calendar</Button>}
        <Button asChild size="sm" variant="outline"><Link to="/dashboard/customer/book">Book another</Link></Button>
      </div>
    </section>
    {active && <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Before your appointment</h2><p className="mt-2 text-sm leading-6 text-slate-600">Online changes may be available until {formatSast(a.changeDeadline)} ({a.cancellationCutoffHours} hours before your appointment).{a.phone ? ` Contact your provider on ${a.phone} if you need help.` : " Contact your provider if you need help."}</p></section>}
  </div>;
}
