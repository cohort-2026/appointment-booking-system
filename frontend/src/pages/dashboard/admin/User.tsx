import { useState } from "react";

const ACCENT_FROM = "#0EA5E9";

type Role = "CUSTOMER" | "SOLE_PROVIDER" | "BUSINESS_OWNER" | "ADMIN";
type Status = "Active" | "Suspended";

type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  joined: string;
};

const roleLabels: Record<Role, string> = {
  CUSTOMER: "Customer",
  SOLE_PROVIDER: "Sole provider",
  BUSINESS_OWNER: "Business owner",
  ADMIN: "Admin",
};

const mockUsers: PlatformUser[] = [
  {
    id: "1",
    name: "Thabo Mokoena",
    email: "thabo@example.com",
    role: "CUSTOMER",
    status: "Active",
    joined: "2026-10-27",
  },
  {
    id: "2",
    name: "Amanda Cele",
    email: "amanda@example.com",
    role: "SOLE_PROVIDER",
    status: "Active",
    joined: "2026-10-28",
  },
  {
    id: "3",
    name: "Riverside Wellness",
    email: "info@riverside.example.com",
    role: "BUSINESS_OWNER",
    status: "Active",
    joined: "2026-10-28",
  },
  {
    id: "4",
    name: "Sipho Dlamini",
    email: "sipho@example.com",
    role: "CUSTOMER",
    status: "Suspended",
    joined: "2026-10-12",
  },
];

export default function Users() {
  const [users] = useState<PlatformUser[]>(mockUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Users</h2>
        <p className="mt-1 text-sm text-slate-500">
          Search, filter and manage every account on the platform.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-400 sm:max-w-sm"
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | "ALL")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-400"
        >
          <option value="ALL">All roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="SOLE_PROVIDER">Sole provider</option>
          <option value="BUSINESS_OWNER">Business owner</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Joined</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-4">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td className="px-5 py-4 text-slate-700">
                  {roleLabels[u.role]}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      u.status === "Active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-500">{u.joined}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    className="text-sm font-semibold hover:underline"
                    style={{ color: ACCENT_FROM }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}