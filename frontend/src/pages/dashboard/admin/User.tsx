import { useState } from "react";

type ClientStatus = "Active" | "Suspended";

type Client = {
  id: string;
  name: string;
  email: string;
  bookings: number;
  status: ClientStatus;
  joined: string;
};

const mockClients: Client[] = [
  {
    id: "1",
    name: "Thabo Mokoena",
    email: "thabo@example.com",
    bookings: 6,
    status: "Active",
    joined: "2026-10-27",
  },
  {
    id: "2",
    name: "Zanele Mthembu",
    email: "zanele@example.com",
    bookings: 3,
    status: "Active",
    joined: "2026-10-22",
  },
  {
    id: "3",
    name: "Sipho Dlamini",
    email: "sipho@example.com",
    bookings: 1,
    status: "Suspended",
    joined: "2026-10-12",
  },
  {
    id: "4",
    name: "Ayanda Ncube",
    email: "ayanda@example.com",
    bookings: 0,
    status: "Active",
    joined: "2026-10-28",
  },
];

const statusStyles: Record<ClientStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Suspended: "bg-red-50 text-red-700",
};

const inputClass =
  "rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-400";

export default function Clients() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "ALL">(
    "ALL"
  );

  const toggleSuspend = (id: string) => {
    setClients((current) =>
      current.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "Active" ? "Suspended" : "Active" }
          : c
      )
    );
  };

  const filteredClients = clients.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <section>
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Clients</h2>
          <p className="mt-1 text-sm text-slate-500">
            Customers who book appointments on the platform.
          </p>
        </div>

        <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          {clients.length} clients
        </span>
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
            setStatusFilter(e.target.value as ClientStatus | "ALL")
          }
          className={inputClass}
        >
          <option value="ALL">All statuses</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Client</th>
              <th className="px-5 py-3 font-semibold">Bookings</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredClients.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-4">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.email}</p>
                </td>
                <td className="px-5 py-4 text-slate-700">{c.bookings}</td>
                <td className="px-5 py-4 text-slate-500">{c.joined}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[c.status]}`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSuspend(c.id)}
                    className="text-sm font-semibold text-slate-600 hover:underline"
                  >
                    {c.status === "Active" ? "Suspend" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}

            {filteredClients.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No clients match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}