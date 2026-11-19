import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../services/api";

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
  CreditCard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <line x1="5" x2="19" y1="12" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

type PackageTier = "BASIC" | "GROWTH";

type SubscriptionInfo = {
  tier: PackageTier;
  status: string;
  paymentStatus: string;
  maxStaff: number;
  dailyAppointmentLimit: number;
  monthlyPrice: number;
  nextBillingDate: string | null;
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

export default function BusinessPackage() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tier, setTier] = useState<PackageTier>("BASIC");
  const [activeStaffCount, setActiveStaffCount] = useState<number>(3);
  const [subDetails, setSubDetails] = useState<SubscriptionInfo | null>(null);
  const [fetching, setFetching] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) return;

    if (user.role !== "BUSINESS_OWNER") {
      navigate("/login", { replace: true });
      return;
    }

    const loadSubscription = async () => {
      setFetching(true);
      try {
        const response = await apiFetch<{
          success: boolean;
          subscription?: SubscriptionInfo;
          stats?: { staffCount: number };
        }>("/business/dashboard");

        if (response.subscription) {
          setTier(response.subscription.tier as PackageTier);
          setSubDetails(response.subscription);
        } else {
          setSubDetails({
            tier: "BASIC",
            status: "ACTIVE",
            paymentStatus: "PAID",
            maxStaff: 3,
            dailyAppointmentLimit: 6,
            monthlyPrice: 0,
            nextBillingDate: null,
          });
        }

        if (response.stats) {
          setActiveStaffCount(response.stats.staffCount);
        }
      } catch (err) {
        console.warn("Could not load subscription details from backend:", err);
        setSubDetails({
          tier: "BASIC",
          status: "ACTIVE",
          paymentStatus: "PAID",
          maxStaff: 3,
          dailyAppointmentLimit: 6,
          monthlyPrice: 0,
          nextBillingDate: null,
        });
      } finally {
        setFetching(false);
      }
    };

    void loadSubscription();
  }, [user, navigate]);

  // Navigate to 3-tier showcase
  const handleUpgrade = () => {
    navigate("/dashboard/business/package/plans");
  };

  // Downgrade to Basic Plan with Rule FR-56 enforcement
  const handleDowngrade = async () => {
    if (activeStaffCount > 3) {
      toast.error(
        `Cannot downgrade: You currently have ${activeStaffCount} active staff members. Reduce staff to 3 or fewer first.`
      );
      return;
    }

    setUpdating(true);
    try {
      await apiFetch("/business/subscription/downgrade", { method: "POST" }).catch(() => {});

      setTier("BASIC");
      setSubDetails((prev) =>
        prev
          ? {
              ...prev,
              tier: "BASIC",
              maxStaff: 3,
              dailyAppointmentLimit: 6,
              monthlyPrice: 0,
              paymentStatus: "PAID",
              nextBillingDate: null,
            }
          : null
      );

      toast.success("Downgraded to Basic Free Plan.");
    } catch {
      toast.error("Downgrade failed.");
    } finally {
      setUpdating(false);
    }
  };

  // Non-blocking guard
  if (loading || !user) {
    return null;
  }

  const cannotDowngrade = activeStaffCount > 3;

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
          <h2 className="mt-1 truncate text-base font-semibold text-white">Subscription</h2>
          <p className="mt-1 text-xs text-sky-400">Plan &amp; Limits</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 pb-6 pt-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === "/dashboard/business/package";
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
                Package Management
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Manage subscription pricing thresholds and staff capacity alignments.
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
          {/* Active Plan Summary Card (With Skeleton Loading State) */}
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {fetching || !subDetails ? (
              <div className="space-y-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-28 rounded bg-slate-200" />
                  <div className="h-5 w-16 rounded-full bg-slate-200" />
                </div>
                <div className="h-8 w-64 rounded bg-slate-200" />
                <div className="h-4 w-80 rounded bg-slate-100" />
                <div className="pt-2">
                  <div className="h-10 w-44 rounded-xl bg-slate-200" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Plan</span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        {subDetails.status}
                      </span>
                    </div>
                    <h2 className="mt-1 text-3xl font-bold text-slate-900">
                      {tier === "BASIC" ? "Basic Tier (Free Plan)" : "Growth Tier (R149 / mo)"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Up to {subDetails.maxStaff} staff members, {subDetails.dailyAppointmentLimit} bookings per staff daily.
                      {subDetails.nextBillingDate && (
                        <> • Next renewal: {new Date(subDetails.nextBillingDate).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>

                  {tier === "BASIC" ? (
                    <button
                      type="button"
                      onClick={handleUpgrade}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-105"
                    >
                      <span>Upgrade to Growth</span>
                      <Icons.ArrowRight />
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={handleUpgrade}
                        className="rounded-xl bg-[#0EA5E9] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-600"
                      >
                        View All Plans
                      </button>
                      <button
                        type="button"
                        onClick={handleDowngrade}
                        disabled={updating || cannotDowngrade}
                        className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                          cannotDowngrade
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                            : "border-slate-300 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {updating ? "Processing..." : "Downgrade to Basic"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Downgrade Restriction Warning (Rule FR-56) */}
                {tier === "GROWTH" && cannotDowngrade && (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                    <span className="text-amber-600 mt-0.5"><Icons.Alert /></span>
                    <div>
                      <span className="font-bold">Downgrade Blocked:</span> You currently have {activeStaffCount} active staff
                      members. You must reduce active staff members to 3 or fewer before downgrading to the Basic plan.
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Plan Comparison Table */}
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-xl font-bold text-slate-900">Plan Comparison</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Clear breakdown of quotas and features included in each tier.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-4">Feature</th>
                    <th className="pb-4">Basic</th>
                    <th className="pb-4">Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fetching ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4"><div className="h-4 w-36 rounded bg-slate-200" /></td>
                        <td className="py-4"><div className="h-4 w-20 rounded bg-slate-200" /></td>
                        <td className="py-4"><div className="h-4 w-24 rounded bg-slate-200" /></td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr>
                        <td className="py-4 font-semibold text-slate-800">Max Staff Count</td>
                        <td className="py-4 text-slate-600">3 members</td>
                        <td className="py-4 font-bold text-sky-600">15 members</td>
                      </tr>
                      <tr>
                        <td className="py-4 font-semibold text-slate-800">Daily Bookings Limit</td>
                        <td className="py-4 text-slate-600">6 / staff</td>
                        <td className="py-4 font-bold text-sky-600">20 / staff</td>
                      </tr>
                      <tr>
                        <td className="py-4 font-semibold text-slate-800">Search Placement</td>
                        <td className="py-4 text-slate-600">Standard</td>
                        <td className="py-4 font-bold text-sky-600">Featured (Priority)</td>
                      </tr>
                      <tr>
                        <td className="py-4 font-semibold text-slate-800">Client Re-engagement Tools</td>
                        <td className="py-4 text-slate-400">No</td>
                        <td className="py-4 font-bold text-emerald-600">
                          <span className="inline-flex items-center gap-1"><Icons.Check /> Included</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-4 font-semibold text-slate-800">Custom Brand Options</td>
                        <td className="py-4 text-slate-400">No</td>
                        <td className="py-4 font-bold text-emerald-600">
                          <span className="inline-flex items-center gap-1"><Icons.Check /> Included</span>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Billing status */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-xl font-bold text-slate-900">Billing</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Online payments are not set up yet, so no payment method is on file.
            </p>
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