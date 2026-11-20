import { useEffect, useState } from "react";
import { CalendarClock, History } from "lucide-react";
import { formatSast, sastDate } from "../../lib/bookingTime";
import { ApiError } from "../../services/api";
import { fetchRescheduleOptions, updateAppointment, type BookingSlot, type SavedAppointment } from "../../services/bookings";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "../ui/dialog";
import SlotPicker from "./SlotPicker";

type Props = {
  appointment: SavedAppointment;
  onSaved: (appointment: SavedAppointment, message: string) => void;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to save this change. Try again.";
}

function Cancellation({ appointment, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function cancel() {
    setPending(true);
    setError(null);
    try {
      const result = await updateAppointment(appointment.id, { reason });
      setOpen(false);
      onSaved(result.appointment, "Appointment cancelled.");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return <AlertDialog open={open} onOpenChange={next => {
    if (pending) return;
    setOpen(next);
    if (next) {
      setReason("");
      setError(null);
    }
  }}>
    <AlertDialogTrigger asChild><Button variant="outline">Cancel appointment</Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
        <AlertDialogDescription>{appointment.service} with {appointment.providerName} on {formatSast(appointment.time)}. Cancelling releases the time slot.</AlertDialogDescription>
      </AlertDialogHeader>
      <label className="grid gap-2 font-medium">Reason for cancellation (optional)
        <textarea className="min-h-20 rounded-md border bg-background p-2 font-normal" value={reason}
          maxLength={500} rows={3} disabled={pending} onChange={event => setReason(event.target.value)} />
      </label>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Keep appointment</AlertDialogCancel>
        <Button variant="destructive" disabled={pending} onClick={() => void cancel()}>
          {pending ? "Cancelling…" : "Confirm cancellation"}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

function RescheduleForm({ appointment, onSaved, onPendingChange }: Props & { onPendingChange: (pending: boolean) => void }) {
  const [date, setDate] = useState(() => sastDate(new Date(appointment.time)));
  const [selected, setSelected] = useState("");
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [options, setOptions] = useState<{ key: string; slots: BookingSlot[]; error: string | null } | null>(null);
  const key = `${date}:${retry}`;

  useEffect(() => {
    if (!date) return;
    let live = true;
    void fetchRescheduleOptions(appointment.id, date).then(result => {
      if (live) setOptions({ key, slots: result.slots, error: null });
    }).catch(error => {
      if (live) setOptions({ key, slots: [], error: errorMessage(error) });
    });
    return () => { live = false; };
  }, [appointment.id, date, key]);

  const current = date && options?.key === key ? options : null;
  const canSave = current?.slots.some(slot => slot.startsAt === selected && slot.status === "AVAILABLE");

  async function save() {
    if (!canSave || pending) return;
    setPending(true);
    onPendingChange(true);
    setSaveError(null);
    try {
      const result = await updateAppointment(appointment.id, { startsAt: selected });
      onSaved(result.appointment, "Appointment rescheduled.");
    } catch (error) {
      setSaveError(errorMessage(error));
      if (error instanceof ApiError && (error.status === 409 || error.status === 422)) {
        setSelected("");
        setRetry(value => value + 1);
      }
    } finally {
      setPending(false);
      onPendingChange(false);
    }
  }

  return <>
    <SlotPicker date={date} onDateChange={value => { setDate(value); setSelected(""); setSaveError(null); }}
      slots={current?.slots ?? []} selected={selected} onSelect={value => { setSelected(value); setSaveError(null); }}
      loading={Boolean(date) && !current} error={current?.error ?? null}
      disabled={pending} onRetry={() => { setSelected(""); setRetry(value => value + 1); }} />
    {selected && <p className="rounded-lg bg-muted p-3"><strong>New time</strong> · {formatSast(selected)}</p>}
    {saveError && <p role="alert" className="text-destructive">{saveError}</p>}
    <DialogFooter>
      <DialogClose asChild><Button variant="outline" disabled={pending}>Keep current time</Button></DialogClose>
      <Button disabled={!canSave || pending} onClick={() => void save()}>{pending ? "Saving…" : "Confirm reschedule"}</Button>
    </DialogFooter>
  </>;
}

function Reschedule({ appointment, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return <Dialog open={open} onOpenChange={next => { if (!pending) setOpen(next); }}>
    <DialogTrigger asChild><Button><CalendarClock aria-hidden="true" />Reschedule</Button></DialogTrigger>
    <DialogContent className="sm:max-w-xl" showCloseButton={!pending}>
      <DialogHeader>
        <DialogTitle>Reschedule appointment</DialogTitle>
        <DialogDescription>Current time · {formatSast(appointment.time)}. Your service and provider stay the same.</DialogDescription>
      </DialogHeader>
      {open && <RescheduleForm appointment={appointment} onPendingChange={setPending} onSaved={(saved, message) => {
        setOpen(false);
        onSaved(saved, message);
      }} />}
    </DialogContent>
  </Dialog>;
}

export default function AppointmentManagement({ appointment, onSaved }: Props) {
  const { canCancel, canReschedule, changeDeadline, changeBlockReason, phone } = appointment;
  const actionsAvailable = canCancel || canReschedule;
  const events = appointment.events ?? [];
  return <div className="grid items-start gap-5">
    <section aria-labelledby="manage-appointment" className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 id="manage-appointment" className="text-lg font-semibold">Manage appointment</h2>
      {actionsAvailable
        ? <p className="text-sm text-muted-foreground">Online changes are available until {formatSast(changeDeadline)}.</p>
        : <p className="text-sm text-muted-foreground">{changeBlockReason}</p>}
      {canCancel && !canReschedule && <p className="text-sm text-muted-foreground">Online rescheduling is unavailable for this appointment.</p>}
      {phone && <p className="text-sm text-muted-foreground">Provider contact <a className="font-medium underline" href={`tel:${phone}`}>{phone}</a></p>}
      {actionsAvailable && <div className="flex flex-wrap gap-3 pt-1">
        {canReschedule && <Reschedule appointment={appointment} onSaved={onSaved} />}
        {canCancel && <Cancellation appointment={appointment} onSaved={onSaved} />}
      </div>}
    </section>
    {events.length > 0 && <section aria-labelledby="appointment-history" className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 id="appointment-history" className="flex items-center gap-2 text-lg font-semibold"><History className="size-4" aria-hidden="true" />Appointment history</h2>
      <ol className="divide-y">{[...events].reverse().map(event => <li key={event.id} className="pb-3 pt-3 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-medium capitalize">{event.type === "CREATED" ? "Booked" : event.type.toLowerCase().replaceAll("_", " ")}</span>
          <time dateTime={event.createdAt} className="text-xs text-muted-foreground">{formatSast(event.createdAt)}</time>
        </div>
        {event.type === "RESCHEDULED" && event.oldScheduledStart && <p className="text-sm text-muted-foreground">{formatSast(event.oldScheduledStart)} → {formatSast(event.newScheduledStart)}</p>}
        {event.reason && <p className="break-words text-sm text-muted-foreground">{event.reason}</p>}
      </li>)}</ol>
    </section>}
  </div>;
}
