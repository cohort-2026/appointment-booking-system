import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { apiFetch } from "../../../services/api";
import { AppointmentCard } from "@/components/appointment/AppointmentCard";
import type { Appointment } from "@/components/appointment/AppointmentCard";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AppointmentResponse = { success: boolean; upcoming: Appointment[]; past: Appointment[] };
type Filter = "Upcoming" | "Past" | "All";

export default function Appointments() {
  const [data, setData] = useState<AppointmentResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("Upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = () => {
    setLoading(true); setError(null);
    void apiFetch<AppointmentResponse>("/customer/appointments").then(setData).catch((r) => setError(r instanceof Error ? r.message : "Failed")).finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAppointments(); }, []);

  const appointments = useMemo(() => {
    const upcoming = data?.upcoming ?? []; const past = data?.past ?? [];
    return filter === "Upcoming" ? upcoming : filter === "Past" ? past : [...upcoming, ...past];
  }, [data, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-sky-700">YOUR SCHEDULE</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">My appointments</h1>
          <p className="mt-2 text-sm text-slate-500">Review your upcoming and past visits.</p>
        </div>
        <Button asChild className="w-fit bg-sky-600 hover:bg-sky-700"><Link to="/dashboard/customer/book">＋ Find a service</Link></Button>
      </div>

      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="w-full sm:w-auto">
            <TabsList className="bg-slate-100"><TabsTrigger value="Upcoming">Upcoming</TabsTrigger><TabsTrigger value="Past">Past</TabsTrigger><TabsTrigger value="All">All</TabsTrigger></TabsList>
          </Tabs>
          <p className="text-sm text-slate-500">{loading ? "Loading…" : `${appointments.length} ${appointments.length === 1 ? "appointment" : "appointments"}`}</p>
        </div>

        {error && <ErrorState message={error} onRetry={fetchAppointments} />}

        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-24 rounded-xl bg-slate-100" />)}</div>
          ) : appointments.length ? (
            <div className="divide-y divide-slate-100">{appointments.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} href={`/dashboard/customer/appointments/${encodeURIComponent(appointment.id)}`} />)}</div>
          ) : (
            <EmptyState icon={Calendar} title={`No ${filter.toLowerCase()} appointments`} description="Your appointments will appear here when they are available." action={filter !== "Past" ? <Button asChild className="bg-sky-600 hover:bg-sky-700"><Link to="/dashboard/customer/book">Explore services</Link></Button> : undefined} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}