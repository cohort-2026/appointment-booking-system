import { AppointmentCard, type Appointment } from "./AppointmentCard"
import { sastDate } from "@/lib/bookingTime"

export function groupConsecutiveAppointments(appointments: Appointment[]): Appointment[][] {
  const sorted = appointments.map((appointment, index) => ({ appointment, index }))
    .sort((first, second) => Date.parse(first.appointment.time) - Date.parse(second.appointment.time))
  const groups: { appointments: Appointment[]; firstIndex: number }[] = []

  for (const { appointment, index } of sorted) {
    const group = groups.at(-1)
    const previous = group?.appointments.at(-1)
    const previousEnd = previous?.endsAt ? Date.parse(previous.endsAt) : NaN
    const nextStart = Date.parse(appointment.time)
    const canGroup = previous && previous.providerId && previous.providerId === appointment.providerId &&
      previous.staffId !== undefined && appointment.staffId !== undefined && previous.staffId === appointment.staffId &&
      previous.status === appointment.status && Number.isFinite(previousEnd) && Number.isFinite(nextStart) &&
      typeof previous.bufferAfterMinutes === "number" && previous.bufferAfterMinutes >= 0 &&
      previousEnd + previous.bufferAfterMinutes * 60_000 === nextStart &&
      sastDate(new Date(previous.time)) === sastDate(new Date(appointment.time))
    if (canGroup && group) {
      group.appointments.push(appointment)
      group.firstIndex = Math.min(group.firstIndex, index)
    } else {
      groups.push({ appointments: [appointment], firstIndex: index })
    }
  }
  return groups.sort((first, second) => first.firstIndex - second.firstIndex).map(group => group.appointments)
}

export function AppointmentList({ appointments }: { appointments: Appointment[] }) {
  return <div className="space-y-3 p-4 sm:p-5">
    {groupConsecutiveAppointments(appointments).map(group => <div key={group[0].id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {group.length > 1 && <div className="border-b border-sky-100 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-900">{group.length} consecutive appointments</div>}
      <div className="divide-y divide-slate-100">{group.map(appointment => <AppointmentCard key={appointment.id} appointment={appointment} href={`/dashboard/customer/appointments/${encodeURIComponent(appointment.id)}`} />)}</div>
    </div>)}
  </div>
}