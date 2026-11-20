import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { apiFetch } from "../../../services/api";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";

type Appointment = {
  id: string; time: string; service: string; providerName: string; staffName: string | null;
  durationMinutes: number; price: string | null; status: string;
};
type AppointmentResponse = { success: boolean; upcoming: Appointment[]; past: Appointment[] };
type Filter = "Upcoming" | "Past" | "Cancelled" | "All";
/*const activeStatuses = ["CONFIRMED", "RESCHEDULED"];*/

function appointmentDate(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
function appointmentTime(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value)) + " SAST";
}
function statusStyle(status: string) {
  if (status === "CONFIRMED") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "RESCHEDULED") return "border-violet-200 bg-violet-50 text-violet-700";
  if (status === "COMPLETED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

export default function Appointments() {
  const [data, setData] = useState<AppointmentResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("Upcoming");
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("All providers");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch<AppointmentResponse>("/customer/appointments")
      .then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Appointments could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const allAppointments = useMemo(() => [...(data?.upcoming ?? []), ...(data?.past ?? [])], [data]);
  const providers = useMemo(() => [...new Set(allAppointments.map(item => item.providerName))].sort((a, b) => a.localeCompare(b)), [allAppointments]);
  const counts = {
    Upcoming: data?.upcoming.length ?? 0,
    Past: data?.past.filter(item => item.status !== "CANCELLED" && item.status !== "NO_SHOW").length ?? 0,
    Cancelled: data?.past.filter(item => item.status === "CANCELLED").length ?? 0,
    All: allAppointments.length,
  };
  const filtered = useMemo(() => {
    const base = filter === "Upcoming" ? data?.upcoming ?? []
      : filter === "Cancelled" ? (data?.past ?? []).filter(item => item.status === "CANCELLED")
      : filter === "Past" ? (data?.past ?? []).filter(item => item.status !== "CANCELLED" && item.status !== "NO_SHOW")
      : allAppointments;
    const search = query.trim().toLocaleLowerCase();
    return base.filter(item => (provider === "All providers" || item.providerName === provider)
      && (!search || `${item.service} ${item.providerName} ${item.staffName ?? ""} ${item.status}`.toLocaleLowerCase().includes(search)));
  }, [allAppointments, data, filter, provider, query]);
  const pageSize = 7;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice(page * pageSize, (page + 1) * pageSize);

  function changeFilter(value: string) {
    if (value) { setFilter(value as Filter); setPage(0); }
  }

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Your schedule</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">My appointments</h1><p className="mt-1 text-sm text-slate-500">Review your upcoming and past visits.</p></div>
      <Button asChild><Link to="/dashboard/customer/book"><CalendarDays className="mr-1.5" />Book a service</Link></Button>
    </header>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
          <Tabs value={filter} onValueChange={changeFilter}>
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 sm:w-fit">
              {(["Upcoming", "Past", "Cancelled", "All"] as Filter[]).map(item => <TabsTrigger key={item} value={item} className="h-8 gap-1.5 rounded-lg px-2.5 text-xs sm:px-3"><span>{item}</span><span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === item ? "bg-sky-50 text-sky-700" : "bg-white/70 text-slate-500"}`}>{loading ? "–" : counts[item]}</span></TabsTrigger>)}
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-0 flex-1 sm:w-56"><span className="sr-only">Search appointments</span><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"/><Input value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Search appointments" className="h-9 pl-9 text-xs" /></label>
            <label className="relative flex min-w-0 items-center sm:w-40"><SlidersHorizontal className="pointer-events-none absolute left-3 size-3.5 text-slate-400"/><span className="sr-only">Filter by provider</span><select value={provider} onChange={event => { setProvider(event.target.value); setPage(0); }} className="h-9 w-full appearance-none rounded-lg border border-input bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-sky-500"><option>All providers</option>{providers.map(name => <option key={name}>{name}</option>)}</select></label>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500"><span>{loading ? "Loading appointments…" : `${filtered.length} ${filtered.length === 1 ? "appointment" : "appointments"}`}</span><span className="hidden sm:inline">Select an appointment to view its details</span></div>
      </div>

      {error && <div role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load appointments: {error}</div>}
      {loading ? <div className="space-y-3 p-5">{[0, 1, 2, 3].map(item => <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
        : pageItems.length ? <>
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-slate-50/80"><TableRow className="hover:bg-transparent"><TableHead className="w-[34%] pl-5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Appointment</TableHead><TableHead className="w-[25%] text-[10px] font-semibold uppercase tracking-wider text-slate-500">Provider</TableHead><TableHead className="w-[24%] text-[10px] font-semibold uppercase tracking-wider text-slate-500">When</TableHead><TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Status</TableHead><TableHead className="w-8" /></TableRow></TableHeader>
              <TableBody>{pageItems.map(item => <TableRow key={item.id} className="group">
                <TableCell className="py-3 pl-5"><Link to={`/dashboard/customer/appointments/${encodeURIComponent(item.id)}`} className="block"><p className="text-xs font-semibold text-slate-900 group-hover:text-sky-700">{item.service}</p>{item.staffName && <p className="mt-0.5 text-[10px] text-slate-500">with {item.staffName}</p>}</Link></TableCell>
                <TableCell className="py-3"><span className="block max-w-48 truncate text-xs text-slate-700">{item.providerName}</span></TableCell>
                <TableCell className="py-3"><p className="text-xs text-slate-700">{appointmentDate(item.time)}</p><p className="mt-0.5 text-[10px] text-slate-500">{appointmentTime(item.time)}</p></TableCell>
                <TableCell className="py-3"><Badge variant="outline" className={`border text-[10px] font-semibold capitalize ${statusStyle(item.status)}`}>{item.status.toLowerCase().replaceAll("_", " ")}</Badge>{item.status === "RESCHEDULED" && <p className="mt-1 text-[9px] text-slate-500">Moved to new time</p>}</TableCell>
                <TableCell className="pr-4 text-right"><Link aria-label={`View ${item.service} appointment`} to={`/dashboard/customer/appointments/${encodeURIComponent(item.id)}`} className="inline-grid size-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-sky-700"><ChevronRight className="size-4" /></Link></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </div>
          <div className="divide-y divide-slate-100 md:hidden">{pageItems.map(item => <Link key={item.id} to={`/dashboard/customer/appointments/${encodeURIComponent(item.id)}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"><span className="grid size-10 shrink-0 content-center rounded-xl bg-sky-50 text-center"><span className="text-[9px] font-bold uppercase text-sky-700">{new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", month: "short" }).format(new Date(item.time))}</span><span className="text-sm font-bold leading-4 text-slate-900">{new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", day: "2-digit" }).format(new Date(item.time))}</span></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-900">{item.service}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{item.providerName} · {appointmentTime(item.time)}</span></span><Badge variant="outline" className={`border text-[9px] capitalize ${statusStyle(item.status)}`}>{item.status.toLowerCase().replaceAll("_", " ")}</Badge></Link>)}</div>
        </> : <div className="px-6 py-14 text-center"><CalendarDays className="mx-auto size-9 text-slate-300"/><h2 className="mt-3 text-sm font-semibold text-slate-900">{query || provider !== "All providers" ? "No matching appointments" : `No ${filter.toLowerCase()} appointments`}</h2><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">{query || provider !== "All providers" ? "Try another search or provider filter." : "Your appointments will appear here when they are available."}</p>{filter !== "Past" && filter !== "Cancelled" && <Button asChild size="sm" className="mt-4"><Link to="/dashboard/customer/book">Book a service</Link></Button>}</div>}

      {!loading && filtered.length > 0 && <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5"><span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))}>Previous</Button><Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage(value => Math.min(pageCount - 1, value + 1))}>Next</Button></div></footer>}
    </section>
  </div>;
}
