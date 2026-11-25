import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProviders } from "../../../services/providers";
import type { Provider } from "../../../types/providers";

const PROVIDERS_PER_PAGE = 6;
type ProviderTypeFilter = "ALL" | Provider["kind"];

const providerTypeFilters: { label: string; value: ProviderTypeFilter }[] = [
  { label: "All providers", value: "ALL" },
  { label: "Sole providers", value: "SOLE_PROVIDER" },
  { label: "Businesses", value: "BUSINESS" },
];

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ProviderTypeFilter>("ALL");
  const [selectedCategory, setSelectedCategory] = useState("All");
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

  const categories = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          providers
            .filter((provider) => selectedType === "ALL" || provider.kind === selectedType)
            .map((provider) => provider.category),
        ),
      ),
    ];
  }, [providers, selectedType]);

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

      const matchesType = selectedType === "ALL" || provider.kind === selectedType;
      const matchesCategory =
        selectedCategory === "All" ||
        provider.category === selectedCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [providers, searchQuery, selectedType, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProviders.length / PROVIDERS_PER_PAGE));

  const paginatedProviders = filteredProviders.slice(
    (currentPage - 1) * PROVIDERS_PER_PAGE,
    currentPage * PROVIDERS_PER_PAGE
  );

  function clearFilters() {
    setSearchQuery("");
    setSelectedType("ALL");
    setSelectedCategory("All");
    setCurrentPage(1);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Page header */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="font-[Clash_Display] text-4xl font-bold tracking-tight text-[#0F172A] sm:text-5xl">
              Find a service provider
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#334155]">
              Browse available businesses and independent providers, explore
              their services, and choose the provider that works for you.
            </p>
          </div>
        </div>
      </section>

      {/* Search and discovery filters */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          <div className="flex flex-col gap-6">
            <div className="relative max-w-2xl">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>

              <input
                type="search"
                aria-label="Search providers, services, or locations"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by provider, service, category, or location..."
                className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-sm text-[#334155] outline-none transition focus:border-[#0EA5E9] focus:ring-4 focus:ring-sky-100 placeholder:text-slate-400"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Provider type</p>
              <div className="flex flex-wrap gap-2" aria-label="Filter by provider type">
                {providerTypeFilters.map(({ label, value }) => {
                  const isSelected = selectedType === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedType(value);
                        setSelectedCategory("All");
                        setCurrentPage(1);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-[#334155] hover:border-slate-400"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Sole providers work independently with you. Businesses offer services through a team or location.
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Category</p>
              <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isSelected = selectedCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedCategory(category);
                      setCurrentPage(1);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-[#0EA5E9] text-white shadow-[0_4px_14px_-4px_rgba(14,165,233,0.5)]"
                        : "border border-slate-200 bg-white text-[#334155] hover:border-[#0EA5E9] hover:text-[#0EA5E9]"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
              </div>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#0EA5E9]/25 to-transparent" />
      </section>

      {/* Provider results */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#0F172A]">
                {selectedType === "BUSINESS"
                  ? "Available businesses"
                  : selectedType === "SOLE_PROVIDER"
                    ? "Independent sole providers"
                    : "Available providers"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredProviders.length}{" "}
                {filteredProviders.length === 1 ? "provider" : "providers"} found
              </p>
            </div>

            {(searchQuery || selectedType !== "ALL" || selectedCategory !== "All") && (
              <button
                type="button"
                onClick={clearFilters}
                className="self-start text-sm font-semibold text-[#0EA5E9] transition-colors hover:text-sky-700 sm:self-auto"
              >
                Clear filters
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="grid animate-pulse gap-6 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading providers">
              {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-80 rounded-2xl border border-slate-200 bg-white p-6"><div className="h-14 w-14 rounded-xl bg-slate-200" /><div className="mt-6 h-5 w-2/3 rounded bg-slate-200" /><div className="mt-3 h-4 w-1/3 rounded bg-slate-100" /><div className="mt-6 h-16 rounded bg-slate-100" /><div className="mt-8 h-10 rounded bg-slate-100" /></div>)}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800" role="alert">Providers could not be loaded: {loadError}</div>
          ) : filteredProviders.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {paginatedProviders.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} />
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
                      className={`h-10 w-10 rounded-lg text-sm font-semibold transition-colors ${
                        currentPage === page
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
            <EmptyState onClear={clearFilters} />
          )}
        </div>
      </section>
    </div>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  const isOpen = provider.status === "Open";

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-[#0EA5E9]/40 hover:shadow-xl hover:shadow-slate-200/60">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] font-[Clash_Display] text-sm font-bold text-[#38BDF8] ring-1 ring-white/10">
          {provider.initials}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            provider.kind === "BUSINESS"
              ? "bg-violet-50 text-violet-700"
              : "bg-sky-50 text-sky-700"
          }`}>
            {provider.kind === "BUSINESS" ? "Business" : "Sole provider"}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isOpen
                ? "bg-green-50 text-[#22C55E]"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOpen ? "bg-[#22C55E]" : "bg-slate-400"
              }`}
            />
            {provider.status}
          </span>
        </div>
      </div>

      <div className="mt-6 flex-1">
        <h3 className="text-xl font-semibold text-[#0F172A]">
          {provider.name}
        </h3>

        <p className="mt-1 text-sm font-medium text-[#0EA5E9]">
          {provider.category}
        </p>

        <p className="mt-2 text-xs font-medium text-slate-500">
          {provider.kind === "BUSINESS"
            ? "Team-based services at a business location"
            : "Book directly with an independent provider"}
        </p>

        <p className="mt-4 line-clamp-3 text-sm leading-7 text-[#334155]">
          {provider.description}
        </p>

        <div className="mt-5">
          <p className="text-xs font-medium text-slate-400">Services</p>

          <div className="mt-2 flex flex-wrap gap-2">
            {provider.services.slice(0, 2).map((service) => (
              <span
                key={service.id}
                title={service.bookable === false ? "Not currently available to book" : undefined}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  service.bookable !== false
                    ? "bg-slate-100 text-slate-600"
                    : "bg-slate-50 text-slate-400"
                }`}
              >
                {service.name}
              </span>
            ))}

            {provider.services.length > 2 && (
              <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-medium text-[#0EA5E9]">
                +{provider.services.length - 2} more
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Business hours
            </p>

            <p className="mt-1 text-sm font-semibold text-[#334155]">
              {provider.hours}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium text-slate-400">Services</p>

            <p className="mt-1 text-sm font-semibold text-[#334155]">
              {provider.services.length}
            </p>
          </div>
        </div>

        <Link
          to={`/providers/${provider.id}`}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0EA5E9] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_0_0_rgba(14,165,233,0)] transition-all duration-200 hover:bg-[#38BDF8] hover:shadow-[0_0_20px_-4px_rgba(14,165,233,0.5)]"
        >
          View services
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <h3 className="font-[Clash_Display] text-2xl font-bold text-[#0F172A]">
        No providers match your search
      </h3>

      <p className="mt-4 text-sm leading-7 text-slate-500">
        Try adjusting your category or search keyword to find more providers.
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
