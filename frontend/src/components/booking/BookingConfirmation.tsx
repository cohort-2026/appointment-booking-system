import { Link } from "react-router-dom";
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
  return <div className="space-y-6">
    {justBooked && a.status === "CONFIRMED" && <section role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><h1 className="text-2xl font-bold">Appointment confirmed</h1><p className="mt-2">Your booking is saved. Keep this page for your appointment details.</p></section>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="bg-slate-950 p-6 text-white"><p className="text-sm font-semibold text-sky-300">{a.status.replaceAll("_", " ")}</p><h2 className="mt-2 text-2xl font-bold">{a.service}</h2><p className="mt-2 text-slate-300">{a.providerName}</p></header>
      <dl className="grid gap-6 p-6 sm:grid-cols-2">{[
        ["Date and time", formatSast(a.time)], ["Duration", `${a.durationMinutes} minutes`],
        ["Service price", a.price === null ? "Price on request" : `R${Number(a.price).toFixed(2)}`],
        ["Staff", a.staffName ?? "Independent provider"], ["Location", a.address ?? "Contact your provider for the location"],
        ["Reference", a.id], ["Your notes", a.customerNotes || "No notes added"],
      ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-2 break-words font-medium">{value}</dd></div>)}</dl>
    </section>
    <div className="flex flex-wrap gap-3">{active && <Button onClick={() => calendarFile(a)}>Add to calendar</Button>}
      <Link className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold" to="/dashboard/customer/appointments">My appointments</Link>
      <Link className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold" to="/dashboard/customer/book">Find another service</Link></div>
  </div>;
}
