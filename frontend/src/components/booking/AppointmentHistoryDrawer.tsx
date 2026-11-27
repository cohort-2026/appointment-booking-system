import { useEffect, useState, type ReactElement } from "react";
import { apiFetch } from "../../services/api";
import type { AppointmentEvent } from "../../services/bookings";
import { formatSast } from "../../lib/bookingTime";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";

const actionLabels = { COMPLETED: "Mark completed", NO_SHOW: "Mark no-show", CANCELLED: "Cancel appointment" };
const actorLabels: Record<string, string> = { OWNER: "Business owner", STAFF: "Staff", PROVIDER: "Provider", CUSTOMER: "Customer", SYSTEM: "System" };
type Action = keyof typeof actionLabels;
type History = { events: AppointmentEvent[]; allowedStatuses: Action[] };
const readable = (value: string) => (value === "CREATED" ? "Booked" : value.toLowerCase().replaceAll("_", " "));

export default function AppointmentHistoryDrawer({ id, role, title, startsAt, onSaved, trigger }: {
  id: string; role: "business" | "provider" | "staff"; title: string; startsAt: string;
  onSaved: (status: Action) => void;
  trigger?: ReactElement;
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

  return <Dialog open={open} onOpenChange={next => {
    if (saving) return;
    if (next) { setHistory(null); setError(""); setAction(null); setReason(""); }
    setOpen(next);
  }}>
    <DialogTrigger asChild>{trigger ?? <Button variant="outline" size="sm">Details</Button>}</DialogTrigger>
    <DialogContent className="sm:max-w-xl" showCloseButton={!saving}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{formatSast(startsAt)}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {!history ? error
          ? <Button variant="outline" onClick={() => { setError(""); setRetry(value => value + 1); }}>Try again</Button>
          : <div role="status" aria-label="Loading appointment history" aria-busy="true" className="space-y-5">
            <div className="flex gap-2"><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-24" /></div>
            <Skeleton className="h-5 w-40" />
            {[0, 1, 2].map(item => <div key={item} className="space-y-2 border-b pb-3 last:border-0"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-3/4" /></div>)}
          </div>
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
    </DialogContent>
  </Dialog>;
}
