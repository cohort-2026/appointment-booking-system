import { useState } from "react";

type BusinessStatus = "Approved" | "Pending" | "Suspended";

type Business = {
  id: string;
  name: string;
  owner: string;
  email: string;
  providerCount: number;
  status: BusinessStatus;
  registered: string;
};

const mockBusinesses: Business[] = [
  {
    id: "1",
    name: "Riverside Wellness",
    owner: "Nomsa Dube",
    email: "info@riverside.example.com",
    providerCount: 5,
    status: "Pending",
    registered: "2026-10-28",
  },
  {
    id: "2",
    name: "Bright Smiles Dental",
    owner: "Pieter van Wyk",
    email: "hello@brightsmiles.example.com",
    providerCount: 3,
    status: "Approved",
    registered: "2026-10-27",
  },
  {
    id: "3",
    name: "Urban Cuts Barbershop",
    owner: "Kabelo Maseko",
    email: "book@urbancuts.example.com",
    providerCount: 4,
    status: "Approved",
    registered: "2026-10-15",
  },
  {
    id: "4",
    name: "Zen Physio",
    owner: "Naledi Khumalo",
    email: "team@zenphysio.example.com",
    providerCount: 2,
    status: "Suspended",
    registered: "2026-10-05",
  },
];

const statusStyles: Record<BusinessStatus, string> = {
  Approved: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Suspended: "bg-red-50 text-red-700",
};

const inputClass =
  "rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-400";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

export default function Businesses() {
  const [businesses, setBusinesses] = useState<Business[]>(mockBusinesses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BusinessStatus | "ALL">(
    "ALL"
  );

  const updateStatus = (id: string, status: BusinessStatus) => {
    setBusinesses((current) =>
      current.map((b) => (b.id === id ? { ...b, status } : b))
    );
  };

  const countByStatus = (status: BusinessStatus) =>
    businesses.filter((b) => b.status === status).length;

  const filteredBusinesses = businesses.filter((b) => {
    const term = search.toLowerCase();
    const matchesSearch =
      b.name.toLowerCase().includes(term) ||
      b.owner.toLowerCase().includes(term) ||
      b.email.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Businesses</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review and approve business accounts.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Total businesses</p>
          <p className="mt-2 text-3xl font-bold">{businesses.length}</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Pending approval</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {countByStatus("Pending")}
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-sm text-slate-500">Suspended</p>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {countByStatus("Suspended")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by business, owner or email"
          className={`${inputClass} w-full sm:max-w-sm`}
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as BusinessStatus | "ALL")
          }
          className={inputClass}
        >
          <option value="ALL">All statuses</option>
          <option value="Approved">Approved</option>
          <option value="Pending">Pending</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Business</th>
              <th className="px-5 py-3 font-semibold">Owner</th>
              <th className="px-5 py-3 font-semibold">Providers</th>
              <th className="px-5 py-3 font-semibold">Registered</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredBusinesses.map((b) => (
              <tr key={b.id}>
                <td className="px-5 py-4">
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-xs text-slate-500">{b.email}</p>
                </td>
                <td className="px-5 py-4 text-slate-700">{b.owner}</td>
                <td className="px-5 py-4 text-slate-700">{b.providerCount}</td>
                <td className="px-5 py-4 text-slate-500">{b.registered}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[b.status]}`}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  {b.status !== "Approved" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(b.id, "Approved")}
                      className="mr-3 text-sm font-semibold text-emerald-600 hover:underline"
                    >
                      Approve
                    </button>
                  )}
                  {b.status !== "Suspended" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(b.id, "Suspended")}
                      className="text-sm font-semibold text-red-600 hover:underline"
                    >
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {filteredBusinesses.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No businesses match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}