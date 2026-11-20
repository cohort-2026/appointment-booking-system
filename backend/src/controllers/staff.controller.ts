import { bookedDurationMinutes } from "../lib/booking-snapshot.js";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";
import { parseAvailabilityRules } from "../lib/phase1-validation.js";
import { normalizePhone } from "../lib/phone.js";

async function getCurrentStaff(userId: string) {
  return prisma.businessStaff.findUnique({
    where: { userId },
    select: {
      id: true,
      businessId: true,
      title: true,
      business: { select: { name: true, availability: true } },
      availability: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
    },
  });
}

function appointmentSummary(appointment: {
  id: string;
  scheduledStart: Date;
  scheduledEnd: Date | null;
  status: string;
  customer: { firstName: string; lastName: string | null };
  service: { name: string; durationMinutes: number };
}) {
  return {
    id: appointment.id,
    startsAt: appointment.scheduledStart,
    status: appointment.status,
    customerName: `${appointment.customer.firstName} ${appointment.customer.lastName ?? ""}`.trim(),
    service: appointment.service.name,
    durationMinutes: bookedDurationMinutes(appointment),
  };
}

export const getStaffDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const staff = await getCurrentStaff(req.user!.userId);
    if (!staff) return res.status(404).json({ success: false, message: "Staff profile not found" });

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
    const [todayAppointments, upcomingAppointments, completedAppointments, cancelledAppointments, appointments] = await Promise.all([
      prisma.appointment.count({ where: { staffId: staff.id, scheduledStart: { gte: startOfToday, lt: startOfTomorrow } } }),
      prisma.appointment.count({ where: { staffId: staff.id, scheduledStart: { gte: now }, status: { in: ["CONFIRMED", "RESCHEDULED"] } } }),
      prisma.appointment.count({ where: { staffId: staff.id, scheduledStart: { gte: startOfWeek }, status: "COMPLETED" } }),
      prisma.appointment.count({ where: { staffId: staff.id, scheduledStart: { gte: startOfWeek }, status: "CANCELLED" } }),
      prisma.appointment.findMany({
        where: {
          staffId: staff.id,
          scheduledStart: { gte: startOfToday, lt: startOfTomorrow },
          status: { in: ["CONFIRMED", "RESCHEDULED"] },
        },
        orderBy: { scheduledStart: "asc" },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          service: { select: { name: true, durationMinutes: true } },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      staff: {
        id: staff.id,
        title: staff.title,
        businessName: staff.business.name,
        firstName: staff.user.firstName,
        lastName: staff.user.lastName,
      },
      stats: { todayAppointments, upcomingAppointments, completedAppointments, cancelledAppointments },
      todayAppointments: appointments.map(appointmentSummary),
    });
  } catch (error) {
    console.error("Staff dashboard fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load staff dashboard" });
  }
};

export const getStaffAppointments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const staff = await prisma.businessStaff.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!staff) return res.status(404).json({ success: false, message: "Staff profile not found" });

    const appointments = await prisma.appointment.findMany({
      where: { staffId: staff.id },
      orderBy: { scheduledStart: "asc" },
      take: 300,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        service: { select: { name: true, durationMinutes: true } },
      },
    });

    return res.status(200).json({ success: true, appointments: appointments.map(appointmentSummary) });
  } catch (error) {
    console.error("Staff appointments fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load your appointments" });
  }
};

export const updateStaffAppointmentStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body as { status?: unknown };
  if (status !== "COMPLETED" && status !== "NO_SHOW") {
    return res.status(400).json({ success: false, message: "Staff may mark appointments completed or no-show" });
  }

  const appointmentId = typeof req.params.id === "string" ? req.params.id : "";
  if (!appointmentId) return res.status(400).json({ success: false, message: "Invalid appointment ID" });

  try {
    const staff = await prisma.businessStaff.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!staff) return res.status(404).json({ success: false, message: "Staff profile not found" });

    const now = new Date();
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        staffId: staff.id,
        status: { in: ["CONFIRMED", "RESCHEDULED"] },
      },
      select: { id: true, scheduledStart: true },
    });
    if (!appointment) return res.status(404).json({ success: false, message: "Active appointment not found" });
    if (appointment.scheduledStart > now) {
      return res.status(400).json({ success: false, message: "You can update an appointment after its scheduled start time" });
    }

    await prisma.appointment.update({ where: { id: appointment.id }, data: { status, noShow: status === "NO_SHOW" } });
    return res.status(200).json({ success: true, message: `Appointment marked ${status === "NO_SHOW" ? "no-show" : "completed"}` });
  } catch (error) {
    console.error("Staff appointment status update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update appointment" });
  }
};

export const getStaffAvailability = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const staff = await getCurrentStaff(req.user!.userId);
    if (!staff) return res.status(404).json({ success: false, message: "Staff profile not found" });

    return res.status(200).json({
      success: true,
      schedule: staff.availability,
      businessSchedule: staff.business.availability,
      inheritsBusinessSchedule: staff.availability.length === 0,
    });
  } catch (error) {
    console.error("Staff availability fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load your availability" });
  }
};

export const replaceStaffAvailability = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = parseAvailabilityRules(req.body?.availability);
  if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.error });

  try {
    const staff = await prisma.businessStaff.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!staff) return res.status(404).json({ success: false, message: "Staff profile not found" });

    const now = new Date();
    const schedule = await prisma.$transaction(async (transaction) => {
      await transaction.availability.deleteMany({ where: { staffId: staff.id } });
      if (parsed.data.length > 0) {
        await transaction.availability.createMany({
          data: parsed.data.map((rule) => ({ ...rule, staffId: staff.id, createdAt: now, updatedAt: now })),
        });
      }
      return transaction.availability.findMany({
        where: { staffId: staff.id },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
    }, { maxWait: 15_000, timeout: 20_000 });

    return res.status(200).json({ success: true, schedule });
  } catch (error) {
    console.error("Staff availability update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update your availability" });
  }
};

export const getStaffProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const staff = await getCurrentStaff(req.user!.userId);
    if (!staff) return res.status(404).json({ success: false, message: "Staff profile not found" });
    return res.status(200).json({
      success: true,
      profile: {
        id: staff.user.id,
        email: staff.user.email,
        firstName: staff.user.firstName,
        lastName: staff.user.lastName,
        phone: staff.user.phone,
        title: staff.title,
        businessName: staff.business.name,
      },
    });
  } catch (error) {
    console.error("Staff profile fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load your profile" });
  }
};

export const updateStaffProfile = async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const allowedFields = new Set(["firstName", "lastName", "phone"]);
  const invalidField = Object.keys(body ?? {}).find((field) => !allowedFields.has(field));
  if (!body || typeof body !== "object" || Array.isArray(body) || invalidField) {
    return res.status(400).json({ success: false, message: invalidField ? `Unsupported profile field: ${invalidField}` : "A profile object is required" });
  }

  const data: { firstName?: string; lastName?: string | null; phone?: string | null } = {};
  if (Object.hasOwn(body, "firstName")) {
    if (typeof body.firstName !== "string" || !/^[\p{L}][\p{L}\p{M} .'-]{0,49}$/u.test(body.firstName.trim())) {
      return res.status(400).json({ success: false, message: "Enter a valid first name" });
    }
    data.firstName = body.firstName.trim();
  }
  if (Object.hasOwn(body, "lastName")) {
    if (body.lastName !== null && (typeof body.lastName !== "string" || body.lastName.trim().length > 80)) {
      return res.status(400).json({ success: false, message: "Last name must be 80 characters or fewer" });
    }
    data.lastName = typeof body.lastName === "string" ? body.lastName.trim() || null : null;
  }
  if (Object.hasOwn(body, "phone")) {
    if (body.phone !== null && typeof body.phone !== "string") {
      return res.status(400).json({ success: false, message: "Phone must be a string or null" });
    }
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
    const phone = rawPhone ? normalizePhone(rawPhone) : null;
    if (rawPhone && !phone) return res.status(400).json({ success: false, message: "Enter a valid South African phone number" });
    data.phone = phone;
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ success: false, message: "At least one profile field is required" });

  try {
    await prisma.user.update({ where: { id: req.user!.userId }, data });
    return getStaffProfile(req, res);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return res.status(409).json({ success: false, message: "That phone number is already in use" });
    }
    console.error("Staff profile update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update your profile" });
  }
};
