import { useState } from "react";

type Plan = "Basic" | "Growth";
type SubStatus = "Active" | "Trial" | "Cancelled";

type Subscription = {
  id: string;
  business: string;
  plan: Plan;
  status: SubStatus;
  providersUsed: number;
  renews: string;
};

// How many providers each plan allows
const planLimits: Record<Plan, number> = {
  Basic: 3,
  Growth: 10,
};

const mockSubscriptions: Subscription[] = [
  {
    id: "1",
    business: "Riverside Wellness",
    plan: "Basic",
    status: "Trial",
    providersUsed: 5,
    renews: "2026-11-11",
  },
  {
    id: "2",
    business: "Bright Smiles Dental",
    plan: "Basic",
    status: "Active",
    providersUsed: 3,
    renews: "2026-11-27",
  },
  {
    id: "3",
    business: "Urban Cuts Barbershop",
    plan: "Growth",
    status: "Active",
    providersUsed: 4,
    renews: "2026-11-15",
  },
  {
    id: "4",
    business: "Zen Physio",
    plan: "Basic",
    status: "Cancelled",
    providersUsed: 2,
    renews: "-",
  },
];

const statusStyles: Record<SubStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Trial: "bg-sky-50 text-sky-700",
  Cancelled: "bg-slate-100 text-slate-600",
};

const selectClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-sky-400";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

export default function Subscriptions() {
  const [subs, setSubs] = useState<Subscription[]>(mockSubscriptions);

  const changePlan = (id: string, plan: Plan) => {
    setSubs((current) =>
      current.map((s) => (s.id === id ? { ...s, plan } : s))
    );
  };

  const isOverLimit = (s: Subscription) =>
    s.providersUsed > planLimits[s.plan];

  const activeCount = subs.filter((s) => s.status === "Active").length;
  const growthCount = subs.filter((s) => s.plan === "Growth").length;
  const overLimitCount = subs.filter(isOverLimit).length;

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Subscriptions</h2>
        <p className="mt-1 text-sm text-slate-500">
          View plans, capacity limits and upgrades.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Active subscriptions</p>
          <p className="mt-2 text-3xl font-bold">{activeCount}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-slate-500">On Growth plan</p>
          <p className="mt-2 text-3xl font-bold">{growthCount}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Over provider limit</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {overLimitCount}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Business</th>
              <th className="px-5 py-3 font-semibold">Plan</th>
              <th className="px-5 py-3 font-semibold">Providers</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Renews</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {subs.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-4 font-semibold">{s.business}</td>
                <td className="px-5 py-4">
                  <select
                    value={s.plan}
                    onChange={(e) => changePlan(s.id, e.target.value as Plan)}
                    className={selectClass}
                  >
                    <option value="Basic">Basic</option>
                    <option value="Growth">Growth</option>
                  </select>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={
                      isOverLimit(s)
                        ? "font-semibold text-amber-600"
                        : "text-slate-700"
                    }
                  >
                    {s.providersUsed} / {planLimits[s.plan]}
                  </span>
                  {isOverLimit(s) && (
                    <span className="ml-2 text-xs text-amber-600">
                      Over limit
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[s.status]}`}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-500">{s.renews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}