import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Search, Sparkles } from "lucide-react";
import { fetchProviders } from "../../../services/providers";
import type { Provider } from "../../../types/providers";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";

export default function Book() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All services");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchProviders().then((items) => { if (active) setProviders(items); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Providers could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ["All services", ...new Set(providers.map((item) => item.category))], [providers]);
  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    return providers.filter((provider) => {
      const matchesCategory = category === "All services" || provider.category === category;
      const matchesQuery = !search || [provider.name, provider.category, provider.city ?? "", provider.description, ...provider.services.map((service) => service.name)].some((value) => value.toLowerCase().includes(search));
      return matchesCategory && matchesQuery;
    });
  }, [providers, query, category]);

  return <div className="space-y-6">
    <Card className="relative overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-[#0B1220] via-[#12253A] to-[#164E63] text-white shadow-sm">
      <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <CardContent className="relative p-6 sm:p-9">
        <Badge variant="secondary" className="border-0 bg-white/10 text-[10px] font-semibold tracking-[0.14em] text-cyan-200"><Sparkles className="mr-1.5 size-3"/>Discover something great</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Find your next service</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Browse providers, compare services, and explore what’s available near you.</p>
        <label className="relative mt-6 flex max-w-2xl items-center gap-2 rounded-xl bg-white p-1.5 pl-3 text-slate-500 shadow-lg">
          <Search className="size-4 shrink-0"/><span className="sr-only">Search providers, services, or locations</span>
          <Input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") setQuery(query.trim()); }} placeholder="Try ‘haircut’, ‘massage’, or a city" className="h-10 flex-1 border-0 bg-transparent text-sm text-slate-900 shadow-none focus-visible:ring-0" />
          <Button type="button" onClick={() => setQuery(query.trim())} className="h-10 shrink-0">Search</Button>
        </label>
      </CardContent>
    </Card>

    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-xl font-bold tracking-tight text-slate-950">Providers for you</h2><p className="mt-1 text-sm text-slate-500">Explore services offered by local providers.</p></div>
      <div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-500">Category</span><Select value={category} onValueChange={setCategory}><SelectTrigger className="h-10 w-48 bg-white"><SelectValue placeholder="All services"/></SelectTrigger><SelectContent><SelectItem value="All services">All services</SelectItem>{categories.filter(item => item !== "All services").map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
    </div>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Providers could not be loaded: {error}</div>}
    {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(item => <Card key={item} className="h-64 animate-pulse border-0 bg-white shadow-sm ring-1 ring-slate-200" />)}</div>
      : matches.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{matches.map(provider => <Card key={provider.id} className="group flex h-full flex-col rounded-2xl border-0 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-sky-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 pb-0 pt-5">
          <div className="flex min-w-0 items-center gap-3"><Avatar className="size-12 rounded-xl after:rounded-xl"><AvatarFallback className="rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-bold text-cyan-300">{provider.initials}</AvatarFallback></Avatar><div className="min-w-0"><CardTitle className="truncate text-base">{provider.name}</CardTitle><CardDescription className="mt-1 truncate">{provider.category}</CardDescription></div></div>
          <Badge variant={provider.status === "Open" ? "secondary" : "outline"} className={provider.status === "Open" ? "shrink-0 bg-emerald-50 text-emerald-700" : "shrink-0 bg-slate-100 text-slate-600"}>{provider.status}</Badge>
        </CardHeader>
        <CardContent className="flex-1 px-5 pt-4"><p className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{provider.description || "Discover services and book an appointment with this provider."}</p><p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Services</p><div className="mt-2 flex flex-wrap gap-1.5">{provider.services.slice(0, 3).map(service => <Badge key={service.id} variant="secondary" className="bg-sky-50 text-[10px] font-medium text-sky-800">{service.name}</Badge>)}{provider.services.length > 3 && <Badge variant="outline" className="text-[10px]">+{provider.services.length - 3} more</Badge>}{provider.services.length === 0 && <span className="text-xs text-slate-400">No services listed</span>}</div></CardContent>
        <CardFooter className="flex-col items-stretch gap-3 border-t border-slate-100 px-5 pt-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-1 truncate text-slate-500"><MapPin className="size-3.5 shrink-0"/>{provider.city || "Location not listed"}</span><span className="shrink-0 font-medium text-slate-600">{provider.services.length} services</span></div><Button asChild className="w-full"><Link to={`/dashboard/customer/book/${encodeURIComponent(provider.id)}`}>View provider &amp; services <ArrowRight className="ml-1.5"/></Link></Button></CardFooter>
      </Card>)}</div> : !error && <Card className="items-center border-dashed py-10 text-center shadow-none"><CardContent><span className="mx-auto grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-500"><Search className="size-5"/></span><CardTitle className="mt-4 text-base">No matching providers</CardTitle><CardDescription className="mt-1">Try changing your search or choosing another category.</CardDescription><Button type="button" variant="outline" size="sm" onClick={() => { setQuery(""); setCategory("All services"); }} className="mt-4">Clear filters</Button></CardContent></Card>}
    <p className="text-center text-xs leading-5 text-slate-500">Book and view your saved confirmation without leaving your dashboard. All appointment times use SAST.</p>
  </div>;
}
