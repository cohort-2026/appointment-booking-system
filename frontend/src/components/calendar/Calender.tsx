// src/components/calendar/Calender.tsx
import { useEffect, useState } from "react";
import WeekView, { type Appointment } from "./WeekView";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { sastDate } from "../../lib/bookingTime";
import { apiFetch } from "../../services/api";
import type { CalendarAvailability } from "./calendarLayout";
import { Skeleton } from "../ui/skeleton";

type CalenderProps = {
  appointments: Appointment[];
  onSaved: () => void;
};

export default function Calender({ appointments, onSaved }: CalenderProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<CalendarAvailability[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    void apiFetch<{ availability: CalendarAvailability[] }>("/provider/availability")
      .then(result => { if (active) { setAvailability(result.availability); setError(null); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load availability."); });
    return () => { active = false; };
  }, [retry]);

  // Navigation logic
  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate.getTime() - 7 * 86_400_000);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate.getTime() + 7 * 86_400_000);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Format for the header title (e.g., "Oct 22 - Oct 28, 2023")
  const getWeekRangeString = () => {
    const start = new Date(`${sastDate(currentDate)}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    
    return `${start.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${end.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>
          <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden">
            <button type="button" aria-label="Previous week" title="Previous week" onClick={handlePreviousWeek} className="p-2 hover:bg-slate-50 border-r border-slate-300 text-slate-600">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button type="button" aria-label="Next week" title="Next week" onClick={handleNextWeek} className="p-2 hover:bg-slate-50 text-slate-600">
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <h2 className="text-lg font-bold text-slate-800">
          {getWeekRangeString()}
        </h2>
      </div>

      {/* The actual calendar grid */}
      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">Availability could not be loaded: {error} <button type="button" className="font-semibold underline" onClick={() => { setError(null); setRetry(value => value + 1); }}>Try again</button></div>
        : availability === null ? <div role="status" aria-label="Loading availability" aria-busy="true" className="space-y-4 rounded-lg border bg-white p-5"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
        : <WeekView currentDate={currentDate} appointments={appointments} availability={availability} onSaved={onSaved} />}
    </div>
  );
}