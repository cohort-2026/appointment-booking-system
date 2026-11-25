import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../hooks/useAuth";

type PlanTier = {
  id: "basic" | "growth" | "enterprise";
  name: string;
  badge?: string;
  price: string;
  cadence: string;
  description: string;
  highlight?: boolean;
  features: string[];
  buttonText: string;
  disabled?: boolean;
};

const PLANS: PlanTier[] = [
  {
    id: "basic",
    name: "Starter Basic",
    price: "Free",
    cadence: "Forever free",
    description: "Ideal for small practices and solo clinics establishing an online presence.",
    features: [
      "Up to 3 staff members",
      "6 daily bookings per staff",
      "Standard directory placement",
      "Email OTP client verification",
      "Basic appointment history log",
    ],
    buttonText: "Current Plan",
    disabled: true,
  },
  {
    id: "growth",
    name: "Growth Business",
    badge: "Most Popular",
    price: "R149",
    cadence: "per month",
    description: "Designed for busy teams ready to expand their daily booking capacity and visibility.",
    highlight: true,
    features: [
      "Up to 15 staff members",
      "20 daily bookings per staff",
      "Priority featured search ranking",
      "Repeat-customer tracking & analytics",
      "Custom business profile branding",
      "Past client re-engagement tools",
      "Priority email & ticket support",
    ],
    buttonText: "Upgrade to Growth",
  },
  {
    id: "enterprise",
    name: "Enterprise Practice",
    badge: "Scale",
    price: "R499",
    cadence: "per month",
    description: "Full-scale solution for multi-location groups, high-volume centers, and franchised salons.",
    features: [
      "Unlimited staff members",
      "Unlimited daily bookings",
      "Top-tier placement across all categories",
      "Multi-location calendar synchronization",
      "Custom SMS/WhatsApp integration ready",
      "Dedicated account manager",
      "24/7 emergency phone support & SLA",
    ],
    buttonText: "Upgrade to Enterprise",
  },
];

export default function UpgradePlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const handleSelectPlan = (planId: string) => {
    navigate(`/dashboard/business/package/checkout?plan=${planId}&cycle=${billingCycle}`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Top Banner Navigation */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/dashboard/business/package" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
            <span>←</span> Back to Subscription
          </Link>
          <div className="text-xs text-slate-500">
            Signed in as: <strong className="text-slate-800">{user?.email}</strong>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <div className="mx-auto max-w-6xl px-6 pt-12 pb-6 text-center">
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-[#0EA5E9] uppercase tracking-wider">
          Capacity &amp; Licensing
        </span>
        <h1 className="mt-4 font-[Clash_Display] text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Scale your business with the right package
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
          Choose limits that support your staff headcount and booking volume. Upgrade or downgrade anytime.
        </p>

        {/* Billing Cycle Switcher */}
        <div className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-100 p-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-xl px-5 py-2 text-xs font-bold transition ${
              billingCycle === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("annual")}
            className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold transition ${
              billingCycle === "annual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Annual Billing</span>
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] text-white">Save 20%</span>
          </button>
        </div>
      </div>

      {/* 3 Package Cards Grid */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isAnnual = billingCycle === "annual";
            let displayPrice = plan.price;
            if (isAnnual && plan.id === "growth") displayPrice = "R119";
            if (isAnnual && plan.id === "enterprise") displayPrice = "R399";

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-3xl bg-white p-8 transition duration-200 ${
                  plan.highlight
                    ? "border-2 border-[#0EA5E9] shadow-xl shadow-sky-100/60 ring-4 ring-sky-50"
                    : "border border-slate-200 shadow-sm hover:shadow-md"
                }`}
              >
                {plan.badge && (
                  <span
                    className={`absolute -top-3.5 right-8 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm ${
                      plan.highlight ? "bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8]" : "bg-slate-900"
                    }`}
                  >
                    {plan.badge}
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-2 min-h-[40px] text-xs leading-relaxed text-slate-500">{plan.description}</p>

                  {/* Price */}
                  <div className="mt-6 flex items-baseline gap-2 border-b border-slate-100 pb-6">
                    <span className="font-[Clash_Display] text-4xl font-extrabold text-slate-900">{displayPrice}</span>
                    <span className="text-xs text-slate-500">{plan.id === "basic" ? plan.cadence : isAnnual ? "per month (billed annually)" : plan.cadence}</span>
                  </div>

                  {/* Features List */}
                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Included Features</p>
                    <ul className="mt-4 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-[#0EA5E9]">
                            ✓
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Call to Action Button */}
                <div className="mt-8 pt-4">
                  <button
                    type="button"
                    disabled={plan.disabled}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full rounded-xl py-3.5 text-sm font-semibold transition ${
                      plan.disabled
                        ? "cursor-not-allowed bg-slate-100 text-slate-400"
                        : plan.highlight
                        ? "bg-gradient-to-r from-[#0EA5E9] to-[#38BDF8] text-white shadow-md hover:brightness-105"
                        : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {plan.buttonText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature comparison guarantee footer */}
        <div className="mt-14 rounded-3xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 shadow-sm sm:p-8">
          <p className="font-semibold text-slate-800">
            Need custom limits or custom integrations?
          </p>
          <p className="mt-1">
            All plans include SSL encryption, multi-staff data isolation, and verified email delivery. You can downgrade back to Basic anytime as long as your staff roster is within the 3-member threshold.
          </p>
        </div>
      </div>
    </div>
  );
}