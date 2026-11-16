import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { label: "Overview", path: "/dashboard/staff", icon: "▦", end: true },
  { label: "Appointments", path: "/dashboard/staff/appointments", icon: "▣" },
  { label: "Availability", path: "/dashboard/staff/availability", icon: "◷" },
  { label: "Profile", path: "/dashboard/staff/profile", icon: "♙" },
];

export default function StaffLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const title = navItems.find((item) => item.end
    ? location.pathname === item.path
    : location.pathname.startsWith(item.path))?.label ?? "Staff";
  const fullName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col bg-[#0B1220] pt-2 transition-transform duration-200 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-20 shrink-0 items-center border-b border-white/10 px-6">
          <NavLink to="/dashboard/staff" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-bold text-slate-950">IT</span>
            <span className="text-base font-bold text-white">ITThynk<span className="text-sky-400">Appoint</span></span>
          </NavLink>
        </div>
        <div className="shrink-0 border-b border-white/10 px-6 py-5">
          <p className="text-xs font-medium text-slate-400">Staff workspace</p>
          <h2 className="mt-1 truncate text-base font-semibold text-white">{fullName || "Staff member"}</h2>
          <p className="mt-1 truncate text-xs text-sky-400">{user?.email}</p>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-hidden px-3 py-4" aria-label="Staff navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `relative flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              {({ isActive }) => <>
                {isActive && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-sky-400" />}
                <span className="w-5 text-center text-lg">{item.icon}</span>
                {item.label}
              </>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto shrink-0 border-t border-white/10 p-4">
          <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400">
            <span aria-hidden="true">↪</span> Logout
          </button>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="rounded-lg border border-slate-200 p-2 lg:hidden" aria-label="Open menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span aria-hidden="true" className="h-9 w-1 rounded-full bg-sky-500" />
            <div>
              <p className="text-[10px] font-bold uppercase text-sky-700">Staff workspace</p>
              <h1 className="font-[Clash_Display] text-2xl font-bold text-slate-950">{title}</h1>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-800">{fullName}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </header>
        <div className="p-4 sm:p-6 lg:p-8"><Outlet /></div>
      </main>
    </div>
  );
}
