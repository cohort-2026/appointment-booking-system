import { useEffect, useState } from "react";
import { apiFetch } from "../../services/api";
import type { AppointmentEvent } from "../../services/bookings";
import { formatSast } from "../../lib/bookingTime";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";

const actionLabels = { COMPLETED: "Mark completed", NO_SHOW: "Mark no-show", CANCELLED: "Cancel appointment" };
const actorLabels: Record<string, string> = { OWNER: "Business owner", STAFF: "Staff", PROVIDER: "Provider", CUSTOMER: "Customer", SYSTEM: "System" };
type Action = keyof typeof actionLabels;
type History = { events: AppointmentEvent[]; allowedStatuses: Action[] };
const readable = (value: string) => (value === "CREATED" ? "Booked" : value.toLowerCase().replaceAll("_", " "));

export default function AppointmentHistoryDrawer({ id, role, title, startsAt, onSaved }: {
  id: string; role: "business" | "provider" | "staff"; title: string; startsAt: string;
  onSaved: (status: Action) => void;
}) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<History | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const path = `/${role}/appointments/${encodeURIComponent(id)}`;

  useEffect(() => {
    if (!open) return;
    let active = true;
    void apiFetch<History>(`${path}/events`).then(data => { if (active) setHistory(data); })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : "Could not load history."); });
    return () => { active = false; };
  }, [open, path, retry]);

  async function submit() {
    if (!action || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await apiFetch<{ status: Action }>(`${path}/status`, {
        method: "PATCH", body: JSON.stringify({ status: action, reason }),
      });
      setAction(null);
      setReason("");
      setOpen(false);
      onSaved(result.status);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not update the appointment.");
      setRetry(value => value + 1);
    } finally {
      setSaving(false);
    }
  }

  return <Sheet open={open} onOpenChange={next => {
    if (saving) return;
    if (next) { setHistory(null); setError(""); setAction(null); setReason(""); }
    setOpen(next);
  }}>
    <SheetTrigger asChild><Button variant="outline" size="sm">Details</Button></SheetTrigger>
    <SheetContent className="w-full" showCloseButton={!saving}>
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>{formatSast(startsAt)}</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 px-4 pb-6">
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {!history ? error
          ? <Button variant="outline" onClick={() => { setError(""); setRetry(value => value + 1); }}>Try again</Button>
          : <p role="status">Loading appointment history…</p>
          : <>
            {history.allowedStatuses.length > 0 && <div className="flex flex-wrap gap-2">
              {history.allowedStatuses.map(status => <Button key={status} variant="outline" disabled={saving}
                onClick={() => setAction(status)}>{actionLabels[status]}</Button>)}
            </div>}
            {action && <div className="space-y-3 rounded-lg border p-3">
              <p className="font-medium">{actionLabels[action]}?</p>
              <label className="block">Reason (optional)
                <textarea className="mt-1 w-full rounded border p-2" value={reason} maxLength={500} disabled={saving}
                  onChange={event => setReason(event.target.value)} />
              </label>
              <Button disabled={saving} onClick={() => void submit()}>{saving ? "Saving…" : "Confirm"}</Button>
              <Button variant="ghost" disabled={saving} onClick={() => setAction(null)}>Back</Button>
            </div>}
            <h2 className="font-semibold">Appointment history</h2>
            {history.events.length === 0 ? <p>No history has been recorded for this appointment.</p> :
              <ol className="divide-y">{[...history.events].reverse().map(event => <li key={event.id} className="space-y-1 py-3">
                <p className="font-medium capitalize">{readable(event.type)}</p>
                <p>{event.actorUser ? [event.actorUser.firstName, event.actorUser.lastName].filter(Boolean).join(" ") + " · " : ""}{actorLabels[event.actor] ?? event.actor} · {formatSast(event.createdAt)}</p>
                {event.type === "RESCHEDULED" && event.oldScheduledStart &&
                  <p>{formatSast(event.oldScheduledStart)} → {formatSast(event.newScheduledStart)}</p>}
                {event.reason && <p className="break-words">{event.reason}</p>}
              </li>)}</ol>}
          </>}
      </div>
    </SheetContent>
  </Sheet>;
}
