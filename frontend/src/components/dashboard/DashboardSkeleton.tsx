import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton({ label = "Loading dashboard", detail = false }: { label?: string; detail?: boolean }) {
  return <div role="status" aria-label={label} aria-busy="true" className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <span className="sr-only">{label}</span>
    <div className="space-y-3"><Skeleton className="h-7 w-48 max-w-full" /><Skeleton className="h-4 w-72 max-w-full" /></div>
    {!detail && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(item => <Card key={item} className="gap-0 rounded-lg py-0"><CardContent className="space-y-3 p-5"><Skeleton className="h-4 w-28" /><Skeleton className="h-8 w-16" /><Skeleton className="h-3 w-36 max-w-full" /></CardContent></Card>)}</div>}
    <Card className="gap-0 rounded-lg py-0"><CardContent className="space-y-5 p-5 sm:p-6"><Skeleton className="h-5 w-44" />{[0, 1, 2].map(item => <div key={item} className="flex items-center gap-4"><Skeleton className="size-10 shrink-0 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/2" /></div></div>)}</CardContent></Card>
  </div>;
}