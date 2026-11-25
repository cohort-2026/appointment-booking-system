import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface StatCardProps {
  label: string
  value?: number
  loading?: boolean
}

export function StatCard({ label, value, loading }: StatCardProps) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {label} appointments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-12 rounded bg-slate-100" />
        ) : (
          <p className="text-3xl font-bold tracking-tight text-slate-900">
            {value ?? "—"}
          </p>
        )}
      </CardContent>
    </Card>
  )
}