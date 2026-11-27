import { sastDate } from "../../lib/bookingTime";
import AppointmentHistoryDrawer from "../booking/AppointmentHistoryDrawer";
import { calendarTimeRange, layoutCalendarDay, type CalendarAppointment, type CalendarAvailability } from "./calendarLayout";

export type Appointment = CalendarAppointment;

type WeekViewProps = {
  currentDate: Date;
  appointments: Appointment[];
  availability: CalendarAvailability[];
  onSaved?: () => void;
  role?: "provider" | "business";
};

const HOUR_HEIGHT = 64;
const timeFormatter = new Intl.DateTimeFormat("en-ZA", {
  timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export default function WeekView({ currentDate, appointments, availability, onSaved, role = "provider" }: WeekViewProps) {
  const currentDay = new Date(`${sastDate(currentDate)}T00:00:00Z`);
  currentDay.setUTCDate(currentDay.getUTCDate() - currentDay.getUTCDay());
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(currentDay.getTime() + index * 86_400_000);
    return { key: day.toISOString().slice(0, 10), date: day };
  });
  const today = sastDate();
  const range = calendarTimeRange(availability, appointments, days.map(day => day.key));
  if (!range) return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No working hours or appointments for this week.</div>;
  const hours = Array.from({ length: Math.ceil((range.end - range.start) / 60) }, (_, index) => range.start + index * 60);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="h-1.5 bg-primary" />
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-sky-50/50">
            <div className="flex items-center justify-center border-r border-slate-200 text-xs font-semibold text-slate-500">SAST</div>
            {days.map(day => <div key={day.key} className="border-r border-slate-200 p-3 text-center last:border-r-0">
              <p className="text-xs font-semibold uppercase text-slate-500">{day.date.toLocaleDateString("en-ZA", { weekday: "short", timeZone: "UTC" })}</p>
              <p className={`mx-auto mt-1 grid size-8 place-items-center rounded-full text-sm font-bold ${day.key === today ? "bg-sky-600 text-white" : "text-slate-800"}`}>{day.date.getUTCDate()}</p>
            </div>)}
          </div>
          <div className="max-h-[min(700px,65vh)] overflow-y-auto">
            <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
              <div className="border-r border-slate-200 bg-slate-50/50">{hours.map(minute => <div key={minute} style={{ height: Math.min(60, range.end - minute) * HOUR_HEIGHT / 60 }} className="border-b border-slate-100 pr-2 pt-1 text-right text-xs text-slate-500">{String(Math.floor(minute / 60)).padStart(2, "0")}:{String(minute % 60).padStart(2, "0")}</div>)}</div>
              {days.map(day => <div key={day.key} className="relative border-r border-slate-200 last:border-r-0" style={{ height: (range.end - range.start) * HOUR_HEIGHT / 60 }}>
                {hours.map(minute => <div key={minute} style={{ height: Math.min(60, range.end - minute) * HOUR_HEIGHT / 60 }} className="border-b border-slate-100" />)}
                {layoutCalendarDay(appointments, day.key).map(block => {
                  const { appointment } = block;
                  const start = timeFormatter.format(new Date(appointment.date));
                  const end = timeFormatter.format(new Date(appointment.endsAt!));
                  return <AppointmentHistoryDrawer key={appointment.id} id={appointment.id} role={role} startsAt={appointment.date}
                    title={`${appointment.serviceName} · ${appointment.customerName}`} onSaved={() => onSaved?.()}
                    trigger={<button type="button" className="absolute overflow-hidden rounded border border-sky-300 bg-sky-100 px-1 text-left text-xs text-sky-950 hover:bg-sky-200 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-sky-700" style={{
                    top: (block.startMinute - range.start) * HOUR_HEIGHT / 60,
                    height: (block.endMinute - block.startMinute) * HOUR_HEIGHT / 60,
                    left: `${block.column * 100 / block.columns}%`, width: `${100 / block.columns}%`,
                  }} title={`${start} - ${end} SAST: ${appointment.serviceName} with ${appointment.customerName}`} aria-label={`${start} to ${end} SAST, ${appointment.serviceName}, ${appointment.customerName}`}>
                    <span className="block truncate font-semibold">{start} {appointment.customerName}</span>
                    <span className="block truncate">{appointment.serviceName}</span>
                  </button>} />;
                })}
              </div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}