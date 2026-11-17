import React, { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";
import StaffCalendar, { type CalendarAppointment } from "../../../components/calendar/StaffCalendar";
import { getDateKey } from "../../../utils/staffCalendar";

const ACCENT_FROM = "#0EA5E9";
const ACCENT_TO = "#38BDF8";

// TODO(demo timezone): confirm the agreed demo timezone with the team and use it here.
const DEMO_TIME_ZONE = "Africa/Johannesburg";

// --- Date helpers (calendar dates as YYYY-MM-DD, no timezone maths) ---
function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Monday of the week that contains this date
function startOfWeek(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(dateKey, -((dayOfWeek + 6) % 7));
}

const getCurrentWeekStart = () => startOfWeek(getDateKey(Date.now(), DEMO_TIME_ZONE));

const INITIAL_WEEK_START = getCurrentWeekStart();
const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

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
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <line x1="12" x2="12" y1="5" y2="19" />
      <line x1="5" x2="19" y1="12" y2="12" />
    </svg>
  ),
  CalendarGrid: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <line x1="3" x2="21" y1="9" y2="9" />
      <line x1="9" x2="9" y1="3" y2="21" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

export type StaffMember = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  assignedServices?: string[];
  appointmentsToday: number;
  status: "Active" | "On leave" | "Inactive" | "Pending";
};

type ServiceItem = {
  id: string;
  name: string;
  durationMinutes: number;
  expectedPrice: number | string | null;
  active: boolean;
};

type RawApiStaff = {
  id: string;
  name: string;
  role: string;
  appointmentsToday: number;
  status: string;
  email?: string;
  phone?: string;
  assignedServices?: string[];
  expiresAt?: string;
};

// Shape returned by GET /business/appointments
type ApiAppointment = {
  id: string;
  time: string;
  customerName: string;
  service: string;
  durationMinutes?: number | null;
  staffId?: string | null;
  staffName: string | null;
  status: string;
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

export default function BusinessStaff() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [apiAppointments, setApiAppointments] = useState<ApiAppointment[]>([]);
  const [maxStaff, setMaxStaff] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fetching, setFetching] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Honest load errors (null = no error)
  const [staffError, setStaffError] = useState<string | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  // Add Staff Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formServiceIds, setFormServiceIds] = useState<string[]>([]);
  const [inviteServicesOpen, setInviteServicesOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calendar & Manage Modal State
  const [managingStaff, setManagingStaff] = useState<StaffMember | null>(null);
  const [activeTab, setActiveTab] = useState<"CALENDAR" | "SERVICES" | "HOURS">("CALENDAR");
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);
  const [weekStart, setWeekStart] = useState<string>(INITIAL_WEEK_START);
  const [isSavingManage, setIsSavingManage] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (user.role !== "BUSINESS_OWNER") {
      navigate("/login", { replace: true });
      return;
    }

    const fetchAllData = async () => {
      setFetching(true);

      const [staffRes, svcRes, apptRes] = await Promise.allSettled([
        apiFetch<{
          success: boolean;
          staff?: RawApiStaff[];
          maxStaff: number | null;
        }>("/business/staff"),
        apiFetch<{ success: boolean; services: ServiceItem[] }>("/business/services"),
        apiFetch<{ success: boolean; appointments?: ApiAppointment[] }>("/business/appointments"),
      ]);

      if (staffRes.status === "fulfilled") {
        setStaffList(
          (staffRes.value.staff ?? []).map((staff) => ({
            ...staff,
            status: staff.status === "Pending" ? "Pending" : "Active",
          }))
        );
        setMaxStaff(staffRes.value.maxStaff);
        setStaffError(null);
      } else {
        const message = messageOf(staffRes.reason, "Could not load staff data.");
        setStaffList([]);
        setStaffError(message);
        toast.error(message);
      }

      if (svcRes.status === "fulfilled") {
        setServices(svcRes.value.services ?? []);
        setServicesError(null);
      } else {
        setServices([]);
        setServicesError(messageOf(svcRes.reason, "Could not load services."));
      }

      if (apptRes.status === "fulfilled") {
        setApiAppointments(apptRes.value.appointments ?? []);
        setAppointmentsError(null);
      } else {
        setApiAppointments([]);
        setAppointmentsError(messageOf(apptRes.reason, "Could not load appointments."));
      }

      setFetching(false);
    };

    void fetchAllData();
  }, [user, navigate, reloadKey]);

  const atStaffLimit = maxStaff !== null && staffList.length >= maxStaff;

  // Real appointments in the shape StaffCalendar expects.
  // Appointments without a duration cannot be drawn truthfully, so they are counted and reported.
  const { calendarAppointments, undrawableCount } = useMemo(() => {
    const drawable: CalendarAppointment[] = [];
    let undrawable = 0;
    for (const appointment of apiAppointments) {
      if (!appointment.staffId) continue;
      if (!appointment.durationMinutes) {
        if (appointment.staffId === managingStaff?.id) undrawable += 1;
        continue;
      }
      drawable.push({
        id: appointment.id,
        staffId: appointment.staffId,
        time: appointment.time,
        durationMinutes: appointment.durationMinutes,
        status: appointment.status,
        serviceLabel: appointment.service,
        customerLabel: appointment.customerName,
      });
    }
    return { calendarAppointments: drawable, undrawableCount: undrawable };
  }, [apiAppointments, managingStaff?.id]);

  const handleOpenAdd = () => {
    if (atStaffLimit) {
      toast.error(`Your plan's limit of ${maxStaff} staff seats has been reached.`);
      return;
    }
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormRole("");
    setFormServiceIds([]);
    setInviteServicesOpen(false);
    setIsAddModalOpen(true);
  };

  const handleCreateStaff = async (e: FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formEmail.trim() || !formRole.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch<{
        success: boolean;
        invitation: { id: string; name: string; email: string; role: string; expiresAt: string; assignedServices?: string[] };
      }>("/business/staff/invitations", {
        method: "POST",
        body: JSON.stringify({
          fullName: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          phone: formPhone.trim() || undefined,
          title: formRole.trim(),
          serviceIds: formServiceIds,
        }),
      });

      setStaffList((prev) => [{
        id: response.invitation.id,
        name: response.invitation.name,
        email: response.invitation.email,
        role: response.invitation.role,
        assignedServices: response.invitation.assignedServices ?? [],
        appointmentsToday: 0,
        status: "Pending",
      }, ...prev]);
      toast.success(`Invitation sent to ${response.invitation.email}.`);
      setIsAddModalOpen(false);
    } catch (error) {
      toast.error(messageOf(error, "Failed to send staff invitation."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Manage Services & Calendar
  const handleOpenCalendarAndManage = (staff: StaffMember) => {
    setManagingStaff(staff);
    setActiveTab("CALENDAR");
    setWeekStart(getCurrentWeekStart());

    const matchedIds = services
      .filter((s) => (staff.assignedServices || []).includes(s.name))
      .map((s) => s.id);

    setAssignedServiceIds(matchedIds);
  };

  const toggleServiceQualification = (serviceId: string) => {
    setAssignedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  // Success is only reported after the server confirms. A failed request shows an error.
  const handleSaveQualifications = async () => {
    if (!managingStaff) return;
    setIsSavingManage(true);

    try {
      await apiFetch(`/business/staff/${managingStaff.id}/services`, {
        method: "PUT",
        body: JSON.stringify({ serviceIds: assignedServiceIds }),
      });

      const updatedNames = services
        .filter((s) => assignedServiceIds.includes(s.id))
        .map((s) => s.name);

      setStaffList((prev) =>
        prev.map((st) => (st.id === managingStaff.id ? { ...st, assignedServices: updatedNames } : st))
      );

      toast.success(`Services updated for ${managingStaff.name}.`);
    } catch (error) {
      toast.error(messageOf(error, "Could not update services."));
    } finally {
      setIsSavingManage(false);
    }
  };

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return staffList.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q)
    );
  }, [staffList, searchQuery]);

  // Non-blocking guard
  if (loading || !user) {
    return null;
  }

  const weekEnd = addDays(weekStart, 6);

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
          <h2 className="mt-1 truncate text-base font-semibold text-white">Staff Management</h2>
          <p className="mt-1 text-xs text-sky-400">Team &amp; Rostering</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 pb-6 pt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === "/dashboard/business/staff";
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
                Staff Members
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                {staffList.length} of {maxStaff ?? "unlimited"} staff seats used, including pending invitations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {maxStaff === null ? "No staff seat limit" : `${maxStaff} staff seats`}
            </span>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Search Bar & Action Toolbar */}
          <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Icons.Search />
              </span>
              <input
                type="text"
                placeholder="Search staff by name or role title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-xs text-slate-800 outline-none transition focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100 sm:text-sm"
              />
            </div>

            <button
              onClick={handleOpenAdd}
              disabled={atStaffLimit}
              className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold transition sm:text-sm ${
                atStaffLimit
                  ? "cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200"
                  : "bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] text-white shadow-sm hover:brightness-105"
              }`}
            >
              <Icons.Plus />
              <span>Invite Staff Member</span>
            </button>
          </section>

          {/* Staff Roster Table with Skeletons */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Role / Title</th>
                    <th className="px-6 py-4">Appointments Today</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Schedule &amp; Services</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetching ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-200" />
                            <div className="space-y-2">
                              <div className="h-4 w-32 rounded bg-slate-200" />
                              <div className="h-3 w-40 rounded bg-slate-100" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="h-4 w-28 rounded bg-slate-200" />
                            <div className="h-3 w-36 rounded bg-slate-100" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-4 w-20 rounded bg-slate-200" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-5 w-16 rounded-full bg-slate-200" />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="ml-auto h-8 w-44 rounded-xl bg-slate-200" />
                        </td>
                      </tr>
                    ))
                  ) : staffError ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-sm text-rose-600">
                        <p>{staffError}</p>
                        <button
                          type="button"
                          onClick={() => setReloadKey((key) => key + 1)}
                          className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Try again
                        </button>
                      </td>
                    </tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-sm text-slate-500">
                        {searchQuery ? "No staff members match your search." : "No staff members on roster yet."}
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => (
                      <tr key={staff.id} className="transition hover:bg-slate-50/50">
                        {/* Name & Avatar */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 font-bold text-sky-700">
                              {staff.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{staff.name}</p>
                              <p className="text-xs text-slate-500">{staff.email || "No email"}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role & Services */}
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{staff.role}</p>
                          <p className="text-xs text-slate-400 line-clamp-1">
                            {staff.assignedServices && staff.assignedServices.length > 0
                              ? staff.assignedServices.join(", ")
                              : "No qualifications assigned"}
                          </p>
                        </td>

                        {/* Today's appointment count */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{staff.appointmentsToday}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              staff.status === "Active"
                                ? "bg-emerald-50 text-emerald-700"
                                : staff.status === "Pending"
                                ? "bg-sky-50 text-sky-700"
                                : staff.status === "On leave"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                staff.status === "Active"
                                  ? "bg-emerald-500"
                                  : staff.status === "Pending"
                                  ? "bg-sky-500"
                                  : staff.status === "On leave"
                                  ? "bg-amber-500"
                                  : "bg-slate-400"
                              }`}
                            />
                            {staff.status}
                          </span>
                        </td>

                        {/* Opens the calendar */}
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenCalendarAndManage(staff)}
                            disabled={staff.status === "Pending"}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-[#0EA5E9] hover:text-[#0EA5E9] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {staff.status === "Pending" ? <span>Invitation pending</span> : <><Icons.CalendarGrid /><span>View Calendar &amp; Schedule</span></>}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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

      {/* --- MODAL 1: Add Staff Member --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Invite Staff Member</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  The invite link expires in 7 days. The staff member sets their own password.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Wilson"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Role / Specialization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physiotherapist or Senior Stylist"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="staff@mybusiness.co.za"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+27 82 000 0000"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Assign services
                  </label>
                  <span className="text-xs font-medium text-slate-500">{formServiceIds.length} selected</span>
                </div>
                {servicesError ? (
                  <p className="mt-1.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    {servicesError}
                  </p>
                ) : services.length === 0 ? (
                  <p className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    No services are available yet. You can assign services later from the service editor.
                  </p>
                ) : services.length === 1 ? (
                  <label className="mt-1.5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formServiceIds.includes(services[0]!.id)}
                      onChange={() => setFormServiceIds((current) => current.includes(services[0]!.id) ? [] : [services[0]!.id])}
                      className="h-4 w-4 rounded border-slate-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
                    />
                    <span className="font-medium text-slate-800">{services[0]!.name}</span>
                  </label>
                ) : (
                  <div className="relative mt-1.5">
                    <button
                      type="button"
                      aria-expanded={inviteServicesOpen}
                      onClick={() => setInviteServicesOpen((open) => !open)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-left text-sm text-slate-800 hover:border-[#0EA5E9]"
                    >
                      <span className="truncate">
                        {formServiceIds.length === 0
                          ? "Select services for this staff member"
                          : services.filter((service) => formServiceIds.includes(service.id)).map((service) => service.name).join(", ")}
                      </span>
                      <span aria-hidden="true" className="ml-3 text-slate-500">{inviteServicesOpen ? "▴" : "▾"}</span>
                    </button>
                    {inviteServicesOpen && (
                      <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                        {services.map((service) => (
                          <label key={service.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={formServiceIds.includes(service.id)}
                              onChange={() => setFormServiceIds((current) => current.includes(service.id)
                                ? current.filter((id) => id !== service.id)
                                : [...current, service.id])}
                              className="h-4 w-4 rounded border-slate-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
                            />
                            <span className="font-medium text-slate-800">{service.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-105 disabled:opacity-50"
                >
                  {isSubmitting ? "Sending invitation..." : "Send invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CALENDAR & MANAGEMENT MODAL --- */}
      {managingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] text-lg font-bold text-white shadow-xs">
                  {managingStaff.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900">{managingStaff.name}</h3>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {managingStaff.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {managingStaff.role} • {managingStaff.appointmentsToday} appointments today
                  </p>
                </div>
              </div>

              {/* Action Tabs: Calendar / Services / Hours */}
              <div className="flex items-center gap-2">
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab("CALENDAR")}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                      activeTab === "CALENDAR" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Calendar
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("SERVICES")}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                      activeTab === "SERVICES" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Services ({assignedServiceIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("HOURS")}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                      activeTab === "HOURS" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Working Shifts
                  </button>
                </div>

                <button
                  onClick={() => setManagingStaff(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* --- TAB 1: LIVE STAFF CALENDAR --- */}
            {activeTab === "CALENDAR" && (
              <div className="mt-6">
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWeekStart(addDays(weekStart, -7))}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      aria-label="Previous week"
                    >
                      <Icons.ChevronLeft />
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeekStart(getCurrentWeekStart())}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      This week
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeekStart(addDays(weekStart, 7))}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                      aria-label="Next week"
                    >
                      <Icons.ChevronRight />
                    </button>
                    <span className="ml-2 text-sm font-bold text-slate-800">
                      {weekStart} to {weekEnd}
                    </span>
                  </div>
                </div>

                {fetching ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Loading appointments...
                  </p>
                ) : appointmentsError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <p>{appointmentsError}</p>
                    <button
                      type="button"
                      onClick={() => setReloadKey((key) => key + 1)}
                      className="mt-2 rounded-xl border border-rose-200 bg-white px-4 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <>
                    {undrawableCount > 0 && (
                      <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                        {undrawableCount} appointment(s) for this staff member have no duration on record and
                        cannot be drawn on the calendar.
                      </p>
                    )}
                    <StaffCalendar
                      appointments={calendarAppointments}
                      selectedStaffId={managingStaff.id}
                      rangeStart={weekStart}
                      rangeEnd={weekEnd}
                      timeZone={DEMO_TIME_ZONE}
                    />
                  </>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setManagingStaff(null)}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close Calendar
                  </button>
                </div>
              </div>
            )}

            {/* --- TAB 2: SERVICE QUALIFICATIONS --- */}
            {activeTab === "SERVICES" && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Select which services this staff member is qualified to perform.
                  </p>
                  <span className="text-xs font-semibold text-[#0EA5E9]">
                    {assignedServiceIds.length} Assigned
                  </span>
                </div>

                {servicesError ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    {servicesError}
                  </p>
                ) : services.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    No services have been created yet.
                  </p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {services.map((svc) => {
                      const isChecked = assignedServiceIds.includes(svc.id);
                      return (
                        <label
                          key={svc.id}
                          className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition ${
                            isChecked ? "border-sky-300 bg-sky-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleServiceQualification(svc.id)}
                              className="h-4 w-4 rounded border-slate-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900">{svc.name}</p>
                              <p className="text-[11px] text-slate-400">
                                {svc.durationMinutes} mins • R{svc.expectedPrice ?? 0}
                              </p>
                            </div>
                          </div>

                          <span className="text-[11px] font-semibold text-slate-400">
                            {isChecked ? "Eligible" : "Unassigned"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setManagingStaff(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQualifications}
                    disabled={isSavingManage || services.length === 0}
                    className="rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50"
                  >
                    {isSavingManage ? "Saving..." : "Save Service Qualifications"}
                  </button>
                </div>
              </div>
            )}

            {/* --- TAB 3: WORKING HOURS (not editable from this screen) --- */}
            {activeTab === "HOURS" && (
              <div className="mt-6 space-y-4">
                {/* TODO(availability link): link this notice to the working staff availability screen once its route is confirmed. */}
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Editing weekly hours is not available on this screen, so nothing can be saved here.
                  Use the staff availability screen to view or change working hours.
                </p>
                <div className="flex justify-end border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setManagingStaff(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
