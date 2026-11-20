import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { to: "/dashboard/customer", label: "Dashboard", icon: "⌂", end: true },
  { to: "/dashboard/customer/book", label: "Book a service", icon: "＋" },
  { to: "/dashboard/customer/appointments", label: "My appointments", icon: "▣" },
  { to: "/dashboard/customer/profile", label: "My profile", icon: "◈" },
];

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = user ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Customer";
  const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900">
      {menuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0B1220] transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <Link to="/dashboard/customer" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-300 to-sky-500 font-bold text-slate-950">IT</span>
            <span className="text-base font-bold tracking-tight text-white">ITThynk<span className="text-sky-400">Appoint</span></span>
          </Link>
        </div>
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Customer account</p>
          <p className="mt-2 truncate font-semibold text-white">{name}</p>
          <p className="mt-1 truncate text-sm text-slate-400">{user?.email}</p>
        </div>
        <nav aria-label="Customer dashboard" className="flex-1 space-y-1 px-3 py-6">
          {navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
            <span className="w-5 text-center text-lg" aria-hidden="true">{item.icon}</span>{item.label}
          </NavLink>)}
        </nav>
        <div className="border-t border-white/10 p-4">
          <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-300"><span aria-hidden="true">↪</span>Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open navigation" onClick={() => setMenuOpen(true)} className="rounded-xl border border-slate-200 p-2 lg:hidden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Your account</p><p className="hidden text-sm text-slate-500 sm:block">Appointments made simple.</p></div>
          </div>
          <Link to="/dashboard/customer/profile" className="flex items-center gap-3 rounded-full p-1.5 pr-3 transition hover:bg-slate-50">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-bold text-white">{initials || "C"}</span>
            <span className="hidden text-left sm:block"><span className="block max-w-40 truncate text-sm font-semibold">{name}</span><span className="block text-xs text-slate-500">Customer</span></span>
          </Link>
        </header>
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8"><Outlet /></main>
        <footer className="border-t border-slate-200 bg-white px-6 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} ITThynkAppoint</footer>
      </div>
    </div>
  );
}
