import { createBookingSnapshot, bookedDurationMinutes, bookedPrice } from "../lib/booking-snapshot.js";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";
import { BookingError, resolveBookingAvailability } from "../services/booking.service.js";
import { timeRangesOverlap } from "../services/availability.service.js";
import { notifyAppointmentCreated } from "../services/appointment-notification.service.js";

export const getCustomerDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [stats, upcomingAppointments] = await Promise.all([
      prisma.appointment.groupBy({
        by: ["status"],
        where: { customerId: req.user.userId },
        _count: { _all: true },
      }),
      prisma.appointment.findMany({
        where: {
          customerId: req.user.userId,
          scheduledStart: { gte: now },
          status: { in: ["CONFIRMED", "RESCHEDULED"] },
        },
        orderBy: { scheduledStart: "asc" },
        take: 5,
        include: {
          service: { select: { name: true, durationMinutes: true, expectedPrice: true } },
          soleProvider: { select: { displayName: true } },
          business: { select: { name: true } },
          staff: {
            select: {
              title: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    const countByStatus = Object.fromEntries(
      stats.map((entry) => [entry.status, entry._count._all]),
    ) as Record<string, number>;

    return res.status(200).json({
      success: true,
      stats: {
        upcomingAppointments:
          (countByStatus.CONFIRMED ?? 0) + (countByStatus.RESCHEDULED ?? 0),
        todayAppointments: await prisma.appointment.count({
          where: {
            customerId: req.user.userId,
            scheduledStart: { gte: startOfToday, lt: startOfTomorrow },
          },
        }),
        completedAppointments: countByStatus.COMPLETED ?? 0,
        cancelledAppointments: countByStatus.CANCELLED ?? 0,
      },
      upcomingAppointments: upcomingAppointments.map((appointment) => ({
        id: appointment.id,
        time: appointment.scheduledStart,
        service: appointment.service.name,
        providerName:
          appointment.soleProvider?.displayName ??
          appointment.business?.name ??
          "Provider",
        staffName: appointment.staff
          ? `${appointment.staff.user.firstName}${appointment.staff.user.lastName ? ` ${appointment.staff.user.lastName}` : ""}`
          : null,
        staffTitle: appointment.staff?.title ?? null,
        durationMinutes: bookedDurationMinutes(appointment),
        price: bookedPrice(appointment)?.toString() ?? null,
        status: appointment.status,
      })),
    });
  } catch (error) {
    console.error("Customer dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while loading the dashboard",
    });
  }
};

export const getCustomerAppointments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const now = new Date();

    const [upcoming, past] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          customerId: req.user.userId,
          scheduledStart: { gte: now },
          status: { in: ["CONFIRMED", "RESCHEDULED"] },
        },
        orderBy: { scheduledStart: "asc" },
        include: {
          service: { select: { name: true, durationMinutes: true, expectedPrice: true } },
          soleProvider: { select: { displayName: true } },
          business: { select: { name: true } },
          staff: { select: { title: true, user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      prisma.appointment.findMany({
        where: {
          customerId: req.user.userId,
          OR: [{ scheduledStart: { lt: now } }, { status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] } }],
        },
        orderBy: { scheduledStart: "desc" },
        take: 10,
        include: {
          service: { select: { name: true, durationMinutes: true, expectedPrice: true } },
          soleProvider: { select: { displayName: true } },
          business: { select: { name: true } },
          staff: { select: { title: true, user: { select: { firstName: true, lastName: true } } } },
        },
      }),
    ]);

    const format = (a: (typeof upcoming)[number]) => ({
      id: a.id,
      time: a.scheduledStart,
      service: a.service.name,
      providerName: a.soleProvider?.displayName ?? a.business?.name ?? "Provider",
      staffName: a.staff
        ? `${a.staff.user.firstName}${a.staff.user.lastName ? ` ${a.staff.user.lastName}` : ""}`
        : null,
      staffTitle: a.staff?.title ?? null,
      durationMinutes: bookedDurationMinutes(a),
      price: bookedPrice(a)?.toString() ?? null,
      status: a.status,
    });

    return res.status(200).json({
      success: true,
      upcoming: upcoming.map(format),
      past: past.map(format),
    });
  } catch (error) {
    console.error("Customer appointments error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong while loading your appointments" });
  }
};

export const createCustomerAppointment = async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const providerId = typeof body?.providerId === "string" ? body.providerId : "";
  const serviceId = typeof body?.serviceId === "string" ? body.serviceId : "";
  const startsAtValue = typeof body?.startsAt === "string" ? body.startsAt : "";
  const staffId = typeof body?.staffId === "string" ? body.staffId : undefined;
  const separator = providerId.indexOf(":");
  const providerKind = providerId.slice(0, separator);
  const id = providerId.slice(separator + 1);

  if (!id || (providerKind !== "sole" && providerKind !== "business") || !serviceId || !startsAtValue) {
    return res.status(400).json({ success: false, message: "Provider, service, and appointment time are required" });
  }
  if ((providerKind === "business" && !staffId) || (providerKind === "sole" && staffId)) {
    return res.status(400).json({ success: false, message: "Choose a valid provider for this appointment" });
  }

  if (body.customerNotes !== undefined && body.customerNotes !== null &&
      (typeof body.customerNotes !== "string" || Array.from(body.customerNotes).length > 500)) {
    return res.status(400).json({ success: false, message: "Notes must be text of at most 500 characters" });
  }
  const customerNotes = typeof body.customerNotes === "string" ? body.customerNotes.trim() || null : null;
  const startsAt = new Date(startsAtValue);
  if (!Number.isFinite(startsAt.getTime())) {
    return res.status(400).json({ success: false, message: "Choose a valid appointment time" });
  }
  const date = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, "0")}-${String(startsAt.getDate()).padStart(2, "0")}`;

  try {
    const appointment = await prisma.$transaction(async (transaction) => {
      const availability = await resolveBookingAvailability(transaction, {
        providerKind,
        providerId: id,
        serviceId,
        date,
        ...(staffId ? { staffId } : {}),
      });
      const slot = availability.slots.find((candidate) => new Date(candidate.startsAt).getTime() === startsAt.getTime());
      if (!slot || slot.status !== "AVAILABLE") {
        throw new BookingError("That time is no longer available. Choose another slot.", 409);
      }

      const requestedEnd = new Date(startsAt.getTime() + availability.service.durationMinutes * 60_000);
      const existingAppointments = await transaction.appointment.findMany({
        where: {
          customerId: req.user!.userId,
          status: { in: ["CONFIRMED", "RESCHEDULED"] },
          scheduledStart: {
            gte: new Date(startsAt.getTime() - 24 * 60 * 60 * 1000),
            lt: requestedEnd,
          },
        },
        include: { service: { select: { durationMinutes: true } } },
      });
      const hasOverlappingCustomerBooking = existingAppointments.some((existing) =>
        timeRangesOverlap(
          startsAt,
          availability.service.durationMinutes,
          existing.scheduledStart,
          bookedDurationMinutes(existing),
        ),
      );
      if (hasOverlappingCustomerBooking) {
        throw new BookingError(
          "You already have another active booking during this time. Please choose another time.",
          409,
        );
      }

      const serviceSnapshot = await transaction.service.findUniqueOrThrow({
        where: { id: serviceId },
        select: { durationMinutes: true, expectedPrice: true, bufferAfterMinutes: true },
      });
      const snapshot = createBookingSnapshot(startsAt, serviceSnapshot);
      return transaction.appointment.create({
        data: {
          customerId: req.user!.userId,
          serviceId,
          scheduledStart: startsAt,
          ...snapshot,
          customerNotes,
          events: {
            create: {
              type: "CREATED",
              actor: "CUSTOMER",
              actorUserId: req.user!.userId,
              newStatus: "CONFIRMED",
              newScheduledStart: startsAt,
              newScheduledEnd: snapshot.scheduledEnd,
            },
          },
          ...(providerKind === "sole"
            ? { soleProviderId: id }
            : { businessId: id, staffId: staffId! }),
        },
        include: {
          service: { select: { name: true, durationMinutes: true } },
          customer: { select: { firstName: true, email: true } },
          staff: { select: { user: { select: { firstName: true, lastName: true } } } },
          soleProvider: { select: { displayName: true } },
          business: { select: { name: true } },
        },
      });
    }, {
      isolationLevel: "Serializable",
      maxWait: 15_000,
      timeout: 20_000,
    });

    await notifyAppointmentCreated(appointment);

    return res.status(201).json({
      success: true,
      appointment: {
        id: appointment.id,
        service: appointment.service.name,
        durationMinutes: bookedDurationMinutes(appointment),
        startsAt: appointment.scheduledStart,
        status: appointment.status,
      },
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      return res.status(409).json({ success: false, message: "That time was just booked. Choose another slot." });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2028") {
      return res.status(503).json({ success: false, message: "The booking service is busy. Please try again." });
    }
    console.error("Customer appointment creation error:", error);
    return res.status(500).json({ success: false, message: "Unable to create appointment" });
  }
};
