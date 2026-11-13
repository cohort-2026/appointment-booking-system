import { useState } from "react";

type ProviderStatus = "Approved" | "Pending" | "Paused" | "Suspended";
type ProviderType = "Sole provider" | "Business staff";

type Provider = {
  id: string;
  name: string;
  email: string;
  type: ProviderType;
  services: string[];
  status: ProviderStatus;
  joined: string;
};

const mockProviders: Provider[] = [
  {
    id: "1",
    name: "Amanda Cele",
    email: "amanda@example.com",
    type: "Sole provider",
    services: ["Massage", "Facial"],
    status: "Approved",
    joined: "2026-10-28",
  },
  {
    id: "2",
    name: "Lerato Nkosi",
    email: "lerato@example.com",
    type: "Business staff",
    services: ["Dental check-up"],
    status: "Pending",
    joined: "2026-10-27",
  },
  {
    id: "3",
    name: "Kabelo Maseko",
    email: "kabelo@example.com",
    type: "Sole provider",
    services: ["Haircut", "Beard trim"],
    status: "Approved",
    joined: "2026-10-20",
  },
  {
    id: "4",
    name: "Naledi Khumalo",
    email: "naledi@example.com",
    type: "Business staff",
    services: ["Physiotherapy"],
    status: "Suspended",
    joined: "2026-10-10",
  },
];

const statusStyles: Record<ProviderStatus, string> = {
  Approved: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Paused: "bg-slate-100 text-slate-700",
  Suspended: "bg-red-50 text-red-700",
};

const inputClass =
  "rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-400";

const statusSelectClass =
  "cursor-pointer rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none";

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>(mockProviders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProviderStatus | "ALL">(
    "ALL"
  );

  const updateStatus = (id: string, status: ProviderStatus) => {
    setProviders((current) =>
      current.map((p) => (p.id === id ? { ...p, status } : p))
    );
  };

  const filteredProviders = providers.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = providers.filter((p) => p.status === "Pending").length;

  return (
    <section>
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Providers</h2>
          <p className="mt-1 text-sm text-slate-500">
            Review, approve and manage service providers.
          </p>
        </div>

        {pendingCount > 0 && (
          <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {pendingCount} waiting for approval
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className={`${inputClass} w-full sm:max-w-sm`}
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ProviderStatus | "ALL")
          }
          className={inputClass}
        >
          <option value="ALL">All statuses</option>
          <option value="Approved">Approved</option>
          <option value="Pending">Pending</option>
          <option value="Paused">Paused</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Provider</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">Services</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredProviders.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-4">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.email}</p>
                </td>
                <td className="px-5 py-4 text-slate-700">{p.type}</td>
                <td className="px-5 py-4 text-slate-700">
                  {p.services.join(", ")}
                </td>
                <td className="px-5 py-4">
                  <select
                    value={p.status}
                    aria-label={`Change status for ${p.name}`}
                    onChange={(e) =>
                      updateStatus(p.id, e.target.value as ProviderStatus)
                    }
                    className={`${statusSelectClass} ${statusStyles[p.status]}`}
                  >
                    <option value="Pending" disabled>
                      Pending
                    </option>
                    <option value="Approved">Approved</option>
                    <option value="Paused">Paused</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </td>
              </tr>
            ))}

            {filteredProviders.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No providers match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}