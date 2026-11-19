import { Link, useSearchParams } from "react-router-dom";

export default function PackageCheckout() {
  const [searchParams] = useSearchParams();

  // Only accept known values; anything else falls back to a safe default
  const planId = searchParams.get("plan") === "enterprise" ? "enterprise" : "growth";
  const cycle = searchParams.get("cycle") === "annual" ? "annual" : "monthly";

  const isEnterprise = planId === "enterprise";
  const planName = isEnterprise ? "Enterprise Practice Tier" : "Growth Business Tier";
  const monthlyPrice = isEnterprise ? (cycle === "annual" ? 399 : 499) : cycle === "annual" ? 119 : 149;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            to="/dashboard/business/package/plans"
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <span>←</span> Back to Plans
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">{planName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            R{monthlyPrice} per month{cycle === "annual" ? " (billed annually)" : ""}
          </p>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Online payment is not available yet, so no payment details are collected and your
            subscription has not been changed.
          </div>

          <div className="mt-6 space-y-2 text-sm text-slate-700">
            <h2 className="font-bold text-slate-900">What this plan includes</h2>
            <p>✓ {isEnterprise ? "Unlimited" : "Up to 15"} staff members</p>
            <p>✓ {isEnterprise ? "Unlimited" : "20"} daily bookings per staff member</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/dashboard/business/package/plans"
              className="flex-1 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] py-3 text-center text-sm font-bold text-white shadow-sm hover:brightness-105"
            >
              Compare Plans
            </Link>
            <Link
              to="/dashboard/business/package"
              className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Back to Subscription
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}