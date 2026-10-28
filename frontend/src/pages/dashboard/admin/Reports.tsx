import { useState } from "react";

type Period = "This month" | "Last month";
type Tone = "default" | "green" | "red";

type ReportRow = {
  label: string;
  bookings: number;
};

type ReportData = {
  completed: number;
  cancelled: number;
  upcoming: number;
  byService: ReportRow[];
  byProvider: ReportRow[];
};

const mockReports: Record<Period, ReportData> = {
  "This month": {
    completed: 62,
    cancelled: 9,
    upcoming: 14,
    byService: [
      { label: "Massage", bookings: 28 },
      { label: "Haircut", bookings: 24 },
      { label: "Dental check-up", bookings: 19 },
      { label: "Physiotherapy", bookings: 14 },
    ],
    byProvider: [
      { label: "Kabelo Maseko", bookings: 31 },
      { label: "Amanda Cele", bookings: 28 },
      { label: "Lerato Nkosi", bookings: 19 },
      { label: "Naledi Khumalo", bookings: 7 },
    ],
  },
  "Last month": {
    completed: 48,
    cancelled: 12,
    upcoming: 0,
    byService: [
      { label: "Haircut", bookings: 22 },
      { label: "Massage", bookings: 18 },
      { label: "Dental check-up", bookings: 12 },
      { label: "Physiotherapy", bookings: 8 },
    ],
    byProvider: [
      { label: "Kabelo Maseko", bookings: 22 },
      { label: "Amanda Cele", bookings: 18 },
      { label: "Lerato Nkosi", bookings: 12 },
      { label: "Naledi Khumalo", bookings: 8 },
    ],
  },
};

const selectClass =
  "rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-400";

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

const toneClass: Record<Tone, string> = {
  default: "text-slate-900",
  green: "text-emerald-600",
  red: "text-red-600",
};

export default function Reports() {
  const [period, setPeriod] = useState<Period>("This month");

  const data = mockReports[period];
  const total = data.completed + data.cancelled + data.upcoming;
  const cancellationRate =
    total === 0 ? 0 : Math.round((data.cancelled / total) * 100);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Reports</h2>
          <p className="mt-1 text-sm text-slate-500">
            Booking activity across the platform.
          </p>
        </div>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className={selectClass}
        >
          <option value="This month">This month</option>
          <option value="Last month">Last month</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total bookings" value={total} />
        <SummaryCard label="Completed" value={data.completed} tone="green" />
        <SummaryCard label="Cancelled" value={data.cancelled} tone="red" />
        <SummaryCard label="Cancellation rate" value={`${cancellationRate}%`} />
      </div>

      {/* Bar charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <BarList title="Bookings by service" rows={data.byService} />
        <BarList title="Bookings by provider" rows={data.byProvider} />
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: Tone;
}) {
  return (
    <div className={cardClass}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneClass[tone]}`}>{value}</p>
    </div>
  );
}

function BarList({ title, rows }: { title: string; rows: ReportRow[] }) {
  const max = Math.max(...rows.map((r) => r.bookings), 1);

  return (
    <div className={cardClass}>
      <h3 className="mb-4 font-bold">{title}</h3>

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-slate-700">{row.label}</span>
              <span className="text-slate-500">{row.bookings}</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100">
              <div
                className="h-2.5 rounded-full bg-sky-500"
                style={{ width: `${(row.bookings / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}