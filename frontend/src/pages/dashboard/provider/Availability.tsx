import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiFetch } from "../../../services/api";
import { Card, CardContent } from "@/components/ui/card";

const ACCENT_FROM = "#0EA5E9";
const ACCENT_TO = "#38BDF8";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

type TimeRange = { startTime: string; endTime: string };
type AvailabilityRule = { dayOfWeek: number; startTime: string; endTime: string; active: boolean };
type AvailabilityResponse = { success: boolean; availability: AvailabilityRule[] };
const EMPTY_RANGE: TimeRange = { startTime: "09:00", endTime: "17:00" };

function rulesToSchedule(rules: AvailabilityRule[]): TimeRange[][] {
  return DAYS.map((_, day) => rules
    .filter((rule) => rule.dayOfWeek === day && rule.active)
    .map(({ startTime, endTime }) => ({ startTime, endTime }))
    .sort((left, right) => left.startTime.localeCompare(right.startTime)));
}

function scheduleToRules(schedule: TimeRange[][]): AvailabilityRule[] {
  return schedule.flatMap((ranges, dayOfWeek) => ranges.map((range) => ({ ...range, dayOfWeek, active: true })));
}

function formatDayRange(firstDay: number, lastDay: number): string {
  const first = DAYS[firstDay]?.slice(0, 3) ?? "";
  const last = DAYS[lastDay]?.slice(0, 3) ?? "";
  return firstDay === lastDay ? first : `${first}–${last}`;
}

function summarizeHours(schedule: TimeRange[][]): Array<{ days: string; hours: string; firstPosition: number; lastPosition: number; signature: string }> {
  const rows: Array<{ days: string; hours: string; firstPosition: number; lastPosition: number; signature: string }> = [];
  for (const [position, dayOfWeek] of WEEK_ORDER.entries()) {
    const ranges = schedule[dayOfWeek] ?? [];
    if (!ranges.length) continue;
    const hours = ranges.map((range) => `${range.startTime}–${range.endTime}`).join(", ");
    const previous = rows[rows.length - 1];
    if (previous && previous.signature === hours && previous.lastPosition === position - 1) {
      previous.lastPosition = position;
      previous.days = formatDayRange(WEEK_ORDER[previous.firstPosition]!, dayOfWeek);
    } else {
      rows.push({ days: DAYS[dayOfWeek]?.slice(0, 3) ?? "", hours, firstPosition: position, lastPosition: position, signature: hours });
    }
  }
  return rows;
}

function countWeeklyHours(schedule: TimeRange[][]): number {
  return schedule.flat().reduce((total, range) => {
    const [startHour, startMinute] = range.startTime.split(":").map(Number);
    const [endHour, endMinute] = range.endTime.split(":").map(Number);
    const start = (startHour ?? 0) * 60 + (startMinute ?? 0);
    const end = (endHour ?? 0) * 60 + (endMinute ?? 0);
    return total + Math.max(0, end - start) / 60;
  }, 0);
}

export default function Availability({ editMode = false }: { editMode?: boolean }) {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<TimeRange[][]>(() => DAYS.map(() => []));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    void apiFetch<AvailabilityResponse>("/provider/availability")
      .then((response) => {
        if (active) {
          setSchedule(rulesToSchedule(response.availability ?? []));
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        console.error("Provider availability fetch failed:", error);
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load availability.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  const groupedHours = useMemo(() => summarizeHours(schedule), [schedule]);
  const openDays = schedule.filter((ranges) => ranges.length > 0).length;
  const weeklyHours = countWeeklyHours(schedule);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await apiFetch<AvailabilityResponse>("/provider/availability", {
        method: "PUT",
        body: JSON.stringify({ availability: scheduleToRules(schedule) }),
      });
      setSchedule(rulesToSchedule(response.availability ?? []));
      navigate("/dashboard/provider/availability", { replace: true });
      toast.success("Availability updated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update availability.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="mx-auto max-w-4xl animate-pulse" role="status" aria-label="Loading availability"><div className="mb-8 h-8 w-48 rounded bg-slate-200" /><div className="h-28 rounded-xl bg-slate-100" /><div className="mt-5 h-60 rounded-xl bg-white" /></div>;
  }

  if (loadError) {
    return <div className="mx-auto max-w-4xl rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">Availability could not be loaded: {loadError}{" "}<button type="button" onClick={() => { setIsLoading(true); setReloadKey((key) => key + 1); }} className="font-semibold underline">Retry</button></div>;
  }

  return <div className="mx-auto max-w-4xl">
    <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h1 className="text-2xl font-bold text-slate-900">Availability</h1><p className="mt-1 text-slate-500">Review and manage your weekly booking hours.</p></div>
      {editMode ? <div className="flex gap-2"><Link to="/dashboard/provider/availability" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link><button type="button" onClick={() => void handleSave()} disabled={isSaving} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${ACCENT_TO}, ${ACCENT_FROM})` }}>{isSaving ? "Saving…" : "Save schedule"}</button></div> : <Link to="/dashboard/provider/availability/edit" className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Set / update times</Link>}
    </header>

    {!editMode ? <>
      <section className="mb-5 grid gap-3 sm:grid-cols-2">
        <Card className="gap-0 rounded-lg py-0 shadow-sm"><div className="h-1.5 bg-primary" /><CardContent className="p-5"><p className="text-xs font-semibold uppercase text-slate-500">Open days</p><p className="mt-2 text-3xl font-bold text-slate-900">{openDays}<span className="ml-1 text-base font-medium text-slate-400">/ 7</span></p></CardContent></Card>
        <Card className="gap-0 rounded-lg py-0 shadow-sm"><div className="h-1.5 bg-emerald-500" /><CardContent className="p-5"><p className="text-xs font-semibold uppercase text-slate-500">Hours per week</p><p className="mt-2 text-3xl font-bold text-slate-900">{weeklyHours.toLocaleString(undefined, { maximumFractionDigits: 1 })}<span className="ml-1 text-base font-medium text-slate-400">hrs</span></p></CardContent></Card>
      </section>
      <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
        <div className="h-1.5 bg-primary" />
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-sky-50/50 px-5 py-4"><h2 className="font-semibold text-slate-900">Weekly hours</h2><p className="text-xs text-slate-500">Configured platform timezone</p></header>
        {groupedHours.length ? <div className="divide-y divide-slate-100">{groupedHours.map((group) => <div key={`${group.days}-${group.hours}`} className="grid gap-1 px-5 py-4 sm:grid-cols-[120px_1fr] sm:items-center"><p className="text-sm font-semibold text-slate-700">{group.days}</p><p className="text-sm text-slate-600">{group.hours}</p></div>)}</div> : <div className="px-5 py-10 text-center"><p className="font-medium text-slate-800">No hours set</p><p className="mt-1 text-sm text-slate-500">Add your weekly hours to let customers know when you are available.</p><Link to="/dashboard/provider/availability/edit" className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Set weekly times</Link></div>}
      </Card>
    </> : <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
      <div className="h-1.5 bg-primary" />
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-sky-50/50 px-5 py-4"><h2 className="font-semibold text-slate-900">Edit weekly hours</h2><p className="text-xs text-slate-500">Times use the configured platform timezone.</p></header>
      <div className="divide-y divide-slate-100">{WEEK_ORDER.map((dayOfWeek) => {
        const day = DAYS[dayOfWeek] ?? "";
        const ranges = schedule[dayOfWeek] ?? [];
        return <div key={day} className="flex flex-col gap-3 px-5 py-4">
          <div className="flex items-center justify-between"><span className={`text-sm font-semibold ${ranges.length ? "text-slate-900" : "text-slate-400"}`}>{day}</span><button type="button" onClick={() => setSchedule((current) => current.map((value, index) => index === dayOfWeek ? (value.length ? [] : [{ ...EMPTY_RANGE }]) : value))} className="text-xs font-semibold text-sky-700 hover:underline">{ranges.length ? "Close day" : "Add hours"}</button></div>
          {ranges.map((range, rangeIndex) => <div key={`${day}-${rangeIndex}`} className="flex flex-wrap items-center gap-2 sm:pl-3"><input aria-label={`${day} range ${rangeIndex + 1} start`} type="time" value={range.startTime} onChange={(event) => setSchedule((current) => current.map((value, index) => index === dayOfWeek ? value.map((item, itemIndex) => itemIndex === rangeIndex ? { ...item, startTime: event.target.value } : item) : value))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" /><span className="text-xs text-slate-400">to</span><input aria-label={`${day} range ${rangeIndex + 1} end`} type="time" value={range.endTime} onChange={(event) => setSchedule((current) => current.map((value, index) => index === dayOfWeek ? value.map((item, itemIndex) => itemIndex === rangeIndex ? { ...item, endTime: event.target.value } : item) : value))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" /><button type="button" aria-label={`Remove ${day} range ${rangeIndex + 1}`} onClick={() => setSchedule((current) => current.map((value, index) => index === dayOfWeek ? value.filter((_, itemIndex) => itemIndex !== rangeIndex) : value))} className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100">Remove</button></div>)}
          {ranges.length > 0 && <button type="button" onClick={() => setSchedule((current) => current.map((value, index) => index === dayOfWeek ? [...value, { ...EMPTY_RANGE }] : value))} className="w-fit text-xs font-semibold text-sky-700 hover:underline sm:pl-3">Add another time range</button>}
        </div>;
      })}</div>
    </Card>}
  </div>;
}
