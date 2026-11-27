import AppointmentHistoryDrawer from "../../../components/booking/AppointmentHistoryDrawer";
// src/pages/dashboard/provider/Appointments.tsx
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../../services/api";
import Calender from "../../../components/calendar/Calender";
import { CalendarDays, Clock3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatSast } from "../../../lib/bookingTime";

type Appointment = {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  date: string; // ISO string
  endsAt: string | null;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
};

const appointmentTabs = ["UPCOMING", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<"UPCOMING" | "COMPLETED" | "CANCELLED" | "NO_SHOW">("UPCOMING");
  const [viewMode, setViewMode] = useState<"LIST" | "CALENDAR">("CALENDAR");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void apiFetch<Appointment[]>(`/provider/appointments?status=${activeTab}`)
      .then((data) => {
        if (isMounted) { setAppointments(data); setLoadError(null); }
      })
      .catch((error: unknown) => {
        console.error("Provider appointments fetch failed:", error);
        if (isMounted) {
          setAppointments([]);
          setLoadError(error instanceof Error ? error.message : "Failed to load appointments");
          toast.error(error instanceof Error ? error.message : "Failed to load appointments");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeTab, refreshKey]);

  return (
    // Changed max-w-5xl to max-w-7xl to give the calendar more room
    <div className="max-w-7xl mx-auto">
      
      {/* Header with appointment status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500 mt-1">View and manage your customer bookings.</p>
        </div>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-600">
          Appointment status
          <select
            value={activeTab}
            onChange={(event) => {
              const nextTab = appointmentTabs.find((tab) => tab === event.target.value);
              if (nextTab) {
                setIsLoading(true);
                setActiveTab(nextTab);
              }
            }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {appointmentTabs.map((tab) => (
              <option key={tab} value={tab}>
                {tab === "NO_SHOW" ? "No-show" : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Toggle between List and Calendar */}
      <div className="mb-6">
        <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
          <button 
            onClick={() => setViewMode("LIST")}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition ${viewMode === "LIST" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            List View
          </button>
          <button 
            onClick={() => setViewMode("CALENDAR")}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition ${viewMode === "CALENDAR" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            Calendar View
          </button>
        </div>
      </div>

      {/* Conditionally Render based on View Mode */}
      {loadError && !isLoading ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">{loadError} <button type="button" className="ml-2 font-semibold underline" onClick={() => { setIsLoading(true); setRefreshKey(current => current + 1); }}>Try again</button></div> : viewMode === "CALENDAR" ? (
        isLoading ? (
          <div className="animate-pulse space-y-4" role="status" aria-label="Loading appointment calendar">
            <div className="h-12 rounded-lg bg-slate-100" />
            <div className="h-[min(700px,calc(100vh_-_20rem))] min-h-[360px] rounded-2xl border border-slate-200 bg-white" />
          </div>
        ) : <Calender appointments={appointments} onSaved={() => { setIsLoading(true); setRefreshKey(current => current + 1); }} />
      ) : (
        <>
          {/* List */}
          <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
            <div className="h-1.5 bg-primary" />
            <div className="border-b border-slate-100 bg-sky-50/50 px-5 py-4"><h2 className="font-semibold text-slate-900">Appointments</h2><p className="mt-1 text-sm text-slate-500">{appointments.length} {appointments.length === 1 ? "appointment" : "appointments"}</p></div>
            {isLoading ? (
              <div className="divide-y divide-slate-100 p-5" role="status" aria-label="Loading appointments">
                {Array.from({ length: 4 }, (_, index) => <div key={index} className="flex animate-pulse items-center gap-4 py-4"><div className="h-16 w-16 rounded-xl bg-slate-100" /><div className="flex-1 space-y-3"><div className="h-4 w-1/3 rounded bg-slate-200" /><div className="h-3 w-1/2 rounded bg-slate-100" /></div><div className="h-8 w-24 rounded bg-slate-100" /></div>)}
              </div>
            ) : appointments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-4">
                  <CalendarDays className="size-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No {activeTab.toLowerCase()} appointments</h3>
                <p className="text-slate-500 max-w-sm mx-auto">When customers book you, they will appear here.</p>
              </div>
            ) : (
              <CardContent className="space-y-3 p-5">
                {appointments.map((apt) => {
                  const dateObj = new Date(apt.date);
                  return (
                    <div key={apt.id} className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center">
                      <div className="flex items-start gap-4">
                        {/* Date Block */}
                        <div className="flex flex-col items-center justify-center bg-sky-50 text-sky-700 rounded-xl px-3 py-2 min-w-[70px]">
                          <span className="text-xs font-semibold uppercase">{dateObj.toLocaleString('en-ZA', { month: 'short', timeZone: 'Africa/Johannesburg' })}</span>
                          <span className="text-xl font-bold leading-none">{dateObj.toLocaleString('en-ZA', { day: 'numeric', timeZone: 'Africa/Johannesburg' })}</span>
                        </div>
                        
                        {/* Details */}
                        <div>
                          <h3 className="font-semibold text-slate-900">{apt.serviceName}</h3>
                          <p className="text-sm text-slate-600 mt-0.5">with {apt.customerName}</p>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Clock3 className="size-3.5" aria-hidden="true" /> {formatSast(apt.date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold capitalize text-sky-700">{apt.status.toLowerCase().replaceAll("_", " ")}</span>
                        <AppointmentHistoryDrawer role="provider" id={apt.id} startsAt={apt.date}
                          title={`${apt.serviceName} · ${apt.customerName}`}
                          onSaved={() => { setIsLoading(true); setRefreshKey(current => current + 1); }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}