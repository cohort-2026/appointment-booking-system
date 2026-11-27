import { sastDate, formatSast } from "../../../lib/bookingTime";
import AppointmentHistoryDrawer from "../../../components/booking/AppointmentHistoryDrawer";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";
import { Card } from "@/components/ui/card";

const ACCENT_FROM = "#0EA5E9";
const ACCENT_TO = "#38BDF8";

// --- Vector Icons ---
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
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" x2="16.65" y1="21" y2="16.65" />
    </svg>
  ),
  Lock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
};

export type AppointmentStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "RESCHEDULED";

export type BusinessAppointment = {
  id: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  service: string;
  staffName: string | null;
  status: AppointmentStatus;
  price?: number;
  durationMinutes?: number;
};

type NavItem = {
  label: string;
  icon: React.ComponentType;
  path: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: Icons.Dashboard, path: "/dashboard/business" },
  { label: "Appointments", icon: Icons.Calendar, path: "/dashboard/business/appointments" },
  { label: "Services", icon: Icons.Services, path: "/dashboard/business/services" },
  { label: "Staff", icon: Icons.Staff, path: "/dashboard/business/staff" },
  { label: "Subscription", icon: Icons.Subscription, path: "/dashboard/business/package" },
  { label: "Profile", icon: Icons.Profile, path: "/dashboard/business/profile" },
];

export default function BusinessAppointments() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appointments, setAppointments] = useState<BusinessAppointment[]>([]);
  const [activeTab, setActiveTab] = useState<"TODAY" | "UPCOMING" | "HISTORY">("TODAY");
  const [selectedStaff, setSelectedStaff] = useState<string>("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (user.role !== "BUSINESS_OWNER") {
      navigate("/login", { replace: true });
      return;
    }

    const fetchAppointments = async () => {
      setFetching(true);
      try {
        const response = await apiFetch<{
          success: boolean;
          appointments?: BusinessAppointment[];
        }>("/business/appointments");

        setAppointments(response.appointments ?? []);
      } catch (err) {
        console.warn("Could not load appointments from backend:", err);
        toast.error(err instanceof Error ? err.message : "Could not load appointments.");
      } finally {
        setFetching(false);
      }
    };

    void fetchAppointments();
  }, [user, navigate]);

  // Unique staff list for filter
  const staffOptions = useMemo(() => {
    const names = new Set<string>();
    appointments.forEach((a) => {
      if (a.staffName) names.add(a.staffName);
    });
    return ["ALL", ...Array.from(names)];
  }, [appointments]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    const startOfToday = Date.parse(sastDate() + "T00:00:00+02:00");
    const endOfToday = startOfToday + 86400000;
    const query = searchQuery.toLowerCase().trim();

    return appointments.filter((a) => {
      const apptTime = new Date(a.time).getTime();

      // Tab filter
      let matchesTab = true;
      if (activeTab === "TODAY") {
        matchesTab = a.status !== "CANCELLED" && apptTime >= startOfToday && apptTime < endOfToday;
      } else if (activeTab === "UPCOMING") {
        matchesTab = apptTime >= endOfToday && ["CONFIRMED", "RESCHEDULED"].includes(a.status);
      } else if (activeTab === "HISTORY") {
        matchesTab = apptTime < startOfToday || !["CONFIRMED", "RESCHEDULED"].includes(a.status);
      }

      // Staff filter
      const matchesStaff = selectedStaff === "ALL" || a.staffName === selectedStaff;

      // Status filter dropdown
      const matchesStatus =
        selectedStatusFilter === "ALL" || a.status === selectedStatusFilter;

      // Text search
      const matchesSearch =
        a.customerName.toLowerCase().includes(query) ||
        a.service.toLowerCase().includes(query) ||
        (a.staffName ?? "").toLowerCase().includes(query);

      return matchesTab && matchesStaff && matchesStatus && matchesSearch;
    });
  }, [appointments, activeTab, selectedStaff, selectedStatusFilter, searchQuery]);

  // Non-blocking guard
  if (loading || !user) {
    return null;
  }

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
          <p className="text-xs font-medium text-slate-400">Navigation</p>
          <h2 className="mt-1 truncate text-base font-semibold text-white">Appointments</h2>
          <p className="mt-1 text-xs text-sky-400">Master Calendar</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 pb-6 pt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === "/dashboard/business/appointments";
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

      {/* Main View Area */}
      <main className="lg:pl-64">
        {/* Sticky Header — Clean & Static without any blinking ping */}
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
                Master Appointments
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Complete bookings overview and lifecycle management across all staff.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/dashboard/business")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Overview
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Filter Bar */}
          <Card className="mb-6 gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
            <div className="h-1.5 bg-primary" />
            <section className="flex flex-col gap-4 bg-sky-50/50 p-4 md:flex-row md:items-center md:justify-between">
            {/* View Tabs */}
            <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-100 p-1">
              {(["TODAY", "UPCOMING", "HISTORY"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
                    activeTab === tab
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab === "TODAY" ? "Today" : tab === "UPCOMING" ? "Upcoming" : "Past & History"}
                </button>
              ))}
            </div>

            {/* Staff, Status, & Search Controls */}
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {/* Staff Filter */}
              <div className="w-full sm:w-44">
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#0EA5E9]"
                >
                  {staffOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "ALL" ? "All Providers" : opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-36">
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#0EA5E9]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="NO_SHOW">No-Show</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Icons.Search />
                </span>
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-[#0EA5E9]"
                />
              </div>
            </div>
            </section>
          </Card>

          {/* Appointments Table with Skeletons */}
          <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
            <div className="h-1.5 bg-primary" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-sky-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Time &amp; Date</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Service</th>
                    <th className="px-6 py-4">Assigned Provider</th>
                    <th className="px-6 py-4 text-right">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {fetching ? (
                    // Skeleton Rows
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div className="h-4 w-16 rounded bg-slate-200" />
                            <div className="h-3 w-24 rounded bg-slate-100" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div className="h-4 w-28 rounded bg-slate-200" />
                            <div className="h-3 w-20 rounded bg-slate-100" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div className="h-4 w-24 rounded bg-slate-200" />
                            <div className="h-3 w-14 rounded bg-slate-100" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-24 rounded bg-slate-200" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="ml-auto h-8 w-32 rounded-xl bg-slate-200" />
                        </td>
                      </tr>
                    ))
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-sm text-slate-500">
                        No appointments found in this view.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((appt) => {
                      return (
                        <tr key={appt.id} className="transition hover:bg-slate-50/50">
                          {/* Time */}
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">
                              {formatSast(appt.time)}
                            </p>
                          </td>

                          {/* Customer */}
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">{appt.customerName}</p>
                            <p className="text-xs text-slate-400">{appt.customerPhone || "Online Client"}</p>
                          </td>

                          {/* Service */}
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-800">{appt.service}</p>
                            <p className="text-xs text-slate-400">R{appt.price ?? 0}</p>
                          </td>

                          {/* Provider */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">
                                {appt.staffName ? appt.staffName.charAt(0) : "?"}
                              </span>
                              <span className="text-xs font-semibold text-slate-700">
                                {appt.staffName ?? "Unassigned"}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <span className="capitalize">{appt.status.toLowerCase().replaceAll("_", " ")}</span>
                              <AppointmentHistoryDrawer role="business" id={appt.id} startsAt={appt.time}
                                title={`${appt.service} · ${appt.customerName}`} onSaved={status =>
                                  setAppointments(current => current.map(item => item.id === appt.id ? { ...item, status } : item))}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
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