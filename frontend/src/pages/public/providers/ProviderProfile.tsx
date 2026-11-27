import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchProvider } from "../../../services/providers";
import type { Provider } from "../../../types/providers";
import BookingJourney, { BookingSkeleton } from "../../../components/booking/BookingJourney";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KIND_STYLE } from "@/lib/providerKind";
import { cn } from "@/lib/utils";

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
  const back = (
    <Link className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:underline" to={dashboard ? "/dashboard/customer/book" : "/providers"}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      Back to providers
    </Link>
  );
  const provider = result.id === id ? result.provider : null;
  return <div className={dashboard ? "space-y-6" : "mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-6"}>
    {back}
    {result.id !== id ? <BookingSkeleton />
      : !provider ? <Card><CardContent className="p-8"><h1 className="font-heading text-xl font-bold">Provider unavailable</h1><p role="alert" className="my-4 text-sm text-muted-foreground">{result.error ?? "This provider is not available."}</p><Button variant="outline" onClick={() => setReload(n => n + 1)}>Try again</Button></CardContent></Card>
      : <><ProfileHeader provider={provider} /><BookingJourney provider={provider} dashboard={dashboard} /></>}
  </div>;
}

function ProfileHeader({ provider }: { provider: Provider }) {
  const kind = KIND_STYLE[provider.kind];
  const isOpen = provider.status === "Open";

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className={cn("relative h-32 bg-linear-to-br", kind.header)}>
        <span aria-hidden="true" className="absolute -right-12 -top-12 size-44 rounded-full bg-white/20" />
        <span aria-hidden="true" className="absolute right-24 top-16 size-14 rounded-full bg-white/10" />
      </div>

      <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
        <Avatar className={cn("-mt-10 size-20 ring-4 ring-card", kind.avatar)}>
          <AvatarFallback className={cn("font-heading text-xl font-bold", kind.avatar)}>
            {provider.initials}
          </AvatarFallback>
        </Avatar>

        <h1 className="mt-4 break-words font-heading text-3xl font-bold tracking-tight">{provider.name}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{kind.label}</Badge>
          <Badge variant="outline">{provider.category}</Badge>
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5",
              isOpen ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-secondary text-slate-600",
            )}
          >
            <span className={cn("size-1.5 rounded-full", isOpen ? "bg-emerald-500" : "bg-slate-400")} />
            {provider.status} now
          </Badge>
          <span className="text-sm text-muted-foreground">{provider.hours} · SAST</span>
        </div>

        {provider.description && (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{provider.description}</p>
        )}
        {provider.status === "Closed" && (
          <p className="mt-3 text-sm text-muted-foreground">
            Closed right now? You can still book an available future appointment.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading provider" className="space-y-7">
      <span className="sr-only">Loading provider…</span>

      {/* Header */}
      <Card className="gap-0 overflow-hidden py-0">
        <Skeleton className="h-32 rounded-none" />
        <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
          <Skeleton className="-mt-10 size-20 rounded-full ring-4 ring-card" />
          <Skeleton className="mt-4 h-8 w-64 max-w-full" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-4 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-4 w-2/3 max-w-xl" />
        </CardContent>
      </Card>

      {/* Services and booking */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="gap-0 py-0">
          <div className="flex items-center justify-between border-b p-5">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-8 w-40" />
          </div>
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center justify-between gap-4 border-b p-5 last:border-b-0">
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </Card>

        <Card className="gap-0 py-0">
          <CardContent className="space-y-4 p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-48 w-full" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((slot) => (
                <Skeleton key={slot} className="h-9" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}