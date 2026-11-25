import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusMap = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-sky-100 text-sky-800 border-sky-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "no-show": "bg-rose-100 text-rose-800 border-rose-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  rescheduled: "bg-purple-100 text-purple-800 border-purple-200",
} as const

export type AppointmentStatus = keyof typeof statusMap

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  // Fallback to cancelled style if the backend sends an unexpected status
  const styles = statusMap[status] || statusMap.cancelled
  
  return (
    <Badge variant="outline" className={cn("capitalize", styles)}>
      {status.replaceAll("-", " ")}
    </Badge>
  )
}