export type CalendarAppointment = {
  id: string;
  customerName: string;
  serviceName: string;
  date: string;
  endsAt?: string | null;
  status: string;
};

export type CalendarBlock = {
  appointment: CalendarAppointment;
  startMinute: number;
  endMinute: number;
  column: number;
  columns: number;
};

export type CalendarAvailability = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
};

export function calendarTimeRange(availability: CalendarAvailability[], appointments: CalendarAppointment[], days: string[]): { start: number; end: number } | null {
  const starts: number[] = [];
  const ends: number[] = [];
  for (const day of days) {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    for (const window of availability.filter(item => item.active && item.dayOfWeek === weekday)) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(window.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(window.endTime)) continue;
      const [startHour, startMinute] = window.startTime.split(":").map(Number);
      const [endHour, endMinute] = window.endTime.split(":").map(Number);
      const start = startHour * 60 + startMinute;
      const end = endHour * 60 + endMinute;
      if (start < end) { starts.push(start); ends.push(end); }
    }
    for (const block of layoutCalendarDay(appointments, day)) {
      starts.push(block.startMinute);
      ends.push(block.endMinute);
    }
  }
  return starts.length ? { start: Math.min(...starts), end: Math.max(...ends) } : null;
}

export function layoutCalendarDay(appointments: CalendarAppointment[], day: string): CalendarBlock[] {
  const dayStart = Date.parse(`${day}T00:00:00+02:00`);
  if (!Number.isFinite(dayStart)) return [];
  const dayEnd = dayStart + 86_400_000;
  const blocks = appointments.flatMap(appointment => {
    const start = Date.parse(appointment.date);
    const end = appointment.endsAt ? Date.parse(appointment.endsAt) : NaN;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || start >= dayEnd || end <= dayStart) return [];
    return [{ appointment, startMinute: (Math.max(start, dayStart) - dayStart) / 60_000,
      endMinute: (Math.min(end, dayEnd) - dayStart) / 60_000, column: 0, columns: 1 }];
  }).sort((first, second) => first.startMinute - second.startMinute || first.endMinute - second.endMinute);

  let group: CalendarBlock[] = [];
  let groupEnd = 0;
  const finishGroup = () => {
    const columns = Math.max(1, ...group.map(block => block.column + 1));
    group.forEach(block => { block.columns = columns; });
  };
  for (const block of blocks) {
    if (group.length && block.startMinute >= groupEnd) {
      finishGroup();
      group = [];
      groupEnd = 0;
    }
    const occupied = new Set(group.filter(other => other.endMinute > block.startMinute).map(other => other.column));
    while (occupied.has(block.column)) block.column++;
    group.push(block);
    groupEnd = Math.max(groupEnd, block.endMinute);
  }
  finishGroup();
  return blocks;
}