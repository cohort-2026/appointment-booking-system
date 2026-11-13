import { useEffect, useState, type MouseEvent } from "react";

type BusinessStatus = "Approved" | "Pending" | "Suspended";

type BusinessService = {
  name: string;
  durationMinutes: number;
};

type Business = {
  id: string;
  name: string;
  owner: string;
  email: string;
  providerCount: number;
  status: BusinessStatus;
  registered: string;
  services: BusinessService[];
};

type MenuState = {
  id: string;
  top: number;
  right: number;
};

const mockBusinesses: Business[] = [
  {
    id: "1",
    name: "Riverside Wellness",
    owner: "Nomsa Dube",
    email: "info@riverside.example.com",
    providerCount: 3,
    status: "Pending",
    registered: "2026-10-28",
    services: [
      { name: "Massage", durationMinutes: 60 },
      { name: "Facial", durationMinutes: 45 },
      { name: "Yoga class", durationMinutes: 60 },
    ],
  },
  {
    id: "2",
    name: "Bright Smiles Dental",
    owner: "Pieter van Wyk",
    email: "hello@brightsmiles.example.com",
    providerCount: 3,
    status: "Approved",
    registered: "2026-10-27",
    services: [
      { name: "Dental check-up", durationMinutes: 45 },
      { name: "Teeth whitening", durationMinutes: 60 },
    ],
  },
  {
    id: "3",
    name: "Urban Cuts Barbershop",
    owner: "Kabelo Maseko",
    email: "book@urbancuts.example.com",
    providerCount: 4,
    status: "Approved",
    registered: "2026-10-15",
    services: [
      { name: "Haircut", durationMinutes: 30 },
      { name: "Beard trim", durationMinutes: 20 },
      { name: "Hot towel shave", durationMinutes: 30 },
    ],
  },
  {
    id: "4",
    name: "Zen Physio",
    owner: "Naledi Khumalo",
    email: "team@zenphysio.example.com",
    providerCount: 2,
    status: "Suspended",
    registered: "2026-10-05",
    services: [],
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

const menuItemClass =
  "block w-full px-4 py-2 text-left text-sm hover:bg-slate-50";

const dotsButtonClass =
  "rounded-lg px-2 py-1 text-lg leading-none text-slate-500 hover:bg-slate-100";

const approveButtonClass =
  "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700";

const suspendButtonClass =
  "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700";

export default function Businesses() {
  const [businesses, setBusinesses] = useState<Business[]>(mockBusinesses);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BusinessStatus | "ALL">(
    "ALL"
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);

  // Close the three-dots menu when the page scrolls or resizes
  useEffect(() => {
    if (!menu) return undefined;

    const close = () => setMenu(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);

    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const selectedBusiness =
    businesses.find((b) => b.id === selectedId) ?? null;
  const menuBusiness = menu
    ? businesses.find((b) => b.id === menu.id) ?? null
    : null;

  const updateStatus = (id: string, status: BusinessStatus) => {
    setBusinesses((current) =>
      current.map((b) => (b.id === id ? { ...b, status } : b))
    );
  };

  const openMenu = (e: MouseEvent<HTMLButtonElement>, id: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({
      id,
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
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

  // ---------- Profile view ----------
  if (selectedBusiness) {
    return (
      <section>
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="mb-4 text-sm font-semibold text-sky-600 hover:underline"
        >
          Back to businesses
        </button>

        <div className={cardClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {selectedBusiness.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedBusiness.email}
              </p>
            </div>

            <span
              className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[selectedBusiness.status]}`}
            >
              {selectedBusiness.status}
            </span>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase text-slate-400">Owner</dt>
              <dd className="mt-1 text-sm font-medium">
                {selectedBusiness.owner}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">Providers</dt>
              <dd className="mt-1 text-sm font-medium">
                {selectedBusiness.providerCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-slate-400">Registered</dt>
              <dd className="mt-1 text-sm font-medium">
                {selectedBusiness.registered}
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex gap-3">
            {selectedBusiness.status !== "Approved" && (
              <button
                type="button"
                onClick={() => updateStatus(selectedBusiness.id, "Approved")}
                className={approveButtonClass}
              >
                Approve
              </button>
            )}
            {selectedBusiness.status !== "Suspended" && (
              <button
                type="button"
                onClick={() => updateStatus(selectedBusiness.id, "Suspended")}
                className={suspendButtonClass}
              >
                Suspend
              </button>
            )}
          </div>
        </div>

        <div className={`${cardClass} mt-6`}>
          <h3 className="mb-4 font-bold">
            Services ({selectedBusiness.services.length})
          </h3>

          {selectedBusiness.services.length === 0 ? (
            <p className="text-sm text-slate-500">
              This business has not added any services yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {selectedBusiness.services.map((service) => (
                <li
                  key={service.name}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="font-medium">{service.name}</span>
                  <span className="text-slate-500">
                    {service.durationMinutes} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  }

  // ---------- List view ----------
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
              <th className="px-5 py-3 font-semibold">Services</th>
              <th className="px-5 py-3 font-semibold">Registered</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredBusinesses.map((b) => (
              <tr key={b.id}>
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className="text-left font-semibold hover:underline"
                  >
                    {b.name}
                  </button>
                  <p className="text-xs text-slate-500">{b.email}</p>
                </td>
                <td className="px-5 py-4 text-slate-700">{b.owner}</td>
                <td className="px-5 py-4 text-slate-700">
                  {b.services.length}
                </td>
                <td className="px-5 py-4 text-slate-500">{b.registered}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[b.status]}`}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    aria-label={`Actions for ${b.name}`}
                    onClick={(e) => openMenu(e, b.id)}
                    className={dotsButtonClass}
                  >
                    ⋯
                  </button>
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

      {/* Three-dots menu (one menu, shown for whichever row opened it) */}
      {menu && menuBusiness && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenu(null)}
          />
          <div
            className="fixed z-50 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
            style={{ top: menu.top, right: menu.right }}
          >
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                setSelectedId(menuBusiness.id);
                setMenu(null);
              }}
            >
              View profile
            </button>

            {menuBusiness.status !== "Approved" && (
              <button
                type="button"
                className={`${menuItemClass} text-emerald-600`}
                onClick={() => {
                  updateStatus(menuBusiness.id, "Approved");
                  setMenu(null);
                }}
              >
                Approve
              </button>
            )}

            {menuBusiness.status !== "Suspended" && (
              <button
                type="button"
                className={`${menuItemClass} text-red-600`}
                onClick={() => {
                  updateStatus(menuBusiness.id, "Suspended");
                  setMenu(null);
                }}
              >
                Suspend
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}