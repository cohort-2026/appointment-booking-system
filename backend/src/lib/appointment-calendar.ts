import { createHash } from "node:crypto";

export function appointmentCalendarUid(appointmentId: string): string {
  const digest = createHash("sha256").update(appointmentId).digest("base64url");
  return `${digest}@itthynkappoint`;
}

/** A small .ics attachment that can be imported into a calendar app. */
export function appointmentCalendar(input: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  service: string;
  provider: string;
  sequence?: number;
  cancelled?: boolean;
}): string {
  const escapeText = (text: string) => text.replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const cancelled = input.cancelled === true;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ITThynkAppoint//Appointments//EN",
    `METHOD:${cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${appointmentCalendarUid(input.id)}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(input.startsAt)}`,
    `DTEND:${stamp(input.endsAt)}`,
    `SEQUENCE:${input.sequence ?? 0}`,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    `SUMMARY:${escapeText(`${input.service} - ${input.provider}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
