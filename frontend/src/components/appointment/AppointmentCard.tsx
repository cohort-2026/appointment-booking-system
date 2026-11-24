import { Link } from "react-router-dom"
import { StatusBadge, type AppointmentStatus } from "./status-badge"
import { cn } from "@/lib/utils"

export interface Appointment {
  id: string
  time: string
  service: string
  providerName: string
  staffName: string | null
  staffTitle: string | null
  durationMinutes: number
  price: string | null
  status: string
}

interface AppointmentCardProps {
  appointment: Appointment
  href: string
  variant?: "list" | "detail"
  className?: string
}

export function AppointmentCard({ 
  appointment, 
  href, 
  variant = "list",
  className 
}: AppointmentCardProps) {
  // Format the time consistently using SAST
  const formattedTime = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: variant === "detail" ? "full" : "medium",
    timeStyle: "short",
  }).format(new Date(appointment.time))

  // Normalize backend status (e.g., "NO_SHOW" -> "no-show")
  const status = appointment.status.toLowerCase().replaceAll("_", "-") as AppointmentStatus

  // --- DETAIL VIEW (For "Just Booked" or Appointment Detail Page) ---
  if (variant === "detail") {
    return (
      <div className={cn("grid gap-5 p-5 sm:grid-cols-2 sm:p-6", className)}>
        <DetailField label="Service" value={appointment.service} />
        <DetailField label="Provider" value={appointment.providerName} />
        
        {appointment.staffName && (
          <DetailField
            label="Assigned staff"
            value={`${appointment.staffName}${appointment.staffTitle ? ` · ${appointment.staffTitle}` : ""}`}
          />
        )}
        
        <DetailField label="Date and time" value={`${formattedTime} SAST`} />
        <DetailField label="Duration" value={`${appointment.durationMinutes} minutes`} />
        
        {appointment.price !== null && (
          <DetailField label="Price" value={`R${appointment.price}`} />
        )}
        
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Status</p>
          <div className="mt-1">
            <StatusBadge status={status} />
          </div>
        </div>
      </div>
    )
  }

  // --- LIST VIEW (For Upcoming Appointments list) ---
  return (
    <Link
      to={href}
      className={cn(
        "flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6",
        className
      )}
    >
      <div>
        <p className="font-semibold">{appointment.service}</p>
        <p className="mt-1 text-sm text-slate-500">with {appointment.providerName}</p>
        
        {appointment.staffName && (
          <p className="mt-1 text-sm text-slate-500">
            Staff: {appointment.staffName}{appointment.staffTitle ? ` · ${appointment.staffTitle}` : ""}
          </p>
        )}
        
        <p className="mt-1 text-sm text-slate-500">
          Duration: {appointment.durationMinutes} minutes
          {appointment.price !== null ? ` · Price: R${appointment.price}` : ""}
        </p>
      </div>
      
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <p className="text-sm font-medium text-slate-600">{formattedTime} SAST</p>
        <StatusBadge status={status} />
      </div>
    </Link>
  )
}

// Small helper for the detail layout to keep the JSX clean
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  )
}