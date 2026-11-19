import type { BookingSlot, BookingStaffOption } from "../../services/bookings";
import { BOOKING_TIME_ZONE, formatSast, sastDate, sastDateLimit } from "../../lib/bookingTime";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const recoveryTime = new Intl.DateTimeFormat("en-ZA", {
  timeZone: BOOKING_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** Shared by public/dashboard booking; S2 can reuse this with its authorized availability response. */
export default function SlotPicker(props: {
  date: string; onDateChange: (date: string) => void;
  business: boolean; staff: BookingStaffOption[]; staffId: string; onStaffChange: (id: string) => void;
  slots: BookingSlot[]; selected: string; onSelect: (startsAt: string) => void;
  loading: boolean; disabled?: boolean; error: string | null; onRetry: () => void;
}) {
  return <div className="space-y-5">
    <p className="text-sm text-slate-600">All dates and times are in <strong>South African Standard Time (SAST)</strong>.</p>
    <label className="block space-y-2 font-medium">Choose a date<Input type="date" value={props.date}
      min={sastDate()} max={sastDateLimit(90)} disabled={props.disabled} onChange={e => props.onDateChange(e.target.value)} /></label>
    {props.business && <label className="block space-y-2 font-medium">Choose a staff member
      <select className="block min-h-11 w-full rounded-lg border bg-white p-3" value={props.staffId}
        disabled={props.disabled || props.loading} onChange={e => props.onStaffChange(e.target.value)}>
        <option value="">Select staff</option>{props.staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select></label>}
    {props.error ? <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">{props.error}<Button variant="outline" className="ml-2" onClick={props.onRetry}>Try again</Button></div>
      : props.loading ? <p role="status" className="animate-pulse rounded-xl bg-slate-100 p-6">Checking availability…</p>
      : props.business && !props.staffId ? <p role="status">{props.staff.length ? "Choose a staff member to see their times." : "No eligible staff are currently assigned to this service."}</p>
      : props.slots.length === 0 ? <p role="status" className="rounded-xl bg-slate-50 p-5">No appointment times on this date. Please choose another day.</p>
      : <fieldset><legend className="mb-3 font-semibold">Choose a start time</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {props.slots.map(slot => <button key={slot.startsAt} type="button" disabled={props.disabled || slot.status !== "AVAILABLE"}
          aria-pressed={props.selected === slot.startsAt} onClick={() => props.onSelect(slot.startsAt)}
          className={`min-h-12 rounded-xl border p-3 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${props.selected === slot.startsAt ? "border-sky-700 bg-sky-700 text-white" : "border-slate-200 hover:border-sky-600"}`}>
          {slot.label}
          {slot.recoveryUntil
            ? <span className="block rounded bg-amber-100 px-1 py-0.5 text-xs text-amber-900">
                Recovery until {sastDate(new Date(slot.startsAt)) === sastDate(new Date(slot.recoveryUntil))
                  ? recoveryTime.format(new Date(slot.recoveryUntil))
                  : formatSast(slot.recoveryUntil)}
              </span>
            : slot.status === "BOOKED" && <span className="block text-xs">Unavailable</span>}
        </button>)}
      </div></fieldset>}
    <p className="text-xs leading-5 text-slate-500">Starts are offered every 15 minutes. After an appointment ends, the calendar reserves at least 15 minutes for recovery.</p>
  </div>;
}
