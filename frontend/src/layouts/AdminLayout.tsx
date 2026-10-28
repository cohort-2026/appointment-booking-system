import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

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

type NavItem = {
  label: string;
  icon: string;
  to: string;
  end?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: "▦", to: "/dashboard/admin", end: true },
  { label: "Users", icon: "♙", to: "/dashboard/admin/users" },
  { label: "Businesses", icon: "◈", to: "/dashboard/admin/businesses" },
  { label: "Providers", icon: "◷", to: "/dashboard/admin/providers" },
  { label: "Appointments", icon: "▤", to: "/dashboard/admin/appointments" },
  { label: "Services", icon: "◉", to: "/dashboard/admin/services" },
  { label: "Subscriptions", icon: "◇", to: "/dashboard/admin/subscriptions" },
  { label: "Reports", icon: "▣", to: "/dashboard/admin/reports" },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user: authUser, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const user = authUser as User | null;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F7FB]">
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName ?? ""}`.trim();
  const initials = `${user.firstName.charAt(0)}${
    user.lastName ? user.lastName.charAt(0) : ""
  }`.toUpperCase();

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 pt-2 z-50 flex w-64 flex-col bg-[#0B1220] transition-transform duration-200 ${
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <button
            type="button"
            onClick={() => navigate("/dashboard/admin")}
            className="flex pb-2 items-center gap-3"
          >
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
          </button>
        </div>

        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-xs font-medium text-slate-400">Signed in as</p>
          <h2 className="mt-1 truncate text-base font-semibold text-white">
            {fullName}
          </h2>
          <p className="mt-1 text-sm text-slate-400">Platform Admin</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 pb-6 pt-7">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `relative flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                }`
              }
            >
              {({ isActive }) => (
                <>
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
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg border border-slate-200 p-2 lg:hidden"
              aria-label="Open menu"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Admin dashboard
              </h1>
              <p className="hidden text-sm text-slate-500 sm:block">
                Oversee users, businesses and platform activity.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-white"
                style={{ backgroundColor: ACCENT_FROM }}
              />
            </button>

            <div className="hidden items-center gap-3 sm:flex">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT_TO}, ${ACCENT_FROM})`,
                }}
              >
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold">{fullName}</p>
                <p className="text-xs text-slate-500">Platform Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* The active page renders here */}
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-500 sm:flex-row">
            <p>
              © {new Date().getFullYear()} ITThynkAppoint. All rights
              reserved.
            </p>

            <div className="flex items-center gap-5">
              <a href="#" className="hover:text-slate-700">
                Privacy policy
              </a>
              <a href="#" className="hover:text-slate-700">
                Terms of service
              </a>
              <a href="#" className="hover:text-slate-700">
                Support
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}