import { bookingDate, parseBookingDate, DAY_MS } from "../lib/time.js";
import { bookedDurationMinutes, bookedPrice } from "../lib/booking-snapshot.js";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";
import { BookingError, createBooking } from "../services/booking.service.js";

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
    const startOfToday = parseBookingDate(bookingDate(now))!;
    const startOfTomorrow = new Date(startOfToday.getTime() + DAY_MS);

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
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(startsAtValue)) {
    return res.status(400).json({ success: false, message: "Appointment time must include a timezone offset" });
  }

  try {
    const appointment = await createBooking({ customerId: req.user!.userId, providerKind,
      providerId: id, serviceId, startsAt, customerNotes, ...(staffId ? { staffId } : {}) });

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


/** Direct saved confirmation; never search a paginated collection for a detail resource. */
export const getCustomerAppointment = async (req: AuthenticatedRequest, res: Response) => {
  const id = typeof req.params.id === "string" ? req.params.id : "";
  try {
    const appointment = await prisma.appointment.findFirst({ where: { id, customerId: req.user!.userId },
      include: { service: { select: { name: true, durationMinutes: true, expectedPrice: true } },
        business: { select: { name: true, address: true, phone: true, cancellationCutoffHours: true } },
        soleProvider: { select: { displayName: true, city: true, cancellationCutoffHours: true, user: { select: { phone: true } } } },
        staff: { select: { user: { select: { firstName: true, lastName: true } } } } } });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
    const policy = appointment.business ?? appointment.soleProvider;
    const cutoff = policy?.cancellationCutoffHours ?? 24;
    return res.json({ success: true, appointment: {
      id: appointment.id, time: appointment.scheduledStart, endsAt: appointment.scheduledEnd,
      service: appointment.service.name, durationMinutes: bookedDurationMinutes(appointment),
      price: bookedPrice(appointment)?.toString() ?? null, status: appointment.status,
      timeZone: "Africa/Johannesburg", customerNotes: appointment.customerNotes,
      providerName: appointment.business?.name ?? appointment.soleProvider?.displayName ?? "Provider",
      providerId: appointment.businessId ? `business:${appointment.businessId}` : appointment.soleProviderId ? `sole:${appointment.soleProviderId}` : null,
      staffName: appointment.staff ? `${appointment.staff.user.firstName} ${appointment.staff.user.lastName ?? ""}`.trim() : null,
      address: appointment.business?.address ?? appointment.soleProvider?.city ?? null,
      phone: appointment.business?.phone ?? appointment.soleProvider?.user.phone ?? null,
      cancellationCutoffHours: cutoff,
      changeDeadline: new Date(appointment.scheduledStart.getTime() - cutoff * 3_600_000),
    } });
  } catch {
    return res.status(500).json({ success: false, message: "Unable to load appointment" });
  }
};
