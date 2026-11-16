import { useMemo } from "react";
import {
  filterForStaffAndRange,
  formatTimeLabel,
  getDateKeysInRange,
  getDaySegment,
  getInterval,
  type CalendarAppointment,
} from "../../utils/staffCalendar";

export type { CalendarAppointment };

export interface StaffCalendarProps {
  appointments: CalendarAppointment[];
  selectedStaffId: string;
  rangeStart: string; // YYYY-MM-DD in the demo timezone
  rangeEnd?: string; // omit for a single day
  timeZone: string; // the agreed demo timezone
  slotMinutes?: 30 | 60; // default 30
  dayStartHour?: number; // default 8
  dayEndHour?: number; // default 18
}

const PX_PER_MINUTE = 1; // 60px per hour, so block size is exact

const pad = (n: number) => String(n).padStart(2, "0");
const slotLabel = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const dayLabel = (key: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${key}T12:00:00Z`));

export default function StaffCalendar({
  appointments,
  selectedStaffId,
  rangeStart,
  rangeEnd,
  timeZone,
  slotMinutes = 30,
  dayStartHour = 8,
  dayEndHour = 18,
}: StaffCalendarProps) {
  const dateKeys = useMemo(() => getDateKeysInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);

  const visible = useMemo(
    () => filterForStaffAndRange(appointments, selectedStaffId, rangeStart, rangeEnd, timeZone),
    [appointments, selectedStaffId, rangeStart, rangeEnd, timeZone],
  );

  const columns = useMemo(
    () =>
      dateKeys.map((dateKey) => ({
        dateKey,
        blocks: visible.flatMap((appointment) => {
          const segment = getDaySegment(appointment, dateKey, timeZone, dayStartHour, dayEndHour);
          return segment ? [{ appointment, segment }] : [];
        }),
      })),
    [dateKeys, visible, timeZone, dayStartHour, dayEndHour],
  );

  const windowMinutes = (dayEndHour - dayStartHour) * 60;
  const slotStarts = Array.from(
    { length: windowMinutes / slotMinutes },
    (_, i) => dayStartHour * 60 + i * slotMinutes,
  );
  const gridTemplateColumns = `64px repeat(${dateKeys.length}, minmax(140px, 1fr))`;

  return (
    <div className="flex w-full flex-col gap-2">
      {visible.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No appointments in this range.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header row: one cell per date */}
        <div className="grid border-b border-slate-200 bg-slate-50" style={{ gridTemplateColumns }}>
          <div className="border-r border-slate-200 p-3 text-center text-xs font-semibold text-slate-400">
            Time
          </div>
          {columns.map(({ dateKey }) => (
            <div
              key={dateKey}
              className="border-r border-slate-200 p-3 text-center text-sm font-semibold text-slate-700 last:border-r-0"
            >
              {dayLabel(dateKey)}
            </div>
          ))}
        </div>

        {/* Body: time column plus one column per date */}
        <div className="grid" style={{ gridTemplateColumns }}>
          <div className="border-r border-slate-200 bg-slate-50/50">
            {slotStarts.map((minutes) => (
              <div
                key={minutes}
                className="border-b border-slate-100 pr-2 pt-1 text-right text-xs text-slate-400"
                style={{ height: slotMinutes * PX_PER_MINUTE }}
              >
                {slotLabel(minutes)}
              </div>
            ))}
          </div>

          {columns.map(({ dateKey, blocks }) => (
            <div
              key={dateKey}
              className="relative border-r border-slate-200 last:border-r-0"
              style={{ height: windowMinutes * PX_PER_MINUTE }}
            >
              {slotStarts.map((minutes) => (
                <div
                  key={minutes}
                  className="border-b border-slate-100"
                  style={{ height: slotMinutes * PX_PER_MINUTE }}
                />
              ))}

              {blocks.map(({ appointment, segment }) => {
                const { start, end } = getInterval(appointment.time, appointment.durationMinutes);
                const timeText = `${formatTimeLabel(start, timeZone)} – ${formatTimeLabel(end, timeZone)}`;
                return (
                  <div
                    key={`${appointment.id}-${dateKey}`}
                    data-appointment-id={appointment.id}
                    className="absolute left-1 right-1 overflow-hidden rounded border border-sky-300 bg-sky-100 px-2 py-1 text-xs text-sky-900 shadow-sm"
                    style={{
                      top: segment.startOffset * PX_PER_MINUTE,
                      height: (segment.endOffset - segment.startOffset) * PX_PER_MINUTE,
                    }}
                    title={`${appointment.serviceLabel} with ${appointment.customerLabel}, ${timeText}`}
                  >
                    {segment.clippedStart && <p className="text-[10px] text-sky-700">↑ continues from earlier</p>}
                    <p className="truncate font-bold">{appointment.customerLabel}</p>
                    <p className="truncate">{appointment.serviceLabel}</p>
                    <p className="truncate text-sky-700">{timeText}</p>
                    {segment.clippedEnd && <p className="text-[10px] text-sky-700">↓ continues later</p>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}