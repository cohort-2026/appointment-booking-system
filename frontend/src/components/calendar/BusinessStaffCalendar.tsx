import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "../../services/api";
import { sastDate } from "../../lib/bookingTime";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import WeekView from "./WeekView";
import type { CalendarAppointment, CalendarAvailability } from "./calendarLayout";

type CalendarData = { availability: CalendarAvailability[]; appointments: CalendarAppointment[] };

export default function BusinessStaffCalendar({ staffId }: { staffId: string }) {
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState<CalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    void apiFetch<CalendarData>(`/business/staff/${encodeURIComponent(staffId)}/calendar`)
      .then(result => { if (active) { setData(result); setError(null); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load staff calendar."); });
    return () => { active = false; };
  }, [staffId, retry]);

  const start = new Date(`${sastDate(date)}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(start.getTime() + 6 * 86_400_000);
  const format = (day: Date) => day.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return <div className="mt-6 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setDate(new Date())}>Today</Button>
        <Button type="button" variant="outline" size="icon" aria-label="Previous week" title="Previous week" onClick={() => setDate(current => new Date(current.getTime() - 7 * 86_400_000))}><ChevronLeft /></Button>
        <Button type="button" variant="outline" size="icon" aria-label="Next week" title="Next week" onClick={() => setDate(current => new Date(current.getTime() + 7 * 86_400_000))}><ChevronRight /></Button>
      </div>
      <h4 className="text-sm font-semibold text-slate-800">{format(start)} - {format(end)}</h4>
    </div>
    {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} <button type="button" className="font-semibold underline" onClick={() => { setError(null); setData(null); setRetry(current => current + 1); }}>Try again</button></div>
      : !data ? <div role="status" aria-label="Loading staff calendar" className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div>
      : <WeekView currentDate={date} appointments={data.appointments} availability={data.availability} role="business" onSaved={() => { setData(null); setRetry(current => current + 1); }} />}
  </div>;
}