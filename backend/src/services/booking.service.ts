import { bookedDurationMinutes } from "../lib/booking-snapshot.js";
import prisma from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import {
  generateAppointmentSlots,
  intersectAvailabilityWindows,
  parseLocalDate,
  type AvailabilityWindow,
} from "./availability.service.js";

export class BookingError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "BookingError";
  }
}

type DatabaseClient = Prisma.TransactionClient;

type BookingAvailabilityInput = {
  providerKind: "sole" | "business";
  providerId: string;
  serviceId: string;
  date: string;
  staffId?: string;
};

export type BookingAvailability = {
  service: { id: string; name: string; durationMinutes: number };
  staff: Array<{ id: string; name: string }>;
  selectedStaffId: string | null;
  slots: Array<{ startsAt: string; status: "AVAILABLE" | "BOOKED" }>;
};

function getDateBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function resolveBookingAvailability(
  db: DatabaseClient,
  input: BookingAvailabilityInput,
): Promise<BookingAvailability> {
  const date = parseLocalDate(input.date);
  if (!date) throw new BookingError("Choose a valid appointment date", 400);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) throw new BookingError("Past dates are not available", 400);
  const maximumDate = new Date(today);
  maximumDate.setDate(maximumDate.getDate() + 90);
  if (date > maximumDate) throw new BookingError("Appointments can only be booked up to 90 days ahead", 400);

  const dayOfWeek = date.getDay();
  const { start: dayStart, end: dayEnd } = getDateBounds(date);

  if (input.providerKind === "sole") {
    const provider = await db.soleProvider.findFirst({
      where: { id: input.providerId, user: { isVerified: true } },
      select: {
        id: true,
        availability: { select: { dayOfWeek: true, startTime: true, endTime: true, active: true } },
        services: {
          where: { id: input.serviceId, active: true },
          select: { id: true, name: true, durationMinutes: true },
        },
      },
    });
    const service = provider?.services[0];
    if (!provider || !service) throw new BookingError("This provider or service is not available", 404);

    const appointments = await db.appointment.findMany({
      where: {
        soleProviderId: provider.id,
        scheduledStart: { gte: dayStart, lt: dayEnd },
        status: { in: ["CONFIRMED", "RESCHEDULED"] },
      },
      include: { service: { select: { durationMinutes: true } } },
    });
    const slots = generateAppointmentSlots({
      date: input.date,
      durationMinutes: service.durationMinutes,
      availability: provider.availability,
      bookedRanges: appointments.map((appointment) => ({
        start: appointment.scheduledStart,
        durationMinutes: bookedDurationMinutes(appointment),
      })),
    });

    return {
      service,
      staff: [],
      selectedStaffId: null,
      slots: slots.map((slot) => ({ startsAt: slot.startsAt.toISOString(), status: slot.status })),
    };
  }

  const business = await db.business.findFirst({
    where: { id: input.providerId, owner: { isVerified: true } },
    select: {
      id: true,
      availability: { select: { dayOfWeek: true, startTime: true, endTime: true, active: true } },
      services: {
        where: { id: input.serviceId, active: true },
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          staffAssignments: {
            where: { staff: { user: { isVerified: true } } },
            select: {
              staffId: true,
              staff: {
                select: {
                  availability: { select: { dayOfWeek: true, startTime: true, endTime: true, active: true } },
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  const service = business?.services[0];
  if (!business || !service) throw new BookingError("This business or service is not available", 404);

  const eligibleStaff = service.staffAssignments.map((assignment) => ({
    id: assignment.staffId,
    name: `${assignment.staff.user.firstName} ${assignment.staff.user.lastName ?? ""}`.trim(),
    availability: assignment.staff.availability as AvailabilityWindow[],
  }));
  const staff = eligibleStaff.map(({ id, name }) => ({ id, name }));
  if (!input.staffId) {
    return { service, staff, selectedStaffId: null, slots: [] };
  }

  const selectedStaff = eligibleStaff.find((member) => member.id === input.staffId);
  if (!selectedStaff) throw new BookingError("Choose a staff member assigned to this service", 400);

  const availability = intersectAvailabilityWindows(
    business.availability as AvailabilityWindow[],
    selectedStaff.availability,
    dayOfWeek,
  );
  const appointments = await db.appointment.findMany({
    where: {
      staffId: selectedStaff.id,
      scheduledStart: { gte: dayStart, lt: dayEnd },
      status: { in: ["CONFIRMED", "RESCHEDULED"] },
    },
    include: { service: { select: { durationMinutes: true } } },
  });
  const slots = generateAppointmentSlots({
    date: input.date,
    durationMinutes: service.durationMinutes,
    availability,
    bookedRanges: appointments.map((appointment) => ({
      start: appointment.scheduledStart,
      durationMinutes: bookedDurationMinutes(appointment),
    })),
  });

  return {
    service,
    staff,
    selectedStaffId: selectedStaff.id,
    slots: slots.map((slot) => ({ startsAt: slot.startsAt.toISOString(), status: slot.status })),
  };
}

export async function withBookingTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(operation, {
    isolationLevel: "Serializable",
    maxWait: 15_000,
    timeout: 20_000,
  });
}
