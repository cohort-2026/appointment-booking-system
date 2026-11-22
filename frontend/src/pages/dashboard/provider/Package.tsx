import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "../../../services/api";

type PlanTier = "BASIC" | "GROWTH";

type SubscriptionInfo = {
  tier: PlanTier;
  status: string;
  paymentStatus: string;
  dailyAppointmentLimit?: number | null;
  monthlyPrice: number;
  nextBillingDate?: string | null;
};

type Plan = {
  tier: PlanTier;
  monthlyPrice: number;
  dailyAppointmentLimit: number | null;
  featureFlags: Record<string, boolean> | null;
};

type DashboardResponse = {
  subscription: SubscriptionInfo | null;
};

const featureLabels: Record<string, string> = {
  standardPlacement: "Standard placement",
  featuredPlacement: "Featured placement",
  repeatCustomerAnalytics: "Repeat-customer analytics",
  customBranding: "Custom profile branding",
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(price);

export default function Package() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [changingTier, setChangingTier] = useState<PlanTier | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [dashboard, availablePlans] = await Promise.all([
          apiFetch<DashboardResponse>("/provider/dashboard"),
          apiFetch<Plan[]>("/provider/packages"),
        ]);
        setSubscription(dashboard.subscription);
        setPlans(availablePlans);
      } catch (error) {
        console.error("Provider subscription fetch failed:", error);
        toast.error(error instanceof Error ? error.message : "Unable to load subscription details.");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDetails();
  }, []);

  const changePlan = async (tier: PlanTier) => {
    if (tier !== "BASIC") return;
    setChangingTier(tier);
    try {
      const response = await apiFetch<{ subscription: SubscriptionInfo }>("/provider/subscription", {
        method: "PATCH",
        body: JSON.stringify({ tier }),
      });
      setSubscription(response.subscription);
      toast.success("Basic plan activated.");
    } catch (error) {
      console.error("Provider subscription change failed:", error);
      toast.error(error instanceof Error ? error.message : "Unable to change plan.");
    } finally {
      setChangingTier(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse space-y-6" role="status" aria-label="Loading subscription plans">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="grid gap-5 md:grid-cols-2">
          {[0, 1].map((plan) => <div key={plan} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6"><div className="h-6 w-1/3 rounded bg-slate-200" /><div className="h-8 w-1/2 rounded bg-slate-100" /><div className="h-4 w-full rounded bg-slate-100" /><div className="h-4 w-4/5 rounded bg-slate-100" /><div className="h-10 w-full rounded-lg bg-slate-100" /></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>
        <p className="mt-1 text-slate-500">Review your plan or switch to another plan.</p>
      </div>

      {subscription ? (
        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-slate-500">Current plan</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{subscription.tier}</h2>
            </div>
            <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              {subscription.status}
            </span>
          </div>

          <dl className="grid gap-6 p-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Monthly price</dt>
              <dd className="mt-1 font-semibold text-slate-900">{subscription.tier === "BASIC" ? "Free" : formatPrice(subscription.monthlyPrice)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Payment status</dt>
              <dd className="mt-1 font-semibold text-slate-900">{subscription.tier === "BASIC" ? "Free" : subscription.paymentStatus}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Daily appointment limit</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {subscription.dailyAppointmentLimit ?? "No limit specified"}
              </dd>
            </div>
            {subscription.tier === "GROWTH" && <div>
              <dt className="text-sm text-slate-500">Next billing date</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : "Not scheduled"}
              </dd>
            </div>}
          </dl>
        </section>
      ) : (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900">No active subscription</h2>
          <p className="mt-2 text-sm text-slate-500">Choose a plan below to activate your provider subscription.</p>
        </section>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Available plans</h2>
        <p className="mt-1 text-sm text-slate-500">Basic is available. Paid upgrades are not available yet.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = subscription?.tier === plan.tier;
          const isChanging = changingTier === plan.tier;
          const targetIsUpgrade =
            subscription !== null && plan.monthlyPrice > subscription.monthlyPrice;
          const enabledFeatures = Object.entries(plan.featureFlags ?? {})
            .filter(([feature, enabled]) => enabled && featureLabels[feature])
            .map(([feature]) => featureLabels[feature]);

          return (
            <section
              key={plan.tier}
              className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
                isCurrent ? "border-sky-300 ring-1 ring-sky-200" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{plan.tier}</h3>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {plan.tier === "BASIC" ? "Free" : formatPrice(plan.monthlyPrice)}
                    {plan.tier === "GROWTH" && <span className="text-sm font-normal text-slate-500"> / month</span>}
                  </p>
                </div>
                {isCurrent && (
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    Current plan
                  </span>
                )}
              </div>

              <p className="mt-5 text-sm text-slate-600">
                {plan.dailyAppointmentLimit === null
                  ? "No daily appointment limit"
                  : `Up to ${plan.dailyAppointmentLimit} appointments per day`}
              </p>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                {enabledFeatures.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="font-semibold text-emerald-600" aria-hidden="true">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={plan.tier === "GROWTH" || isCurrent || changingTier !== null}
                onClick={() => void changePlan(plan.tier)}
                className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${
                  isCurrent
                    ? "bg-slate-100 text-slate-500"
                    : "bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
                }`}
              >
                {isChanging
                  ? "Updating plan..."
                  : isCurrent
                    ? "Current plan"
                    : plan.tier === "GROWTH"
                      ? "Not available yet"
                    : subscription
                      ? `${targetIsUpgrade ? "Upgrade" : "Downgrade"} to ${plan.tier}`
                      : `Choose ${plan.tier}`}
              </button>
            </section>
          );
        })}
      </div>

      {plans.length > 0 && (
        <p className="mt-5 text-sm text-slate-500">
          Paid upgrades are disabled until payment processing is available.
        </p>
      )}
    </div>
  );
}
