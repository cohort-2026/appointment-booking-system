import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

const ACCENT_FROM = "#0EA5E9";
const ACCENT_TO = "#38BDF8";

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  role: string;
};

type PlatformStats = {
  totalUsers: number;
  totalBusinesses: number;
  totalProviders: number;
  totalBookingsThisMonth: number;
};

const signups = [
  {
    name: "Riverside Wellness",
    type: "Business",
    date: "Today, 09:12",
    status: "Pending",
  },
  {
    name: "Amanda Cele",
    type: "Sole provider",
    date: "Today, 08:47",
    status: "Approved",
  },
  {
    name: "Thabo Mokoena",
    type: "Customer",
    date: "Yesterday, 17:20",
    status: "Approved",
  },
  {
    name: "Bright Smiles Dental",
    type: "Business",
    date: "Yesterday, 14:05",
    status: "Approved",
  },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const user = authUser as User | null;

  const [stats] = useState<PlatformStats>({
    totalUsers: 0,
    totalBusinesses: 0,
    totalProviders: 0,
    totalBookingsThisMonth: 0,
  });

  const fullName = user
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : "";

  return (
    <>
      {/* Welcome */}
      <section className="relative mb-8 overflow-hidden rounded-2xl bg-[#0B1220] p-6 text-white sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-20 blur-[80px]"
          style={{ background: ACCENT_FROM }}
        />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-sky-400">
              Welcome back
            </p>
            <h2 className="text-2xl font-bold sm:text-3xl">{fullName}</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Here's an overview of what's happening across the platform.
            </p>
          </div>

          <button
            type="button"
            className="w-fit rounded-lg px-5 py-3 text-sm font-semibold text-[#0F172A] shadow-[0_10px_30px_-8px_rgba(14,165,233,0.6)] transition hover:brightness-105"
            style={{
              background: `linear-gradient(135deg, ${ACCENT_TO}, ${ACCENT_FROM})`,
            }}
            onClick={() => navigate("/dashboard/admin/reports")}
          >
            View reports
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total users"
          value={stats.totalUsers}
          subtitle="Customers, providers & staff"
          icon="♙"
        />

        <StatCard
          title="Businesses"
          value={stats.totalBusinesses}
          subtitle="Registered on the platform"
          icon="◈"
        />

        <StatCard
          title="Sole providers"
          value={stats.totalProviders}
          subtitle="Active provider accounts"
          icon="◷"
        />

        <StatCard
          title="Bookings this month"
          value={stats.totalBookingsThisMonth}
          subtitle="Across all accounts"
          icon="▣"
        />
      </section>

      {/* Main grid */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Recent signups */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-bold">Recent signups</h2>
              <p className="mt-1 text-sm text-slate-500">
                New accounts across the platform
              </p>
            </div>

            <button
              onClick={() => navigate("/dashboard/admin/users")}
              className="text-sm font-semibold hover:underline"
              style={{ color: ACCENT_FROM }}
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {signups.map((signup) => (
              <div
                key={`${signup.name}-${signup.date}`}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-700">
                    {signup.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)}
                  </div>

                  <div>
                    <p className="font-semibold">{signup.name}</p>
                    <p className="text-sm text-slate-500">
                      {signup.type} · {signup.date}
                    </p>
                  </div>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    signup.status === "Pending"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {signup.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Platform health */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold">Platform health</h2>
            <p className="mt-1 text-sm text-slate-500">
              Current system status
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            <HealthRow label="API" status="Operational" />
            <HealthRow label="Payments" status="Operational" />
            <HealthRow label="Notifications" status="Operational" />
            <HealthRow label="Pending approvals" status="1 waiting" tone="amber" />
          </div>
        </section>
      </div>

      {/* Quick actions */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickAction
          icon="♙"
          label="Manage users"
          description="Search, edit and suspend user accounts."
          onClick={() => navigate("/dashboard/admin/users")}
        />

        <QuickAction
          icon="◈"
          label="Manage businesses"
          description="Review and approve business accounts."
          onClick={() => navigate("/dashboard/admin/businesses")}
        />

        <QuickAction
          icon="◇"
          label="Subscriptions"
          description="View plans, billing and upgrades."
          onClick={() => navigate("/dashboard/admin/subscriptions")}
        />

        <QuickAction
          icon="▣"
          label="Reports"
          description="Platform-wide bookings and revenue reports."
          onClick={() => navigate("/dashboard/admin/reports")}
        />
      </section>
    </>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-sky-700"
          style={{ backgroundColor: "rgba(14,165,233,0.1)" }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function HealthRow({
  label,
  status,
  tone = "green",
}: {
  label: string;
  status: string;
  tone?: "green" | "amber";
}) {
  return (
    <div className="flex items-center justify-between p-5">
      <span className="text-sm font-medium text-slate-700">{label}</span>

      <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            tone === "amber" ? "bg-amber-500" : "bg-emerald-500"
          }`}
        />
        {status}
      </span>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  description,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-lg text-sky-700">
        {icon}
      </div>

      <h3 className="mt-4 font-semibold text-slate-900">{label}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </button>
  );
}