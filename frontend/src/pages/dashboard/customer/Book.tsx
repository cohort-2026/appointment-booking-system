import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProviders } from "../../../services/providers";
import type { Provider } from "../../../types/providers";

type ProviderTypeFilter = "ALL" | Provider["kind"];

const providerTypeFilters: { label: string; value: ProviderTypeFilter }[] = [
  { label: "All providers", value: "ALL" },
  { label: "Sole providers", value: "SOLE_PROVIDER" },
  { label: "Businesses", value: "BUSINESS" },
];

export default function Book() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ProviderTypeFilter>("ALL");
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

  const categories = useMemo(() => [
    "All services",
    ...new Set(providers
      .filter((provider) => selectedType === "ALL" || provider.kind === selectedType)
      .map((item) => item.category)),
  ], [providers, selectedType]);
  const matches = useMemo(() => {
    const search = query.trim().toLowerCase();
    return providers.filter((provider) => {
      const matchesCategory = category === "All services" || provider.category === category;
      const matchesType = selectedType === "ALL" || provider.kind === selectedType;
      const matchesQuery = !search || [
        provider.name,
        provider.category,
        provider.city ?? "",
        provider.description,
        provider.kind === "BUSINESS" ? "business" : "sole provider independent provider",
        ...provider.services.map((service) => service.name),
      ].some((value) => value.toLowerCase().includes(search));
      return matchesCategory && matchesType && matchesQuery;
    });
  }, [providers, query, category, selectedType]);

  function clearFilters() {
    setQuery("");
    setSelectedType("ALL");
    setCategory("All services");
  }

  return <div className="space-y-7">
    <section className="rounded-3xl bg-gradient-to-br from-[#0B1220] via-[#12253A] to-[#164E63] px-6 py-8 text-white sm:px-9 sm:py-10"><p className="text-sm font-semibold text-sky-300">DISCOVER SOMETHING GREAT</p><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Find your next service</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Browse businesses and independent providers, compare services, and find what works for you.</p><label className="mt-7 flex max-w-2xl items-center gap-3 rounded-2xl bg-white p-2 pl-4 text-slate-500 shadow-lg"><span aria-hidden="true">⌕</span><span className="sr-only">Search providers, services, or locations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search providers, services, or locations" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400" /><button type="button" onClick={() => setQuery(query.trim())} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700">Search</button></label></section>

    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Provider type</p>
        <div className="flex flex-wrap gap-2" aria-label="Filter by provider type">
          {providerTypeFilters.map(({ label, value }) => (
            <button key={value} type="button" aria-pressed={selectedType === value} onClick={() => { setSelectedType(value); setCategory("All services"); }} className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${selectedType === value ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-500">Sole providers work independently with you. Businesses offer services through a team or location.</p>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold">{selectedType === "BUSINESS" ? "Businesses for you" : selectedType === "SOLE_PROVIDER" ? "Sole providers for you" : "Providers for you"}</h2><p className="mt-1 text-sm text-slate-500">{matches.length} {matches.length === 1 ? "result" : "results"} · Browse and book available services.</p></div>
        <label className="text-sm font-medium text-slate-600">Category <select value={category} onChange={(event) => setCategory(event.target.value)} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
    </section>

    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Providers could not be loaded: {error}</div>}
    {loading ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl bg-white" />)}</div> : matches.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{matches.map((provider) => <article key={provider.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-bold text-sky-300">{provider.initials}</span><div><h3 className="font-bold">{provider.name}</h3><p className="mt-0.5 text-sm text-slate-500">{provider.category}</p></div></div><div className="flex flex-col items-end gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${provider.kind === "BUSINESS" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700"}`}>{provider.kind === "BUSINESS" ? "Business" : "Sole provider"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${provider.status === "Open" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{provider.status}</span></div></div><p className="mt-3 text-xs font-medium text-slate-500">{provider.kind === "BUSINESS" ? "Team-based services at a business location" : "Book directly with an independent provider"}</p><p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{provider.description}</p><p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Services</p><div className="mt-2 flex flex-wrap gap-2">{provider.services.slice(0, 3).map((service) => <span key={service.id} className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800">{service.name}</span>)}{provider.services.length > 3 && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">+{provider.services.length - 3} more</span>}{provider.services.length === 0 && <span className="text-sm text-slate-400">No services listed</span>}</div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">{provider.city || "Location not listed"}</span><span className="font-medium text-slate-600">{provider.services.length} services</span></div><Link to={`/dashboard/customer/book/${encodeURIComponent(provider.id)}`} className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">View provider & services <span className="ml-2">→</span></Link></article>)}</div> : !error && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl text-slate-500">⌕</span><h2 className="mt-4 font-semibold">No matching providers</h2><p className="mt-2 text-sm text-slate-500">Try changing your search or choosing another category.</p><button type="button" onClick={clearFilters} className="mt-4 text-sm font-semibold text-sky-700">Clear filters</button></div>}
    <p className="text-center text-xs leading-5 text-slate-500">Book and view your saved confirmation without leaving your dashboard. All appointment times use SAST.</p>
  </div>;
}
