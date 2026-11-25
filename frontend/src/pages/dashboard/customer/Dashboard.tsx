import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";
import { Calendar } from "lucide-react";

import { StatCard } from "@/components/dashboard/StatCard"
import { AppointmentCard } from "@/components/appointment/AppointmentCard"
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
  upcomingAppointments: Appointment[];
};

const dashboardLinks = [
  {
    to: "/dashboard/customer/book",
    icon: "＋",
    title: "Find a service",
    description: "Browse providers and the services they offer.",
  },
  {
    to: "/dashboard/customer/appointments",
    icon: "▣",
    title: "My appointments",
    description: "Review your upcoming and past visits.",
  },
  {
    to: "/dashboard/customer/profile",
    icon: "◈",
    title: "My profile",
    description: "View your personal and account details.",
  },
];

function QuickLinkCard({
  to,
  icon,
  title,
  description,
}: (typeof dashboardLinks)[number]) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-lg font-bold text-sky-700">
        {icon}
      </div>
      <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
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
    { label: "Upcoming", value: stats?.upcomingAppointments },
    { label: "Today", value: stats?.todayAppointments },
    { label: "Completed", value: stats?.completedAppointments },
    { label: "Cancelled", value: stats?.cancelledAppointments },
  ];

  return (
      <div className="w-full space-y-7">
        {/* Hero Section */}
        <section className="flex flex-col justify-between gap-5 rounded-3xl bg-gradient-to-br from-[#0B1220] via-[#12253A] to-[#164E63] px-6 py-8 text-white sm:px-9 sm:py-10 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-sky-300">CUSTOMER DASHBOARD</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Manage your appointments and discover services.
            </p>
          </div>
          <Button asChild variant="secondary" className="w-fit rounded-xl bg-sky-400 font-bold text-slate-950 hover:bg-sky-300">
            <Link to="/dashboard/customer/book">＋ Find a service</Link>
          </Button>
        </section>

        {/* Global Error State */}
        {error && (
          <ErrorState
            message={error}
            onRetry={retryDashboard}
          />
        )}

        {/* Just Booked Section */}
        {bookedAppointmentId && justBookedAppointment && (
          <Card className="overflow-hidden rounded-2xl border-emerald-200 shadow-sm">
            <CardHeader className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 sm:px-6">
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
          {statItems.map((item) => (
            <StatCard key={item.label} label={item.label} value={item.value} loading={loading} />
          ))}
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
        <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
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
              <div className="divide-y divide-slate-100">
                {dashboard.upcomingAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    href={`/dashboard/customer/appointments/${encodeURIComponent(appointment.id)}`}
                  />
                ))}
              </div>
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
