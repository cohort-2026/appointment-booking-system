import type { BookingSlot, BookingStaffOption } from "../../services/bookings";
import { sastDate, sastDateLimit } from "../../lib/bookingTime";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";

/** Shared by public/dashboard booking; S2 can reuse this with its authorized availability response. */
export default function SlotPicker(props: {
  date: string; onDateChange: (date: string) => void;
  business?: boolean; staff?: BookingStaffOption[]; staffId?: string; onStaffChange?: (id: string) => void;
  slots: BookingSlot[]; selected: string; onSelect: (startsAt: string) => void;
  selectedSlots?: string[]; maxSelections?: number;
  loading: boolean; disabled?: boolean; error: string | null; onRetry: () => void;
}) {
  return <div className="space-y-5">
    <p className="text-sm text-muted-foreground">All dates and times are in <strong className="text-foreground">South African Standard Time (SAST)</strong>.</p>
    <label className="block space-y-2 text-sm font-medium">Choose a date<Input type="date" className="h-10" value={props.date}
      min={sastDate()} max={sastDateLimit(90)} disabled={props.disabled} onChange={e => props.onDateChange(e.target.value)} /></label>
    {props.business && <label className="block space-y-2 text-sm font-medium">Choose a staff member
      <select className="block min-h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={props.staffId}
        disabled={props.disabled || props.loading} onChange={e => props.onStaffChange?.(e.target.value)}>
        <option value="">Select staff</option>{props.staff?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select></label>}
    {props.error ? <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">{props.error}<Button variant="outline" className="ml-2" disabled={props.disabled} onClick={props.onRetry}>Try again</Button></div>
      : props.loading ? <div role="status" aria-label="Checking availability" className="space-y-3">
        <span className="sr-only">Checking availability…</span>
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{Array.from({ length: 9 }, (_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}</div>
      </div>
      : props.business && !props.staffId ? <p role="status" className="text-sm text-muted-foreground">{props.staff?.length ? "Choose a staff member to see their times." : "No eligible staff are currently assigned to this service."}</p>
      : props.slots.length === 0 ? <p role="status" className="rounded-xl bg-muted p-5 text-sm text-muted-foreground">No appointment times on this date. Please choose another day.</p>
      : <fieldset><legend className="mb-3 text-sm font-semibold">{props.selectedSlots ? "Choose start times" : "Choose a start time"}</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {props.slots.map(slot => <button key={slot.startsAt} type="button" disabled={props.disabled || slot.status !== "AVAILABLE" || Boolean(props.selectedSlots && props.maxSelections && props.selectedSlots.length >= props.maxSelections && !props.selectedSlots.includes(slot.startsAt))}
          aria-pressed={props.selectedSlots ? props.selectedSlots.includes(slot.startsAt) : props.selected === slot.startsAt} onClick={() => props.onSelect(slot.startsAt)}
          className={cn("min-h-12 rounded-xl border p-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
            slot.status === "BOOKED" && slot.recoveryUntil
              ? "border-amber-300 bg-amber-100 text-amber-950"
              : (props.selectedSlots ? props.selectedSlots.includes(slot.startsAt) : props.selected === slot.startsAt)
                ? "border-transparent bg-linear-to-b from-(--primary-gradient-from) to-(--primary-gradient-to) text-primary-foreground disabled:bg-none disabled:bg-muted disabled:text-muted-foreground"
                : "bg-card enabled:hover:border-primary disabled:bg-muted disabled:text-muted-foreground")}>
          {slot.label}
        </button>)}
      </div></fieldset>}
    <p className="text-xs leading-5 text-muted-foreground">Appointment times account for the service duration and recovery time.</p>
  </div>;
}