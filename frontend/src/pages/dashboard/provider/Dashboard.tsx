import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";
import { ArrowRight, BriefcaseBusiness, CalendarCheck, CalendarClock, CalendarDays, CalendarX, Clock3, CreditCard, UserRound, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ACCENT_FROM = "#0EA5E9";
const ACCENT_TO = "#38BDF8";

type DashboardStats = {
  todayBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
};

type AppointmentItem = {
  id: string;
  time: string;
  customerName: string;
  service: string;
  status: string;
};

type SubscriptionInfo = {
  tier: string;
  status: string;
  paymentStatus: string;
  dailyAppointmentLimit?: number | null;
  monthlyPrice?: number | string | null;
  nextBillingDate?: string | null;
};

type DashboardResponse = {
  success: boolean;
  stats: DashboardStats;
  upcomingAppointments: AppointmentItem[];
  subscription: SubscriptionInfo | null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const providerName = authUser?.soleProvider?.displayName?.trim()
    || (authUser ? `${authUser.firstName} ${authUser.lastName ?? ""}`.trim() : "");

  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentItem[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    if (authUser.role !== "SOLE_PROVIDER") {
      toast.error("You do not have permission to access this dashboard.");
      navigate("/login", { replace: true });
      return;
    }

    const fetchDashboard = async () => {
      setIsLoading(true);
      setDashboardError(null);
      try {
        const response = await apiFetch<DashboardResponse>("/provider/dashboard");
        if (!response.success) {
          throw new Error("The server could not load provider dashboard data.");
        }
        setStats(response.stats ?? { todayBookings: 0, upcomingBookings: 0, completedBookings: 0, cancelledBookings: 0 });
        setUpcomingAppointments(response.upcomingAppointments ?? []);
        setSubscription(response.subscription ?? null);
      } catch (error) {
        console.error("Provider dashboard fetch failed:", error);
        const message = error instanceof Error ? error.message : "Unable to load dashboard data.";
        setDashboardError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDashboard();
  }, [authUser, navigate, reloadCount]);

  return (
    <>
          {dashboardError && (
            <div className="mb-6 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
              <p role="alert">Dashboard data could not be loaded: {dashboardError}</p>
              <button
                type="button"
                onClick={() => setReloadCount((count) => count + 1)}
                className="w-fit rounded-md border border-red-300 px-3 py-2 font-semibold hover:bg-red-100"
              >
                Retry
              </button>
            </div>
          )}
          {/* Welcome */}
          <section className="relative mb-8 overflow-hidden rounded-lg bg-[#0B1220] p-6 text-white sm:p-8">
            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-white/20" />
            <span aria-hidden="true" className="pointer-events-none absolute right-16 top-14 size-10 rounded-full bg-white/10" />
            <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-sm font-medium text-sky-400">
                  Welcome back
                </p>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  {providerName}
                </h2>
                <p className="mt-2 max-w-xl text-sm text-slate-300">
                  Manage your services, availability and customer
                  appointments from one place.
                </p>
              </div>

              <div className="flex w-fit flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-lg px-5 py-3 text-sm font-semibold text-[#0F172A] shadow-[0_10px_30px_-8px_rgba(14,165,233,0.6)] transition hover:brightness-105"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT_TO}, ${ACCENT_FROM})`,
                  }}
                  onClick={() => navigate("/dashboard/provider/services")}
                >
                  Add service
                </button>

                <button
                  type="button"
                  className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                  onClick={() => navigate("/dashboard/provider/availability")}
                >
                  Set availability
                </button>
              </div>
            </div>
          </section>

          {/* Stats */}
          {isLoading ? (
            <section className="mb-8 grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading dashboard statistics">
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-32 rounded-2xl border border-slate-200 bg-white p-5"><div className="h-4 w-2/3 rounded bg-slate-100" /><div className="mt-4 h-8 w-1/3 rounded bg-slate-200" /><div className="mt-3 h-3 w-1/2 rounded bg-slate-100" /></div>)}
            </section>
          ) : !dashboardError && (
          <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Today's bookings"
              value={stats.todayBookings}
              description="Appointments scheduled today"
              icon={CalendarDays}
              accent="sky"
            />

            <StatCard
              title="Upcoming"
              value={stats.upcomingBookings}
              description="Future confirmed appointments"
              icon={CalendarClock}
              accent="sky"
            />

            <StatCard
              title="Completed"
              value={stats.completedBookings}
              description="Completed appointments"
              icon={CalendarCheck}
              accent="teal"
            />

            <StatCard
              title="Cancelled"
              value={stats.cancelledBookings}
              description="Cancelled appointments"
              icon={CalendarX}
              accent="rose"
            />
          </section>
          )}

          {/* Main grid */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Appointments */}
            <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm xl:col-span-2">
              <div className="h-1.5 bg-primary" />
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-sky-50/50 p-5">
                <div>
                  <h2 className="font-bold">Upcoming appointments</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Your next customer bookings
                  </p>
                </div>

                <button
                  onClick={() => navigate("/dashboard/provider/appointments")}
                  className="text-sm font-semibold hover:underline"
                  style={{ color: ACCENT_FROM }}
                >
                  View all
                </button>
              </div>

              {isLoading ? (
                <div className="divide-y divide-slate-100 p-5" role="status" aria-label="Loading upcoming appointments">
                  {Array.from({ length: 3 }, (_, index) => <div key={index} className="flex animate-pulse items-center gap-4 py-4"><div className="h-4 w-12 rounded bg-slate-100" /><div className="h-10 w-10 rounded-full bg-slate-200" /><div className="flex-1 space-y-2"><div className="h-4 w-1/3 rounded bg-slate-200" /><div className="h-3 w-1/4 rounded bg-slate-100" /></div></div>)}
                </div>
              ) : dashboardError ? (
                <p className="p-6 text-sm text-slate-500">Dashboard data is unavailable.</p>
              ) : upcomingAppointments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><CalendarDays className="size-6" aria-hidden="true" /></div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-900">
                    No upcoming appointments
                  </h3>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    Customer bookings will appear here once they book your
                    services.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-5">
                  {upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sm font-semibold text-sky-700">
                          {appointment.customerName
                            .split(" ")
                            .map((name) => name[0])
                            .join("")
                            .slice(0, 2)}
                        </div>

                        <div className="min-w-0">
                          <p className="break-words font-semibold">{appointment.customerName}</p>
                          <p className="break-words text-sm text-slate-500">
                            {appointment.service}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <time dateTime={appointment.time} className="text-sm font-medium text-slate-600">{new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.time))} SAST</time>
                        <span className="w-fit rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">{appointment.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Package */}
            <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
              <div className="h-1.5 bg-primary" />
              <div className="border-b border-slate-100 bg-sky-50/50 p-5">
                <h2 className="font-bold">Your package</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current plan and limits
                </p>
              </div>

              <CardContent className="p-5">
                {isLoading ? (
                  <div className="animate-pulse space-y-4" role="status" aria-label="Loading subscription">
                    <div className="h-6 w-1/2 rounded bg-slate-200" />
                    <div className="h-4 w-2/3 rounded bg-slate-100" />
                    <div className="h-4 w-full rounded bg-slate-100" />
                    <div className="h-4 w-full rounded bg-slate-100" />
                  </div>
                ) : dashboardError ? <p className="text-sm text-slate-500">Subscription data is unavailable.</p> : subscription ? (
                <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-sky-50 text-sky-700"><CreditCard className="size-5" aria-hidden="true" /></span><h3 className="text-xl font-bold">{subscription.tier}</h3></div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {subscription.status}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {subscription.tier === "BASIC" ? "Free" : "Paid"}
                </p>

                <div className="mt-5 space-y-3">
                  {subscription.tier === "GROWTH" && subscription.monthlyPrice !== undefined && (
                    <PackageLimit label="Monthly price" value={`R${Number(subscription.monthlyPrice).toFixed(2)} / month`} />
                  )}
                  <PackageLimit
                    label="Daily bookings"
                    value={String(subscription.dailyAppointmentLimit ?? "Not set")}
                  />
                  {subscription.tier === "GROWTH" && (
                    <PackageLimit label="Next billing" value={subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : "Not scheduled"} />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/dashboard/provider/subscription")}
                  className="mt-5 w-full rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                >
                  View subscription
                </button>
                </>
                ) : <p className="text-sm text-slate-500">No active subscription found.</p>}
              </CardContent>
            </Card>
          </div>

          {/* Provider management */}
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAction
              icon={BriefcaseBusiness}
              accent="sky"
              label="My services"
              description="Add and manage the services customers can book."
              onClick={() => navigate("/dashboard/provider/services")}
            />

            <QuickAction
              icon={Clock3}
              accent="sky"
              label="Availability"
              description="Set the days and hours when customers can book."
              onClick={() => navigate("/dashboard/provider/availability")}
            />

            <QuickAction
              icon={CalendarDays}
              accent="teal"
              label="Appointments"
              description="View, complete, cancel and reschedule bookings."
              onClick={() => navigate("/dashboard/provider/appointments")}
            />

            <QuickAction
              icon={UserRound}
              accent="rose"
              label="My profile"
              description="Review your account and public provider details."
              onClick={() => navigate("/dashboard/provider/profile")}
            />

            <QuickAction
              icon={CreditCard}
              accent="sky"
              label="Subscription"
              description="Review your current plan and billing details."
              onClick={() => navigate("/dashboard/provider/subscription")}
            />
          </section>
    </>
  );
}

const accents = {
  sky: { header: "from-sky-400 via-sky-500 to-blue-700", icon: "bg-sky-50 text-sky-700" },
  teal: { header: "from-teal-400 via-teal-500 to-emerald-700", icon: "bg-teal-50 text-teal-700" },
  rose: { header: "from-rose-300 via-rose-400 to-rose-600", icon: "bg-rose-50 text-rose-700" },
} as const;

function StatCard({
  title,
  value,
  description,
  icon,
  accent,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  accent: keyof typeof accents;
}) {
  const Icon = icon;
  return (
    <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
      <div className={`h-1.5 bg-linear-to-r ${accents[accent].header}`} />
      <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>

        <div className={`grid size-10 shrink-0 place-items-center rounded-lg ${accents[accent].icon}`}><Icon className="size-5" aria-hidden="true" /></div>
      </div>
      </CardContent>
    </Card>
  );
}

function PackageLimit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function QuickAction({
  icon,
  accent,
  label,
  description,
  onClick,
}: {
  icon: LucideIcon;
  accent: keyof typeof accents;
  label: string;
  description: string;
  onClick: () => void;
}) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group h-full rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
    >
      <Card className="h-full gap-0 overflow-hidden rounded-lg py-0 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-slate-200/60">
        <div className="h-1.5 bg-primary" />
        <CardContent className="flex flex-1 flex-col px-5 pb-5">
          <span className={`mt-4 grid size-11 place-items-center rounded-lg ${accents[accent].icon}`}><Icon className="size-5" aria-hidden="true" /></span>
          <h3 className="mt-4 font-semibold text-slate-900">{label}</h3>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-sky-700">Open <ArrowRight className="size-4" aria-hidden="true" /></span>
        </CardContent>
      </Card>
    </button>
  );
}