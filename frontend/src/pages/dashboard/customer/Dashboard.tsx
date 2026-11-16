import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";

type Appointment = {
  id: string;
  time: string;
  service: string;
  providerName: string;
  staffName: string | null;
  staffTitle: string | null;
  durationMinutes: number;
  price: string | null;
  status: string;
};

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

export default function CustomerDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const bookedAppointmentId = new URLSearchParams(location.search).get("bookedAppointment");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [justBookedAppointment, setJustBookedAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch<DashboardResponse>("/customer/dashboard")
      .then((response) => {
        if (active) setDashboard(response);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Dashboard information could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
    <div className="space-y-7">
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
        <Link
          to="/dashboard/customer/book"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-300"
        >
          ＋ Find a service
        </Link>
      </section>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load dashboard information: {error}
        </div>
      )}

      {bookedAppointmentId && justBookedAppointment && (
        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm" aria-label="Newly booked appointment">
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-4 sm:px-6">
            <p className="text-sm font-bold text-emerald-900">Your appointment is booked</p>
            <p className="mt-1 text-sm text-emerald-800">Here are the details you selected.</p>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Service</p><p className="mt-1 font-semibold text-slate-900">{justBookedAppointment.service}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Provider</p><p className="mt-1 font-semibold text-slate-900">{justBookedAppointment.providerName}</p></div>
            {justBookedAppointment.staffName && <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned staff</p><p className="mt-1 font-semibold text-slate-900">{justBookedAppointment.staffName}{justBookedAppointment.staffTitle ? ` · ${justBookedAppointment.staffTitle}` : ""}</p></div>}
            <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Date and time</p><p className="mt-1 font-semibold text-slate-900">{new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(new Date(justBookedAppointment.time))}</p></div>
            <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Duration</p><p className="mt-1 font-semibold text-slate-900">{justBookedAppointment.durationMinutes} minutes</p></div>
            {justBookedAppointment.price !== null && <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Price</p><p className="mt-1 font-semibold text-slate-900">R{justBookedAppointment.price}</p></div>}
            <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p><p className="mt-1 font-semibold capitalize text-slate-900">{justBookedAppointment.status.toLowerCase().replaceAll("_", " ")}</p></div>
          </div>
          <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
            <Link to={`/dashboard/customer/appointments/${encodeURIComponent(justBookedAppointment.id)}`} className="text-sm font-semibold text-sky-700 hover:text-sky-900">Open appointment details →</Link>
          </div>
        </section>
      )}

      <section aria-label="Appointment summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statItems.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{item.label} appointments</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              {loading ? <span className="inline-block h-9 w-12 animate-pulse rounded bg-slate-100" /> : item.value ?? "—"}
            </p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight">Quick links</h2>
          <p className="mt-1 text-sm text-slate-500">Go directly to the things you need.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {dashboardLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
            >
              <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl bg-sky-50 text-lg text-sky-700">
                {item.icon}
              </span>
              <h3 className="mt-5 text-lg font-bold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
              <span className="mt-5 inline-block text-sm font-semibold text-sky-700">Open page →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Upcoming appointments</h2>
            <p className="mt-1 text-sm text-slate-500">Your next scheduled visits.</p>
          </div>
          <Link to="/dashboard/customer/appointments" className="text-sm font-semibold text-sky-700 hover:text-sky-900">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 p-5" aria-label="Loading appointments">
            {[0, 1].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : dashboard?.upcomingAppointments.length ? (
          <div className="divide-y divide-slate-100">
            {dashboard.upcomingAppointments.map((appointment) => (
              <Link
                key={appointment.id}
                to={`/dashboard/customer/appointments/${encodeURIComponent(appointment.id)}`}
                className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div>
                  <p className="font-semibold">{appointment.service}</p>
                  <p className="mt-1 text-sm text-slate-500">with {appointment.providerName}</p>
                  {appointment.staffName && (
                    <p className="mt-1 text-sm text-slate-500">
                      Staff: {appointment.staffName}{appointment.staffTitle ? ` · ${appointment.staffTitle}` : ""}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-slate-500">
                    Duration: {appointment.durationMinutes} minutes
                    {appointment.price !== null ? ` · Price: R${appointment.price}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <p className="text-sm text-slate-600">
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(appointment.time))}
                  </p>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {appointment.status.toLowerCase().replaceAll("_", " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <h3 className="font-semibold text-slate-900">No upcoming appointments</h3>
            <p className="mt-2 text-sm text-slate-500">Once you book a visit, it will appear here.</p>
            <Link to="/dashboard/customer/book" className="mt-4 inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900">
              Explore services →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
