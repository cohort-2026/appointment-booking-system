import React, { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";
import { Card } from "@/components/ui/card";

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
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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
  Info: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="16" y2="12" />
      <line x1="12" x2="12.01" y1="8" y2="8" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

export type BusinessService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferAfterMinutes: number;
  expectedPrice: number | string | null;
  active: boolean;
  assignedStaffIds: string[];
};

type AssignableStaff = { id: string; name: string; status: string };

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

export default function BusinessServices() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [services, setServices] = useState<BusinessService[]>([]);
  const [staffOptions, setStaffOptions] = useState<AssignableStaff[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [fetching, setFetching] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<BusinessService | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDuration, setFormDuration] = useState(30);
  const [formBuffer, setFormBuffer] = useState(15);
  const [formPrice, setFormPrice] = useState("");
  const [formStaffIds, setFormStaffIds] = useState<string[]>([]);
  const [staffSelectOpen, setStaffSelectOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (user.role !== "BUSINESS_OWNER") {
      navigate("/login", { replace: true });
      return;
    }

    const fetchServices = async () => {
      setFetching(true);
      try {
          const [serviceResponse, staffResponse] = await Promise.all([
            apiFetch<{ success: boolean; services: BusinessService[] }>("/business/services"),
            apiFetch<{ success: boolean; staff: AssignableStaff[] }>("/business/staff"),
          ]);
          setServices(serviceResponse.services ?? []);
          setStaffOptions((staffResponse.staff ?? []).filter((staff) => staff.status === "Active"));
      } catch (error) {
        console.warn("Could not load services from backend:", error);
          toast.error(error instanceof Error ? error.message : "Could not load business services.");
      } finally {
        setFetching(false);
      }
    };

    void fetchServices();
  }, [user, navigate]);

  const handleOpenCreate = () => {
    setEditingService(null);
    setFormName("");
    setFormDescription("");
    setFormDuration(30);
    setFormBuffer(15);
    setFormPrice("");
    setFormStaffIds(staffOptions.length === 1 ? [staffOptions[0]!.id] : []);
    setStaffSelectOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (svc: BusinessService) => {
    setEditingService(svc);
    setFormName(svc.name);
    setFormDescription(svc.description ?? "");
    setFormDuration(svc.durationMinutes);
    setFormBuffer(svc.bufferAfterMinutes ?? 15);
    setFormPrice(svc.expectedPrice ? String(svc.expectedPrice) : "");
    setFormStaffIds(svc.assignedStaffIds ?? []);
    setStaffSelectOpen(false);
    setIsModalOpen(true);
  };

  const handleSaveService = async (e: FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      toast.error("Please enter a service name.");
      return;
    }

    if (formDuration <= 0) {
      toast.error("Duration must be greater than 0 minutes.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      durationMinutes: Number(formDuration),
      bufferAfterMinutes: Number(formBuffer),
      expectedPrice: formPrice.trim() ? Number(formPrice) : null,
      staffIds: formStaffIds,
    };

    try {
      if (editingService) {
        const response = await apiFetch<{ success: boolean; service: BusinessService }>(`/business/services/${editingService.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setServices((prev) =>
          prev.map((s) => (s.id === editingService.id ? response.service : s))
        );
        toast.success(`"${payload.name}" updated successfully.`);
      } else {
        const response = await apiFetch<{ success: boolean; service: BusinessService }>("/business/services", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setServices((prev) => [response.service, ...prev]);
        toast.success(`"${payload.name}" added to catalog.`);
      }

      setIsModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (service: BusinessService) => {
    const updatedStatus = !service.active;
    if (updatedStatus && service.assignedStaffIds.length === 0) {
      toast.error("Assign at least one staff member before activating this service.");
      return;
    }
    try {
      await apiFetch(`/business/services/${service.id}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ active: updatedStatus }),
      });

      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, active: updatedStatus } : s))
      );

      toast.success(
        `"${service.name}" is now ${updatedStatus ? "Active (Bookable)" : "Paused (Hidden)"}.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change status.");
    }
  };

  const filteredServices = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return services.filter((svc) => {
      const matchesSearch =
        svc.name.toLowerCase().includes(query) ||
        (svc.description ?? "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && svc.active) ||
        (statusFilter === "INACTIVE" && !svc.active);

      return matchesSearch && matchesStatus;
    });
  }, [services, searchQuery, statusFilter]);

  const activeCount = services.filter((s) => s.active).length;
  const inactiveCount = services.length - activeCount;

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
          <h2 className="mt-1 truncate text-base font-semibold text-white">Service Catalog</h2>
          <p className="mt-1 text-xs text-sky-400">Business Manager</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 pb-6 pt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === "/dashboard/business/services";
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
        {/* Sticky Header — Clean & Static without any blinking ping or redundant back buttons */}
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
                Manage Services
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Define the offerings your business provides and which staff can deliver them.
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Information Tip with Vector Icon */}
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50/70 p-4 text-xs text-sky-900 sm:text-sm">
            <span className="text-[#0EA5E9] mt-0.5">
              <Icons.Info />
            </span>
            <div>
              <span className="font-semibold">Free Booking Architecture:</span> Customers book
              appointments for free with zero platform fee. Prices configured here are for customer
              estimation and reporting purposes only.
            </div>
          </div>

          {/* Quick Metrics Bar (With Skeletons) */}
          <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm"><div className="h-1.5 bg-primary" /><div className="p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Services</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {fetching ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-slate-200" /> : services.length}
              </p>
            </div></Card>
            <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm"><div className="h-1.5 bg-primary" /><div className="p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active for Booking</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {fetching ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-slate-200" /> : activeCount}
              </p>
            </div></Card>
            <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm"><div className="h-1.5 bg-primary" /><div className="p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paused Services</p>
              <p className="mt-1 text-2xl font-bold text-slate-500">
                {fetching ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-slate-200" /> : inactiveCount}
              </p>
            </div></Card>
            <Card className="gap-0 overflow-hidden rounded-lg py-0 shadow-sm"><div className="h-1.5 bg-primary" /><div className="p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Staff Allocation</p>
              <button
                onClick={() => navigate("/dashboard/business/staff")}
                className="mt-1 text-xs font-semibold text-[#0EA5E9] hover:underline"
              >
                Assign to Staff →
              </button>
            </div></Card>
          </section>

          {/* Search, Filter Toolbar & Standardized "Add Service" Button Placement */}
          <Card className="mb-6 gap-0 overflow-hidden rounded-lg py-0 shadow-sm">
            <div className="h-1.5 bg-primary" />
            <section className="flex flex-col gap-4 bg-sky-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Icons.Search />
              </span>
              <input
                type="text"
                placeholder="Search services by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-xs text-slate-800 outline-none transition focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100 sm:text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    statusFilter === "ALL"
                      ? "bg-[#0F172A] text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All ({services.length})
                </button>
                <button
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    statusFilter === "ACTIVE"
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setStatusFilter("INACTIVE")}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    statusFilter === "INACTIVE"
                      ? "bg-slate-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Paused ({inactiveCount})
                </button>
              </div>

              {/* Standardized "Add Service" button placed below in toolbar */}
              <button
                onClick={handleOpenCreate}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-105 sm:text-sm"
              >
                <Icons.Plus />
                <span>Add Service</span>
              </button>
            </div>
            </section>
          </Card>

          {/* Skeleton Loaders or Live Services Grid */}
          {fetching ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-36 rounded bg-slate-200" />
                    <div className="h-4 w-14 rounded-full bg-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3.5 w-full rounded bg-slate-200" />
                    <div className="h-3.5 w-4/5 rounded bg-slate-100" />
                  </div>
                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                    <div className="h-4 w-20 rounded bg-slate-200" />
                    <div className="h-4 w-16 rounded bg-slate-200" />
                  </div>
                  <div className="pt-2 flex gap-2">
                    <div className="h-8 flex-1 rounded-lg bg-slate-200" />
                    <div className="h-8 w-14 rounded-lg bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <h3 className="font-bold text-slate-900">No Services Found</h3>
              <p className="mt-1 text-xs text-slate-500">
                {searchQuery
                  ? "No services match your search query."
                  : "You haven't created any services for your business catalog yet."}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleOpenCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-600"
                >
                  Create Your First Service
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredServices.map((svc) => (
                <Card
                  key={svc.id}
                  className={`gap-0 overflow-hidden rounded-lg py-0 shadow-sm transition hover:shadow-md ${
                    svc.active ? "border-slate-200" : "border-slate-200/60 opacity-75 bg-slate-50/40"
                  }`}
                >
                  <div className="h-1.5 bg-primary" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-sky-50/50 p-4">
                      <h3 className="min-w-0 break-words font-bold text-slate-900 text-lg leading-snug">{svc.name}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          svc.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {svc.active ? "Active" : "Paused"}
                      </span>
                    </div>

                    <p className="px-4 pt-4 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {svc.description || "No description provided for this service."}
                    </p>

                  <div className="mt-auto p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
                      <div className="flex min-w-0 items-center gap-1.5 font-medium text-slate-500">
                        <Icons.Clock />
                        <span>{svc.durationMinutes} mins + {svc.bufferAfterMinutes ?? 15} mins cleanup</span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        {svc.expectedPrice ? `R${svc.expectedPrice}` : "Free / Inquire"}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggleActive(svc)}
                        className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
                          svc.active
                            ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {svc.active ? "Pause Booking" : "Activate"}
                      </button>

                      <button
                        onClick={() => handleOpenEdit(svc)}
                        className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
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

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingService ? "Edit Service" : "Add New Service"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Configure duration and details for your public catalog.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <Icons.X />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Service Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Haircut & Beard Grooming"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100 sm:text-sm"
                />
              </div>

              <label className="block text-sm font-semibold">Cleanup after service (minutes)
                <input required type="number" min={15} max={1440} value={formBuffer} onChange={e => setFormBuffer(Number(e.target.value))} className="mt-2 block w-full rounded-xl border border-slate-200 p-3" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Duration (Minutes) *
                  </label>
                  <select
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100 sm:text-sm"
                  >
                    <option value={15}>15 mins</option>
                    <option value={20}>20 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins (1 hr)</option>
                    <option value={90}>90 mins (1.5 hrs)</option>
                    <option value={120}>120 mins (2 hrs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Expected Price (ZAR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 250"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail what is included in this service..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-800 outline-none transition focus:border-[#0EA5E9] focus:bg-white focus:ring-4 focus:ring-sky-100 sm:text-sm"
                />
              </div>

              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-700">Assign staff</p>
                    <p className="mt-1 text-xs text-slate-500">A service becomes bookable when at least one staff member is assigned.</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{formStaffIds.length} selected</span>
                </div>
                {staffOptions.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    No active staff members are available. Add staff first; this service will remain inactive until assigned.
                  </p>
                ) : staffOptions.length === 1 ? (
                  <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={formStaffIds.includes(staffOptions[0]!.id)}
                      onChange={() => setFormStaffIds((current) => current.includes(staffOptions[0]!.id) ? [] : [staffOptions[0]!.id])}
                      className="h-4 w-4 rounded border-slate-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
                    />
                    <span className="font-medium text-slate-800">{staffOptions[0]!.name}</span>
                    {formStaffIds.includes(staffOptions[0]!.id) && <span className="ml-auto text-xs font-medium text-emerald-700">Assigned</span>}
                  </label>
                ) : (
                  <div className="relative mt-3">
                    <button
                      type="button"
                      aria-expanded={staffSelectOpen}
                      onClick={() => setStaffSelectOpen((open) => !open)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-800 hover:border-sky-400"
                    >
                      <span className="truncate">
                        {formStaffIds.length === 0
                          ? "Select staff members"
                          : staffOptions.filter((staff) => formStaffIds.includes(staff.id)).map((staff) => staff.name).join(", ")}
                      </span>
                      <span aria-hidden="true" className="ml-3 text-slate-500">{staffSelectOpen ? "▴" : "▾"}</span>
                    </button>
                    {staffSelectOpen && (
                      <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                        {staffOptions.map((staff) => (
                          <label key={staff.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={formStaffIds.includes(staff.id)}
                              onChange={() => setFormStaffIds((current) => current.includes(staff.id)
                                ? current.filter((id) => id !== staff.id)
                                : [...current, staff.id])}
                              className="h-4 w-4 rounded border-slate-300 text-[#0EA5E9] focus:ring-[#0EA5E9]"
                            />
                            <span className="font-medium text-slate-800">{staff.name}</span>
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
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-105 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingService
                    ? "Update Service"
                    : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}