import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";
import { ArrowRight, Calendar, CalendarDays, CalendarCheck, CalendarClock, CalendarX, Search, UserRound } from "lucide-react";

import { NextAppointmentBanner, type UpcomingAppointment } from "@/components/booking/NextAppointmentBanner";
import { AppointmentCard } from "@/components/appointment/AppointmentCard"
import { AppointmentList } from "@/components/appointment/AppointmentList"
import type { Appointment } from "@/components/appointment/AppointmentCard"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

type DashboardResponse = {
  success: boolean;
  stats: {
    upcomingAppointments: number;
    todayAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
  };
  upcomingAppointments: UpcomingAppointment[];
};

const dashboardLinks = [
  {
    to: "/dashboard/customer/book",
    icon: Search,
    header: "from-sky-400 via-sky-500 to-blue-700",
    iconColor: "bg-sky-50 text-sky-700",
    title: "Find a service",
    description: "Browse providers and the services they offer.",
  },
  {
    to: "/dashboard/customer/appointments",
    icon: CalendarDays,
    header: "from-sky-400 via-sky-500 to-blue-700",
    iconColor: "bg-sky-50 text-sky-700",
    title: "My appointments",
    description: "Review your upcoming and past visits.",
  },
  {
    to: "/dashboard/customer/profile",
    icon: UserRound,
    header: "from-teal-400 via-teal-500 to-emerald-700",
    iconColor: "bg-teal-50 text-teal-700",
    title: "My profile",
    description: "View your personal and account details.",
  },
];

function QuickLinkCard({
  to,
  icon,
  title,
  description,
  header,
  iconColor,
}: (typeof dashboardLinks)[number]) {
  const Icon = icon;
  return (
    <Link
      to={to}
      className="group block h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
    >
      <Card className="h-full gap-0 overflow-hidden rounded-lg py-0 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-slate-200/60">
        <div className={`relative h-14 overflow-hidden bg-linear-to-br ${header}`}>
          <span aria-hidden="true" className="absolute -right-7 -top-10 size-28 rounded-full bg-white/20" />
          <span aria-hidden="true" className="absolute right-16 top-9 size-8 rounded-full bg-white/10" />
        </div>
        <CardContent className="flex flex-1 flex-col px-5 pb-5">
          <span className={`mt-4 grid size-11 place-items-center rounded-lg ${iconColor}`}><Icon className="size-5" aria-hidden="true" /></span>
          <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-sky-700">Open <ArrowRight className="size-4" aria-hidden="true" /></span>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function CustomerDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const bookedAppointmentId = new URLSearchParams(location.search).get("bookedAppointment");

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [justBookedAppointment, setJustBookedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [retryCount, setRetryCount] = useState(0);

  function retryDashboard() {
    setLoading(true);
    setError(null);
    setRetryCount((count) => count + 1);
  }

  useEffect(() => {
    let active = true;
    void apiFetch<DashboardResponse>("/customer/dashboard")
      .then((response) => {
        if (active) setDashboard(response);
      })
      .catch((reason: unknown) => {
        if (active) {
          setDashboard(null);
          setError(reason instanceof Error ? reason.message : "Dashboard information could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryCount]);

  useEffect(() => {
    if (!bookedAppointmentId) return;

    let active = true;
    void apiFetch<{ success: boolean; upcoming: Appointment[]; past: Appointment[] }>("/customer/appointments")
      .then((response) => {
        if (!active) return;
        const appointments = [...(response.upcoming ?? []), ...(response.past ?? [])];
        setJustBookedAppointment(appointments.find((item) => item.id === bookedAppointmentId) ?? null);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Your booking details could not be loaded.");
        }
      });

    return () => {
      active = false;
    };
  }, [bookedAppointmentId]);

  const stats = dashboard?.stats;
  const statItems = [
    { label: "Upcoming", value: stats?.upcomingAppointments, icon: CalendarClock, header: "from-sky-400 via-sky-500 to-blue-700", iconColor: "bg-sky-50 text-sky-700" },
    { label: "Today", value: stats?.todayAppointments, icon: CalendarDays, header: "from-sky-400 via-sky-500 to-blue-700", iconColor: "bg-sky-50 text-sky-700" },
    { label: "Completed", value: stats?.completedAppointments, icon: CalendarCheck, header: "from-teal-400 via-teal-500 to-emerald-700", iconColor: "bg-teal-50 text-teal-700" },
    { label: "Cancelled", value: stats?.cancelledAppointments, icon: CalendarX, header: "from-rose-300 via-rose-400 to-rose-600", iconColor: "bg-rose-50 text-rose-700" },
  ];

  return (
      <div className="w-full space-y-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-sky-700">Your account</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
        </div>
        {dashboard?.upcomingAppointments[0] && (
          <NextAppointmentBanner appointment={dashboard.upcomingAppointments[0]} />
        )}

        {/* Global Error State */}
        {error && (
          <ErrorState
            message={error}
            onRetry={retryDashboard}
          />
        )}

        {/* Just Booked Section */}
        {bookedAppointmentId && justBookedAppointment && (
          <Card className="gap-0 overflow-hidden rounded-lg border-emerald-200 py-0 shadow-sm">
            <CardHeader className="border-b border-emerald-100 bg-linear-to-r from-teal-50 to-emerald-50 px-5 py-4 sm:px-6">
              <CardTitle className="text-sm font-bold text-emerald-900">Your appointment is booked</CardTitle>
              <p className="text-sm text-emerald-800">Here are the details you selected.</p>
            </CardHeader>
            <CardContent className="p-0">
              <AppointmentCard
                appointment={justBookedAppointment}
                href={`/dashboard/customer/appointments/${encodeURIComponent(justBookedAppointment.id)}`}
                variant="detail"
              />
            </CardContent>
            <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
              <Link to={`/dashboard/customer/appointments/${encodeURIComponent(justBookedAppointment.id)}`} className="text-sm font-semibold text-sky-700 hover:text-sky-900">
                Open appointment details →
              </Link>
            </div>
          </Card>
        )}

        {/* Stats Section */}
        <section aria-label="Appointment summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statItems.map((item) => {
            const Icon = item.icon;
            return <Card key={item.label} className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
              <div className={`h-1.5 bg-linear-to-r ${item.header}`} />
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div><p className="text-sm font-medium text-muted-foreground">{item.label} appointments</p>
                  {loading ? <Skeleton className="mt-2 h-9 w-12 rounded" /> : <p className="mt-2 text-3xl font-bold text-slate-900">{item.value ?? "—"}</p>}</div>
                <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${item.iconColor}`}><Icon className="size-5" aria-hidden="true" /></span>
              </CardContent>
            </Card>;
          })}
        </section>

        {/* Quick Links Section */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold tracking-tight">Quick links</h2>
            <p className="mt-1 text-sm text-slate-500">Go directly to the things you need.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {dashboardLinks.map((item) => (
              <QuickLinkCard key={item.to} {...item} />
            ))}
          </div>
        </section>

        {/* Upcoming Appointments Section */}
        <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
          <div className="h-1.5 bg-linear-to-r from-sky-400 via-sky-500 to-blue-700" />
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-sky-50/50 px-5 py-4 sm:px-6">
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">Upcoming appointments</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Your next scheduled visits.</p>
            </div>
            <Link to="/dashboard/customer/appointments" className="text-sm font-semibold text-sky-700 hover:text-sky-900">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-5" aria-label="Loading appointments">
                {[0, 1].map((item) => <Skeleton key={item} className="h-16 rounded-xl bg-slate-100" />)}
              </div>
            ) : dashboard?.upcomingAppointments.length ? (
              <AppointmentList appointments={dashboard.upcomingAppointments} />
            ) : dashboard ? (
              <EmptyState
                icon={Calendar}
                title="No upcoming appointments"
                description="Once you book a visit, it will appear here."
                action={
                  <Button asChild className="bg-sky-600 hover:bg-sky-700">
                    <Link to="/dashboard/customer/book">Explore services</Link>
                  </Button>
                }
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
  );
}
