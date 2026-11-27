import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Popover } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ProviderCard from "../../../components/providers/ProviderCard";
import ProviderFilters, {
  type FilterGroupKey,
  type FilterOption,
  type FilterSelection,
} from "../../../components/providers/ProviderFilters";
import ServiceCard, { type ServiceEntry } from "../../../components/providers/ServiceCard";
import { fetchProviders } from "../../../services/providers";
import type { Provider } from "../../../types/providers";

const PROVIDERS_PER_PAGE = 6;
const SERVICES_PER_PAGE = 9;
const EMPTY_FILTERS: FilterSelection = { types: [], categories: [], areas: [] };
const TYPE_LABELS: Record<string, string> = {
  SOLE_PROVIDER: "Sole providers",
  BUSINESS: "Businesses",
};

type ViewMode = "providers" | "services";

function buildOptions(
  values: string[],
  label: (value: string) => string = (value) => value,
): FilterOption[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts]
    .map(([value, count]) => ({ value, label: label(value), count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function bookableServices(provider: Provider) {
  return provider.services.filter((service) => service.bookable !== false);
}

function matchesSelection(provider: Provider, selected: FilterSelection) {
  return (
    (selected.types.length === 0 || selected.types.includes(provider.kind)) &&
    (selected.categories.length === 0 || selected.categories.includes(provider.category)) &&
    (selected.areas.length === 0 || (provider.city !== null && selected.areas.includes(provider.city)))
  );
}

export default function Providers({ dashboard = false }: { dashboard?: boolean }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<FilterSelection>(EMPTY_FILTERS);
  const [view, setView] = useState<ViewMode>("providers");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchProviders()
      .then((data) => { if (active) setProviders(data); })
      .catch((error: unknown) => {
        console.error("Public provider list fetch failed:", error);
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load providers.");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const options = useMemo(() => {
    const source =
      view === "services"
        ? providers.flatMap((provider) => bookableServices(provider).map(() => provider))
        : providers;
    return {
      types: buildOptions(source.map((provider) => provider.kind), (value) => TYPE_LABELS[value] ?? value),
      categories: buildOptions(source.map((provider) => provider.category)),
      areas: buildOptions(source.flatMap((provider) => (provider.city ? [provider.city] : []))),
    };
  }, [providers, view]);

  const filteredProviders = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return providers.filter((provider) => {
      const matchesSearch = [
        provider.name,
        provider.category,
        provider.description,
        provider.city ?? "",
        provider.kind === "BUSINESS" ? "business" : "sole provider independent provider",
        ...provider.services.map((service) => service.name),
      ].some((value) => value.toLowerCase().includes(query));

      return matchesSearch && matchesSelection(provider, selected);
    });
  }, [providers, searchQuery, selected]);

  const filteredServices = useMemo<ServiceEntry[]>(() => {
    const query = searchQuery.toLowerCase().trim();
    return providers
      .filter((provider) => matchesSelection(provider, selected))
      .flatMap((provider) =>
        bookableServices(provider)
          .filter((service) =>
            [service.name, service.description, provider.name, provider.category, provider.city ?? ""].some(
              (value) => value.toLowerCase().includes(query),
            ),
          )
          .map((service) => ({ service, provider })),
      );
  }, [providers, searchQuery, selected]);

  const pageSize = view === "services" ? SERVICES_PER_PAGE : PROVIDERS_PER_PAGE;
  const totalCount = view === "services" ? filteredServices.length : filteredProviders.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedProviders = filteredProviders.slice(pageStart, pageStart + pageSize);
  const paginatedServices = filteredServices.slice(pageStart, pageStart + pageSize);

  function changeView(next: ViewMode) {
    setView(next);
    setCurrentPage(1);
  }

  function toggleFilter(group: FilterGroupKey, value: string) {
    setSelected((current) => ({
      ...current,
      [group]: current[group].includes(value)
        ? current[group].filter((item) => item !== value)
        : [...current[group], value],
    }));
    setCurrentPage(1);
  }

  function clearFilters() {
    setSearchQuery("");
    setSelected(EMPTY_FILTERS);
    setCurrentPage(1);
  }

  return (
    <div className={dashboard ? "w-full" : "min-h-screen bg-background"}>
      <div className={dashboard ? "w-full" : "mx-auto max-w-7xl px-6 py-12 lg:px-8"}>
        <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Find services</p>
            <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
              Find a service provider
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {totalCount}{" "}
              {view === "services"
                ? totalCount === 1 ? "service" : "services"
                : totalCount === 1 ? "provider" : "providers"}{" "}
              found
            </p>
          </div>

          {!dashboard && <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search providers, services, or locations"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search services or names"
              className="h-10 bg-card pl-9"
            />
          </div>}
        </header>

        <div className={dashboard ? "mt-6" : "mt-8 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]"}>
          {!dashboard && <ProviderFilters
            options={options}
            selected={selected}
            onToggle={toggleFilter}
            onClear={clearFilters}
          />}

          <section>
            <div className={dashboard ? "mb-6 flex flex-wrap items-center gap-3" : ""}>
            {dashboard && <div className="relative min-w-0 flex-1 basis-56">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input type="search" aria-label="Search providers, services, or locations" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }} placeholder="Search services or names" className="h-10 bg-card pl-9" />
            </div>}
            {dashboard && <Popover.Root>
              <Popover.Trigger asChild><Button type="button" variant="outline" className="h-10"><SlidersHorizontal aria-hidden="true" /> Filters{Object.values(selected).flat().length > 0 && ` (${Object.values(selected).flat().length})`}</Button></Popover.Trigger>
              <Popover.Portal><Popover.Content align="end" sideOffset={8} className="z-50 w-72 max-w-[calc(100vw-2rem)]" aria-label="Provider filters">
                <ProviderFilters options={options} selected={selected} onToggle={toggleFilter} onClear={clearFilters} />
              </Popover.Content></Popover.Portal>
            </Popover.Root>}
            <ToggleGroup
              type="single"
              variant="outline"
              value={view}
              onValueChange={(value) => {
                if (value === "providers" || value === "services") changeView(value);
              }}
              aria-label="Browse by"
              className={dashboard ? "" : "mb-6"}
            >
              <ToggleGroupItem value="providers">Providers</ToggleGroupItem>
              <ToggleGroupItem value="services">Services</ToggleGroupItem>
            </ToggleGroup>
            </div>

            {isLoading ? (
              <div className="grid animate-pulse gap-6 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading providers">
                {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-96 rounded-2xl border border-slate-200 bg-white p-6"><div className="h-14 w-14 rounded-xl bg-slate-200" /><div className="mt-6 h-5 w-2/3 rounded bg-slate-200" /><div className="mt-3 h-4 w-1/3 rounded bg-slate-100" /><div className="mt-6 h-16 rounded bg-slate-100" /><div className="mt-8 h-10 rounded bg-slate-100" /></div>)}
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert">Providers could not be loaded: {loadError}</div>
            ) : totalCount > 0 ? (
              <>
                <div className={dashboard ? "grid gap-4" : "grid gap-6 md:grid-cols-2 xl:grid-cols-3"}>
                  {view === "services"
                    ? paginatedServices.map(({ service, provider }) => (
                        <ServiceCard key={`${provider.id}-${service.id}`} service={service} provider={provider} dashboard={dashboard} />
                      ))
                    : paginatedProviders.map((provider) => (
                        <ProviderCard key={provider.id} provider={provider} dashboard={dashboard} />
                      ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-[#0EA5E9] hover:text-[#0EA5E9] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`h-10 w-10 rounded-lg text-sm font-semibold transition-colors ${currentPage === page
                            ? "bg-[#0EA5E9] text-white shadow-[0_4px_14px_-4px_rgba(14,165,233,0.5)]"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
                          }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-[#0EA5E9] hover:text-[#0EA5E9] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState noun={view} onClear={clearFilters} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onClear, noun }: { onClear: () => void; noun: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <h3 className="font-heading text-2xl font-bold text-[#0F172A]">
        No {noun} match your search
      </h3>

      <p className="mt-4 text-sm leading-7 text-slate-500">
        Try adjusting your filters or search keyword to find more {noun}.
      </p>

      <button
        type="button"
        onClick={onClear}
        className="mt-6 rounded-xl bg-[#0EA5E9] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
      >
        Reset filters
      </button>
    </div>
  );
}