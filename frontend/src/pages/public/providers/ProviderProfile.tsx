import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProvider } from "../../../services/providers";
import type { Provider } from "../../../types/providers";
import BookingJourney from "../../../components/booking/BookingJourney";
import { Button } from "../../../components/ui/button";

/** Same provider/booking content in the public layout or the existing customer shell. */
export default function ProviderProfile({ dashboard = false }: { dashboard?: boolean }) {
  const { id } = useParams();
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ id: string; provider: Provider | null; error: string | null }>({ id: "", provider: null, error: null });
  useEffect(() => {
    if (!id) return;
    let active = true;
    void fetchProvider(id).then(provider => { if (active) setResult({ id, provider, error: null }); })
      .catch(reason => { if (active) setResult({ id, provider: null, error: reason instanceof Error ? reason.message : "Unable to load provider" }); });
    return () => { active = false; };
  }, [id, reload]);
  const back = <Link className="text-sm font-semibold text-sky-700 hover:underline" to={dashboard ? "/dashboard/customer/book" : "/providers"}>← Back to providers</Link>;
  const provider = result.id === id ? result.provider : null;
  return <div className={dashboard ? "space-y-6" : "mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6"}>
    {back}
    {result.id !== id ? <p role="status" className="animate-pulse rounded-2xl bg-slate-100 p-12">Loading provider…</p>
      : !provider ? <section className="rounded-2xl border bg-white p-8"><h1 className="text-xl font-bold">Provider unavailable</h1><p role="alert" className="my-4">{result.error ?? "This provider is not available."}</p><Button variant="outline" onClick={() => setReload(n => n + 1)}>Try again</Button></section>
      : <><header className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white sm:p-8">
        <div className="flex items-start gap-4"><span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-sky-400/15 text-xl font-bold text-sky-300">{provider.initials}</span>
          <div className="min-w-0"><p className="text-sm font-medium text-sky-300">{provider.kind === "BUSINESS" ? "Business" : "Independent provider"} · {provider.category}</p><h1 className="mt-2 break-words text-3xl font-bold">{provider.name}</h1></div></div>
        {provider.description && <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300">{provider.description}</p>}
        <div className="mt-5 flex flex-wrap gap-3 text-sm"><span className="rounded-full bg-white/10 px-3 py-1">{provider.status} now</span><span className="py-1">{provider.hours} · SAST</span></div>
        {provider.status === "Closed" && <p className="mt-3 text-sm text-slate-300">Closed right now? You can still book an available future appointment.</p>}
      </header><BookingJourney provider={provider} dashboard={dashboard} /></>}
  </div>;
}
