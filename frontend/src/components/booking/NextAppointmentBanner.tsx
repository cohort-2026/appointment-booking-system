import { ArrowDownToLine, ArrowRight, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import type { Appointment } from "../appointment/AppointmentCard";
import { Button } from "../ui/button";
import { BOOKING_TIME_ZONE, sastDate } from "../../lib/bookingTime";
import { downloadAppointmentCalendar } from "../../lib/downloadAppointmentCalendar";

export type UpcomingAppointment = Appointment & {
  endsAt: string | null;
  calendarUid?: string;
  canReschedule: boolean;
};

const dateFormat = new Intl.DateTimeFormat("en-ZA", {
  timeZone: BOOKING_TIME_ZONE, weekday: "short", day: "numeric", month: "short",
});
const monthFormat = new Intl.DateTimeFormat("en-ZA", { timeZone: BOOKING_TIME_ZONE, month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-ZA", {
  timeZone: BOOKING_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function NextAppointmentBanner({ appointment }: { appointment: UpcomingAppointment }) {
  const start = new Date(appointment.time);
  const time = timeFormat.format(start);
  const daysAway = Math.max(0, (Date.parse(sastDate(start)) - Date.parse(sastDate())) / 86_400_000);
  const countdown = daysAway === 0 ? "Today" : `In ${daysAway} ${daysAway === 1 ? "day" : "days"}`;
  const detailsPath = `/dashboard/customer/appointments/${encodeURIComponent(appointment.id)}`;
  const { calendarUid } = appointment;
  const outline = "border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white";

  return (
    <section aria-labelledby="next-appointment" className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#071827] via-[#09243a] to-[#064b5c] p-5 text-white shadow-sm sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 size-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-100">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-cyan-300" />
            Your next appointment · {countdown}
          </p>
          <h2 id="next-appointment" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <time dateTime={appointment.time}>{dateFormat.format(start)} · {time}</time>
          </h2>
          <p className="mt-2 break-words text-sm text-slate-200">
            {appointment.service} · {appointment.providerName}
            {appointment.staffName ? `, ${appointment.staffName}` : ""}
            {appointment.price !== null ? ` · R${appointment.price}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {appointment.canReschedule ? (
              <Button asChild size="sm" className="bg-sky-400 text-slate-950 hover:bg-sky-300">
                <Link to={`${detailsPath}?action=reschedule`}><RotateCcw aria-hidden="true" />Reschedule</Link>
              </Button>
            ) : (
              <Button size="sm" disabled className="bg-sky-400 text-slate-950">
                <RotateCcw aria-hidden="true" />Reschedule
              </Button>
            )}
            <Button asChild size="sm" variant="outline" className={outline}>
              <Link to={detailsPath}>Cancel / manage</Link>
            </Button>
            {calendarUid && (
              <Button size="sm" variant="outline" className={outline} onClick={() => downloadAppointmentCalendar(appointment, calendarUid)}>
                <ArrowDownToLine aria-hidden="true" />Add to calendar
              </Button>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start rounded-xl border border-white/15 bg-white/5 p-3 sm:self-center">
          <span aria-hidden="true" className="grid size-12 shrink-0 place-content-center rounded-xl bg-cyan-400 text-center text-slate-950">
            <span className="text-[10px] font-bold uppercase">{monthFormat.format(start)}</span>
            <span className="text-lg font-extrabold leading-none">{sastDate(start).slice(-2)}</span>
          </span>
          <div>
            <p className="text-xs text-slate-300">Appointment time</p>
            <p className="text-sm font-semibold">{time} SAST</p>
            <Link to={detailsPath} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-cyan-100 hover:underline">
              View details <ArrowRight aria-hidden="true" className="size-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
