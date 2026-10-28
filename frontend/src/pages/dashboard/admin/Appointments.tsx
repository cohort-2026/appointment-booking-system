import { useState } from "react";

type AppointmentStatus = "Confirmed" | "Completed" | "Cancelled";

type Appointment = {
  id: string;
  customer: string;
  provider: string;
  service: string;
  date: string;
  time: string;
  status: AppointmentStatus;
};

const mockAppointments: Appointment[] = [
  {
    id: "1",
    customer: "Thabo Mokoena",
    provider: "Amanda Cele",
    service: "Massage",
    date: "2026-10-30",
    time: "09:00",
    status: "Confirmed",
  },
  {
    id: "2",
    customer: "Sipho Dlamini",
    provider: "Kabelo Maseko",
    service: "Haircut",
    date: "2026-10-30",
    time: "11:30",
    status: "Confirmed",
  },
  {
    id: "3",
    customer: "Zanele Mthembu",
    provider: "Lerato Nkosi",
    service: "Dental check-up",
    date: "2026-10-27",
    time: "14:00",
    status: "Completed",
  },
  {
    id: "4",
    customer: "Thabo Mokoena",
    provider: "Kabelo Maseko",
    service: "Beard trim",
    date: "2026-10-26",
    time: "16:15",
    status: "Cancelled",
  },
];

const statusStyles: Record<AppointmentStatus, string> = {
  Confirmed: "bg-sky-50 text-sky-700",
  Completed: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-red-50 text-red-700",
};

const inputClass =
  "rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-400";

export default function Appointments() {
  const [appointments, setAppointments] =
    useState<Appointment[]>(mockAppointments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">(
    "ALL"
  );

  const cancelAppointment = (id: string) => {
    setAppointments((current) =>
      current.map((a) => (a.id === id ? { ...a, status: "Cancelled" } : a))
    );
  };

  const filteredAppointments = appointments.filter((a) => {
    const term = search.toLowerCase();
    const matchesSearch =
      a.customer.toLowerCase().includes(term) ||
      a.provider.toLowerCase().includes(term) ||
      a.service.toLowerCase().includes(term);
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const upcomingCount = appointments.filter(
    (a) => a.status === "Confirmed"
  ).length;

  return (
    <section>
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Appointments</h2>
          <p className="mt-1 text-sm text-slate-500">
            Oversee every booking across all providers.
          </p>
        </div>

        <span className="w-fit rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
          {upcomingCount} upcoming
        </span>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, provider or service"
          className={`${inputClass} w-full sm:max-w-sm`}
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as AppointmentStatus | "ALL")
          }
          className={inputClass}
        >
          <option value="ALL">All statuses</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Provider</th>
              <th className="px-5 py-3 font-semibold">Service</th>
              <th className="px-5 py-3 font-semibold">Date &amp; time</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredAppointments.map((a) => (
              <tr key={a.id}>
                <td className="px-5 py-4 font-semibold">{a.customer}</td>
                <td className="px-5 py-4 text-slate-700">{a.provider}</td>
                <td className="px-5 py-4 text-slate-700">{a.service}</td>
                <td className="px-5 py-4 text-slate-700">
                  {a.date} · {a.time}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[a.status]}`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  {a.status === "Confirmed" && (
                    <button
                      type="button"
                      onClick={() => cancelAppointment(a.id)}
                      className="text-sm font-semibold text-red-600 hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {filteredAppointments.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No appointments match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}