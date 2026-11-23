import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { apiFetch } from "../services/api";
import { BusinessDashboardProvider, type BusinessDashboardResponse } from "../context/BusinessDashboardContext";
import { formatBusinessName } from "../lib/formatBusinessName";

const ACCENT_FROM = "#0EA5E9";
const ACCENT_TO = "#38BDF8";

type NavItem = {
  label: string;
  icon: string;
  path: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: "▦", path: "/dashboard/business" },
  { label: "Appointments", icon: "▣", path: "/dashboard/business/appointments" },
  { label: "Services", icon: "◈", path: "/dashboard/business/services" },
  { label: "Staff", icon: "♙", path: "/dashboard/business/staff" },
  { label: "Subscription", icon: "◇", path: "/dashboard/business/package" },
  { label: "Analytics", icon: "↗", path: "/dashboard/business/analytics" },
  { label: "Settings", icon: "⚙", path: "/dashboard/business/profile" },
];

export default function BusinessLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState<BusinessDashboardResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const businessName = formatBusinessName((user?.business as { name?: string } | undefined)?.name) || "My Business";
  const userId = user?.id;
  const routeTitles: Array<[string, string]> = [
    ["/dashboard/business/appointments", "Appointments"],
    ["/dashboard/business/services", "Services"],
    ["/dashboard/business/staff/", "Staff Details"],
    ["/dashboard/business/staff", "Staff"],
    ["/dashboard/business/package/plans", "Plan availability"],
    ["/dashboard/business/package/checkout", "Checkout unavailable"],
    ["/dashboard/business/package/success", "Payment unavailable"],
    ["/dashboard/business/package", "Subscription"],
    ["/dashboard/business/analytics", "Analytics"],
    ["/dashboard/business/profile", "Settings"],
  ];
  const pageTitle = routeTitles.find(([path]) =>
    path.endsWith("/") ? location.pathname.startsWith(path) : location.pathname === path,
  )?.[1] ?? "Overview";

  useEffect(() => {
    if (!userId) return;
    let active = true;

    void apiFetch<BusinessDashboardResponse>("/business/dashboard")
      .then((response) => {
        if (active) setDashboardData(response);
      })
      .catch((error: unknown) => {
        if (active) setDashboardError(error instanceof Error ? error.message : "Unable to load business overview.");
      })
      .finally(() => {
        if (active) setDashboardLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <BusinessDashboardProvider value={{ data: dashboardData, loading: dashboardLoading, error: dashboardError }}>
    <div className="business-layout min-h-screen bg-[#F4F7FB] text-slate-900">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col bg-[#0B1220] transition-transform duration-200 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-24 items-center border-b border-white/10 px-6 pt-4">
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
            {businessName}
          </h2>
          <p className="mt-1 text-xs text-sky-400">Business Owner</p>
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 py-3">
          {navItems.map((item) => {
            const isActive = item.path === "/dashboard/business"
              ? location.pathname === item.path
              : location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <button
                key={item.label}
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(item.path);
                }}
                className={`relative flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${
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
                <span className="w-5 text-center text-lg">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-white/10 p-4">
          <button
            onClick={() => void logout()}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Header */}
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

            <span aria-hidden="true" className="h-9 w-1 rounded-full bg-sky-500" />
            <div>
              <p className="text-[10px] font-bold uppercase text-sky-700">Business console</p>
              <h1 className="font-[Clash_Display] text-2xl font-bold text-slate-950 sm:text-[28px]">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_TO}, ${ACCENT_FROM})`,
              }}
            >
              {businessName ? businessName.slice(0, 2).toUpperCase() : "BU"}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">{businessName}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
        </header>

        {/* Child Pages Render Inside Outlet */}
        <main className="business-page-content">
          <Outlet />
        </main>
      </div>
    </div>
    </BusinessDashboardProvider>
  );
}