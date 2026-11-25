import type { SavedAppointment } from "../services/bookings";

export function downloadAppointmentCalendar(
  a: Pick<SavedAppointment, "time" | "endsAt" | "durationMinutes" | "service" | "providerName"> & { address?: string | null },
  calendarUid: string,
) {
  const escape = (v: string) => v.replaceAll("\\", "\\\\").replaceAll("\r", "").replaceAll("\n", "\\n").replaceAll(",", "\\,").replaceAll(";", "\\;");
  const stamp = (v: string) => new Date(v).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const end = a.endsAt ?? new Date(Date.parse(a.time) + a.durationMinutes * 60_000).toISOString();
  const text = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ITThynkAppoint//Booking//EN", "BEGIN:VEVENT",
    `UID:${escape(calendarUid)}`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(a.time)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(a.service + " — " + a.providerName)}`, `LOCATION:${escape(a.address ?? "")}`, "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = "appointment.ics"; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
