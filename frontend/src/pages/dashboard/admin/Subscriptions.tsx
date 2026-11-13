import { useState } from "react";
import {
  canAddProvider,
  planLimits,
  type Plan,
} from "../../../utils/providerLimits";

type SubStatus = "Active" | "Trial" | "Paused" | "Cancelled";

type Subscription = {
  id: string;
  business: string;
  plan: Plan;
  status: SubStatus;
  pausedFrom?: SubStatus;
  providersUsed: number;
  renews: string;
};

const mockSubscriptions: Subscription[] = [
  {
    id: "1",
    business: "Riverside Wellness",
    plan: "Basic",
    status: "Trial",
    providersUsed: 3,
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
  Paused: "bg-slate-100 text-slate-700",
  Cancelled: "bg-red-50 text-red-700",
};

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

const pauseButtonClass =
  "text-sm font-semibold text-amber-600 hover:underline";

const resumeButtonClass =
  "text-sm font-semibold text-emerald-600 hover:underline";

export default function Subscriptions() {
  const [subs, setSubs] = useState<Subscription[]>(mockSubscriptions);

  const pauseSubscription = (id: string) => {
    setSubs((current) =>
      current.map((s) =>
        s.id === id ? { ...s, status: "Paused", pausedFrom: s.status } : s
      )
    );
  };

  const resumeSubscription = (id: string) => {
    setSubs((current) =>
      current.map((s) =>
        s.id === id
          ? { ...s, status: s.pausedFrom ?? "Active", pausedFrom: undefined }
          : s
      )
    );
  };

  const isFull = (s: Subscription) =>
    !canAddProvider(s.plan, s.providersUsed);

  const canPause = (s: Subscription) =>
    s.status === "Active" || s.status === "Trial";

  const activeCount = subs.filter((s) => s.status === "Active").length;
  const pausedCount = subs.filter((s) => s.status === "Paused").length;
  const fullCount = subs.filter(isFull).length;

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Subscriptions</h2>
        <p className="mt-1 text-sm text-slate-500">
          View each business&apos;s plan and capacity. Pause a subscription if
          something looks wrong.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Active subscriptions</p>
          <p className="mt-2 text-3xl font-bold">{activeCount}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Paused</p>
          <p className="mt-2 text-3xl font-bold text-slate-600">
            {pausedCount}
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-slate-500">At provider limit</p>
          <p className="mt-2 text-3xl font-bold">{fullCount}</p>
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
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {subs.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-4 font-semibold">{s.business}</td>
                <td className="px-5 py-4 text-slate-700">{s.plan}</td>
                <td className="px-5 py-4 text-slate-700">
                  {s.providersUsed} / {planLimits[s.plan]}
                  {isFull(s) && (
                    <span className="ml-2 text-xs text-slate-500">Full</span>
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
                <td className="px-5 py-4 text-right">
                  {canPause(s) && (
                    <button
                      type="button"
                      onClick={() => pauseSubscription(s.id)}
                      className={pauseButtonClass}
                    >
                      Pause
                    </button>
                  )}
                  {s.status === "Paused" && (
                    <button
                      type="button"
                      onClick={() => resumeSubscription(s.id)}
                      className={resumeButtonClass}
                    >
                      Resume
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}