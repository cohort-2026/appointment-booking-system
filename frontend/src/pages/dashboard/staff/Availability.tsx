import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import {
  fetchStaffAvailability,
  saveStaffAvailability,
  type StaffAvailabilityRule,
} from "../../../services/staff";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type DaySchedule = { active: boolean; startTime: string; endTime: string };
type ScheduleState = Record<number, DaySchedule>;

function emptySchedule(): ScheduleState {
  return Object.fromEntries(days.map((_, day) => [day, { active: false, startTime: "09:00", endTime: "17:00" }])) as ScheduleState;
}

function toSchedule(rules: StaffAvailabilityRule[]): ScheduleState {
  const schedule = emptySchedule();
  for (const rule of rules) schedule[rule.dayOfWeek] = { active: rule.active, startTime: rule.startTime, endTime: rule.endTime };
  return schedule;
}

function AvailabilitySkeleton() {
  return (
    <div className="mx-auto max-w-4xl" role="status" aria-label="Loading availability" aria-busy="true">
      <span className="sr-only">Loading your weekly availability.</span>
      <div aria-hidden="true">
        <div className="mb-6">
          <h2 className="font-[Clash_Display] text-2xl font-bold text-slate-950">My availability</h2>
          <p className="mt-1 text-sm text-slate-600">Set the hours when customers can book your assigned services.</p>
        </div>
        <div className="animate-pulse motion-reduce:animate-none">
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="h-4 w-2/3 rounded bg-sky-100" />
            <div className="h-9 w-36 shrink-0 rounded-md bg-sky-100" />
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="divide-y divide-slate-100">
              {days.map((day) => (
                <div key={day} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                  <div className="space-y-2">
                    <div className="h-4 w-24 rounded bg-slate-200" />
                    <div className="h-3 w-36 rounded bg-slate-100" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-slate-200" />
                    <div className="h-4 w-16 rounded bg-slate-100" />
                  </div>
                  {["from", "until"].map((field) => (
                    <div key={field} className="space-y-1">
                      <div className="h-3 w-8 rounded bg-slate-100" />
                      <div className="h-9 w-32 rounded-md bg-slate-100" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t border-slate-100 p-4">
              <div className="h-11 w-40 rounded-md bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffAvailability() {
  const [schedule, setSchedule] = useState<ScheduleState>(emptySchedule);
  const [businessSchedule, setBusinessSchedule] = useState<StaffAvailabilityRule[]>([]);
  const [inherits, setInherits] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchStaffAvailability()
      .then((response) => {
        if (!active) return;
        setSchedule(toSchedule(response.inheritsBusinessSchedule ? response.businessSchedule : response.schedule));
        setBusinessSchedule(response.businessSchedule);
        setInherits(response.inheritsBusinessSchedule);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load availability.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadAttempt]);

  function updateDay(day: number, patch: Partial<DaySchedule>) {
    setSchedule((current) => ({ ...current, [day]: { ...current[day], ...patch } }));
    setInherits(false);
  }

  function useBusinessHours() {
    setSchedule(toSchedule(businessSchedule));
    setInherits(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const availability = inherits ? [] : Object.entries(schedule)
      .map(([day, value]) => ({ dayOfWeek: Number(day), ...value }));
    if (availability.some((rule) => rule.startTime >= rule.endTime)) {
      toast.error("Each shift must end after it starts.");
      return;
    }

    setSaving(true);
    try {
      const response = await saveStaffAvailability(availability);
      setSchedule(toSchedule(response.schedule.length === 0 ? businessSchedule : response.schedule));
      setInherits(response.schedule.length === 0);
      toast.success("Your weekly availability was saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save availability.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AvailabilitySkeleton />;
  if (loadError) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900"><p>{loadError}</p><button type="button" onClick={() => { setLoading(true); setLoadError(null); setLoadAttempt((attempt) => attempt + 1); }} className="mt-3 rounded-md border border-red-300 px-3 py-2 text-sm font-semibold">Retry</button></div>;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6"><h2 className="font-[Clash_Display] text-2xl font-bold text-slate-950">My availability</h2><p className="mt-1 text-sm text-slate-600">Set the hours when customers can book your assigned services.</p></div>
      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-sky-950">{inherits ? "Using business hours. Save to keep following changes to your business hours." : "Your personal hours are combined with business hours; bookings must fit both schedules."}{businessSchedule.every((rule) => !rule.active) && " Your business has no active hours; ask the owner to set them."}</p><button type="button" disabled={saving} onClick={useBusinessHours} className="w-fit rounded-md border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-60">Use business hours</button></div>
      <form onSubmit={save} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <fieldset disabled={saving} className="divide-y divide-slate-100">
          {days.map((day, dayOfWeek) => {
            const item = schedule[dayOfWeek]!;
            const businessDay = businessSchedule.find((rule) => rule.dayOfWeek === dayOfWeek && rule.active);
            return <div key={day} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
              <div><p className="text-sm font-semibold text-slate-900">{day}</p>{businessDay && <p className="text-xs text-slate-500">Business: {businessDay.startTime}–{businessDay.endTime}</p>}</div>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={item.active} onChange={(event) => updateDay(dayOfWeek, { active: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-sky-700" />Available</label>
              <label className="text-xs font-medium text-slate-500">From<input type="time" value={item.startTime} disabled={!item.active} onChange={(event) => updateDay(dayOfWeek, { startTime: event.target.value })} className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 disabled:bg-slate-100" /></label>
              <label className="text-xs font-medium text-slate-500">Until<input type="time" value={item.endTime} disabled={!item.active} onChange={(event) => updateDay(dayOfWeek, { endTime: event.target.value })} className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 disabled:bg-slate-100" /></label>
            </div>;
          })}
        </fieldset>
        <div className="flex justify-end border-t border-slate-100 p-4"><button type="submit" disabled={saving} className="rounded-md bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60">{saving ? "Saving…" : "Save availability"}</button></div>
      </form>
    </div>
  );
}
