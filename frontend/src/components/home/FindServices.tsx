import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import ProviderCard from "../providers/ProviderCard";
import { fetchProviders } from "../../services/providers";
import type { Provider } from "../../types/providers";

export default function FindServices() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchProviders()
      .then((data) => { if (active) setProviders(data); })
      .catch((error: unknown) => {
        console.error("Home provider list fetch failed:", error);
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load providers.");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredProviders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return providers;
    return providers.filter((provider) => provider.name.toLowerCase().includes(query)
      || provider.category.toLowerCase().includes(query)
      || provider.description.toLowerCase().includes(query)
      || provider.services.some((service) => service.name.toLowerCase().includes(query)));
  }, [providers, searchQuery]);

  return (
    <section id="services" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">Choose a provider</h2>
          <p className="mt-4 text-lg leading-8 text-[#334155]">Choose a business or independent provider to view their services and book an appointment.</p>
        </div>

        <div className="mt-10">
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search services or providers"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search services or providers..."
              className="h-12 pl-12"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="mt-10 grid animate-pulse gap-6 md:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading providers">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-96 rounded-2xl border border-slate-200 bg-white">
                <div className="h-28 rounded-t-2xl bg-slate-200" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-2/3 rounded bg-slate-200" />
                  <div className="h-4 w-1/3 rounded bg-slate-100" />
                  <div className="h-12 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">Providers could not be loaded: {loadError}</div>
        ) : filteredProviders.length === 0 ? (
          <p className="mt-10 text-sm text-slate-500">{searchQuery ? "No providers match your search." : "No providers are available yet."}</p>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {filteredProviders.slice(0, 8).map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}

        <div className="mt-10 text-center"><Link to="/providers" className="inline-flex rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#0F172A] transition-colors hover:border-[#0EA5E9] hover:text-[#0EA5E9]">View all providers</Link></div>
      </div>
    </section>
  );
}