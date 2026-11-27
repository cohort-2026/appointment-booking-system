import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";
import { useBusinessDashboard } from "../../../context/BusinessDashboardContext";
import { formatBusinessName } from "../../../lib/formatBusinessName";
import { Card, CardContent } from "@/components/ui/card";

const ACCENT_FROM = "#0EA5E9";
const ACCENT_TO = "#38BDF8";

// --- Reusable Vector Icons ---
const Icons = {
  Dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <path d="M8 2v4M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  ),
  Services: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <path d="m16 6 4 14M12 6v14M8 8v12M4 4v16" />
    </svg>
  ),
  Staff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Subscription: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  Profile: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  ),
  TrendUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <line x1="5" x2="19" y1="12" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

type NavItem = {
  label: string;
  icon: React.ComponentType;
  path: string;
};

// 6 active nav items (Analytics excluded)
const navItems: NavItem[] = [
  { label: "Dashboard", icon: Icons.Dashboard, path: "/dashboard/business" },
  { label: "Appointments", icon: Icons.Calendar, path: "/dashboard/business/appointments" },
  { label: "Services", icon: Icons.Services, path: "/dashboard/business/services" },
  { label: "Staff", icon: Icons.Staff, path: "/dashboard/business/staff" },
  { label: "Subscription", icon: Icons.Subscription, path: "/dashboard/business/package" },
  { label: "Profile", icon: Icons.Profile, path: "/dashboard/business/profile" },
];

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const { data: dashboardData, loading: fetching } = useBusinessDashboard();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const rawBusiness = dashboardData?.business ?? null;
  const business = rawBusiness
    ? { ...rawBusiness, name: formatBusinessName(rawBusiness.name) }
    : null;
  const stats = dashboardData?.stats ?? null;
  const appointments = dashboardData?.todayAppointments ?? [];
  const staff = dashboardData?.staff ?? [];
  const subscription = dashboardData?.subscription ?? null;

  // Non-blocking guard
  if (loading || !user) {
    return null;
  }

  const tierName = subscription?.tier
    ? subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1).toLowerCase()
    : "Basic";

  return (
    <div className="business-legacy-page min-h-screen bg-[#F4F7FB] text-slate-900">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="business-mobile-overlay fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#0B1220] transition-transform duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <Link to="/" className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-[#0F172A]"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_TO}, ${ACCENT_FROM})`,
              }}
            >
              IT
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              ITThynk<span className="text-[#38BDF8]">Appoint</span>
            </span>
          </Link>
        </div>

        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-xs font-medium text-slate-400">Business Console</p>
          <h2 className="mt-1 truncate text-base font-semibold text-white">
            {business?.name || "Business Workspace"}
          </h2>
          <p className="mt-1 text-xs text-sky-400">Owner Access</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 pb-6 pt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === "/dashboard/business";
            return (
              <button
                key={item.label}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(item.path);
                }}
                className={`relative flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                }`}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
                    style={{
                      background: `linear-gradient(180deg, ${ACCENT_TO}, ${ACCENT_FROM})`,
                    }}
                  />
                )}
                <Icon />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <Icons.LogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="lg:pl-64">
        {/* Sticky Header — Clean & Static without any blinking ping or redundant buttons */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 p-2 lg:hidden"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Business Overview
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Team status, live booking capacity, and operational queue.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT_TO}, ${ACCENT_FROM})`,
                }}
              >
                {business?.name ? business.name.slice(0, 2).toUpperCase() : "BU"}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{business?.name ?? "My Business"}</p>
                <p className="text-xs text-slate-500">{business?.category ?? "Service Provider"}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Welcome Banner */}
          <section className="relative mb-8 overflow-hidden rounded-lg bg-[#0B1220] p-6 text-white sm:p-8">
            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-white/20" />
            <span aria-hidden="true" className="pointer-events-none absolute right-16 top-14 size-10 rounded-full bg-white/10" />
            <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> {tierName} Plan
                </div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  {business?.name ?? "Welcome Back"}
                </h2>
                <p className="mt-2 max-w-xl text-sm text-slate-300">
                  {fetching ? (
                    <span className="inline-block h-4 w-64 animate-pulse rounded bg-slate-700/60" />
                  ) : (
                    `${stats?.todayRemaining ?? 0} appointments remaining to be served today across your team.`
                  )}
                </p>
              </div>

              <div>
                <button
                  onClick={() => navigate("/dashboard/business/appointments")}
                  className="rounded-xl px-5 py-3 text-sm font-semibold text-[#0F172A] shadow-md transition hover:brightness-105"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT_TO}, ${ACCENT_FROM})`,
                  }}
                >
                  View Master Calendar
                </button>
              </div>
            </div>
          </section>

          {/* 4 KPI Metric Cards (With In-Place Skeletons) */}
          <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {fetching || !stats ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="h-3.5 w-24 rounded bg-slate-200" />
                  <div className="h-7 w-16 rounded bg-slate-200" />
                  <div className="h-3 w-32 rounded bg-slate-100" />
                </div>
              ))
            ) : (
              <>
                <StatCard
                  title="Today's Bookings"
                  value={String(stats.todayAppointments)}
                  subtitle={`${stats.todayRemaining} remaining today`}
                  icon={Icons.Calendar}
                />
                <StatCard
                  title="Active Staff"
                  value={`${stats.staffCount} / ${subscription?.maxStaff ?? stats.maxStaff ?? "∞"}`}
                  subtitle={
                    stats.staffCount >= (subscription?.maxStaff ?? 3)
                      ? "At plan threshold"
                      : "Within plan quota"
                  }
                  icon={Icons.Staff}
                  alert={stats.staffCount >= (subscription?.maxStaff ?? 3)}
                />
                <StatCard
                  title="Active Services"
                  value={String(stats.activeServicesCount)}
                  subtitle="Offered in catalog"
                  icon={Icons.Services}
                />
                <StatCard
                  title="Monthly Volume"
                  value={String(stats.monthAppointments)}
                  subtitle="Appointments this month"
                  icon={Icons.TrendUp}
                />
              </>
            )}
          </section>

          {/* 2-Column Main Section */}
          <div className="grid gap-6 xl:grid-cols-3">
            {/* Left 2 Cols: Today's Appointments */}
            <Card className="gap-0 rounded-lg py-0 shadow-sm xl:col-span-2">
              <div className="h-1.5 bg-primary" />
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-sky-50/50 p-5">
                <div>
                  <h2 className="font-bold text-slate-900">Today's Schedule Queue</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Live booking progression across all providers</p>
                </div>
                <button
                  onClick={() => navigate("/dashboard/business/appointments")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0EA5E9] hover:underline"
                >
                  <span>View full schedule</span>
                  <Icons.ArrowRight />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {fetching ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex animate-pulse items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <div className="h-4 w-12 rounded bg-slate-200" />
                        <div className="h-10 w-10 rounded-full bg-slate-200" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 rounded bg-slate-200" />
                          <div className="h-3 w-48 rounded bg-slate-100" />
                        </div>
                      </div>
                      <div className="h-6 w-20 rounded-full bg-slate-200" />
                    </div>
                  ))
                ) : appointments.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-500">
                    No appointments scheduled for today yet.
                  </div>
                ) : (
                  appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="m-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16">
                          <p className="font-semibold text-slate-800">
                            {new Date(appointment.time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-700">
                          {appointment.customerName
                            .split(" ")
                            .map((name) => name[0])
                            .join("")
                            .slice(0, 2)}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">{appointment.customerName}</p>
                          <p className="text-xs text-slate-500">
                            {appointment.service} • Assigned:{" "}
                            <span className="font-medium text-slate-700">
                              {appointment.staffName ?? "Unassigned"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                          appointment.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700"
                            : appointment.status === "CANCELLED"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Right Column: Staff Roster */}
            <Card className="gap-0 rounded-lg py-0 shadow-sm">
              <div className="h-1.5 bg-primary" />
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-sky-50/50 p-5">
                <div>
                  <h2 className="font-bold text-slate-900">Staff Availability</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Live roster &amp; daily loads</p>
                </div>
                <button
                  onClick={() => navigate("/dashboard/business/staff")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0EA5E9] hover:underline"
                >
                  <span>Manage</span>
                  <Icons.ArrowRight />
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {fetching ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex animate-pulse items-center justify-between p-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200" />
                        <div className="space-y-2">
                          <div className="h-4 w-28 rounded bg-slate-200" />
                          <div className="h-3 w-20 rounded bg-slate-100" />
                        </div>
                      </div>
                      <div className="h-4 w-14 rounded bg-slate-200" />
                    </div>
                  ))
                ) : staff.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-500">
                    No staff members on roster yet.
                  </div>
                ) : (
                  staff.map((member) => (
                    <div key={member.id} className="m-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-sky-700">
                            {member.name.charAt(0)}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-500">{member.role}</p>
                          </div>
                        </div>

                        <span
                          className={`flex items-center gap-1.5 text-xs font-semibold ${
                            member.status === "Available" ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              member.status === "Available" ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          {member.status}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between text-xs text-slate-500">
                        <span>Bookings today:</span>
                        <span className="font-semibold text-slate-700">{member.appointmentsToday}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Bottom Grid: Active Package & Quick Actions */}
          <section className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Active Subscription Summary (With Skeleton) */}
            <Card className="gap-0 rounded-lg py-0 shadow-sm"><div className="h-1.5 bg-primary" /><CardContent className="p-6">
              {fetching ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-4 w-24 rounded bg-slate-200" />
                  <div className="h-8 w-48 rounded bg-slate-200" />
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="h-16 rounded-2xl bg-slate-100" />
                    <div className="h-16 rounded-2xl bg-slate-100" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Plan</p>
                      <h2 className="mt-1 text-2xl font-bold text-slate-900">{tierName} Package</h2>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      {subscription?.status ?? "Active"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">Staff Limit</p>
                      <p className="mt-1 text-lg font-bold text-slate-800">
                        {stats?.staffCount ?? 0} / {subscription?.maxStaff ?? stats?.maxStaff ?? "∞"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">Daily Bookings Quota</p>
                      <p className="mt-1 text-lg font-bold text-slate-800">
                        {subscription?.dailyAppointmentLimit ?? "N/A"} / staff
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate("/dashboard/business/package")}
                    className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    <span>Manage Package &amp; Limits</span>
                    <Icons.ArrowRight />
                  </button>
                </>
              )}
            </CardContent></Card>

            {/* Quick Actions Shortcuts */}
            <Card className="gap-0 rounded-lg py-0 shadow-sm"><div className="h-1.5 bg-primary" /><CardContent className="p-6">
              <h2 className="font-bold text-slate-900">Quick Actions</h2>
              <p className="mt-0.5 text-xs text-slate-500">Fast paths for common administrative tasks</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate("/dashboard/business/staff")}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 text-left text-xs font-medium text-slate-800 transition hover:border-[#0EA5E9] hover:bg-sky-50/50"
                >
                  <span className="text-[#0EA5E9]"><Icons.Staff /></span>
                  <span>Add Staff</span>
                </button>
                <button
                  onClick={() => navigate("/dashboard/business/services")}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 text-left text-xs font-medium text-slate-800 transition hover:border-[#0EA5E9] hover:bg-sky-50/50"
                >
                  <span className="text-[#0EA5E9]"><Icons.Services /></span>
                  <span>Add Service</span>
                </button>
                <button
                  onClick={() => navigate("/dashboard/business/appointments")}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 text-left text-xs font-medium text-slate-800 transition hover:border-[#0EA5E9] hover:bg-sky-50/50"
                >
                  <span className="text-[#0EA5E9]"><Icons.Calendar /></span>
                  <span>Calendar Queue</span>
                </button>
                <button
                  onClick={() => navigate("/dashboard/business/profile")}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 text-left text-xs font-medium text-slate-800 transition hover:border-[#0EA5E9] hover:bg-sky-50/50"
                >
                  <span className="text-[#0EA5E9]"><Icons.Profile /></span>
                  <span>Profile Settings</span>
                </button>
              </div>
            </CardContent></Card>
          </section>
        </div>

        {/* Consistent Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
            <p>© {new Date().getFullYear()} ITThynkAppoint. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <Link to="/about" className="hover:text-slate-700">About</Link>
              <Link to="/contact" className="hover:text-slate-700">Support</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  alert = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType;
  alert?: boolean;
}) {
  return (
    <Card className={`gap-0 overflow-hidden rounded-lg py-0 shadow-sm ${alert ? "ring-amber-300" : ""}`}><div className={`h-1.5 ${alert ? "bg-rose-400" : "bg-primary"}`} /><CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className={`mt-1 text-xs ${alert ? "font-semibold text-amber-600" : "text-slate-400"}`}>
            {subtitle}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-[#0EA5E9] bg-sky-50">
          <Icon />
        </div>
      </div>
    </CardContent></Card>
  );
}