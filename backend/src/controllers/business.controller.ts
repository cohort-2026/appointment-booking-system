import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";
import { normalizePhone } from "../lib/phone.js";
import {
  createStaffInvitationToken,
  hashStaffInvitationToken,
  STAFF_INVITATION_TTL_MS,
} from "../lib/staff-invitation.js";
import { sendStaffInvitationEmail } from "../services/email.service.js";
import { parseAvailabilityRules, parseServicePayload } from "../lib/phase1-validation.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getOwnedBusiness(userId: string) {
  return prisma.business.findUnique({
    where: { ownerUserId: userId },
    select: { id: true },
  });
}

function parseStaffIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id.trim())) {
    return null;
  }
  return [...new Set(value.map((id) => (id as string).trim()))];
}

const DEFAULT_BUSINESS_HOURS = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  startTime: "09:00",
  endTime: "17:00",
  active: false,
}));

export const getBusinessAvailability = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const business = await getOwnedBusiness(req.user!.userId);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    const savedHours = await prisma.businessAvailability.findMany({
      where: { businessId: business.id },
      orderBy: { dayOfWeek: "asc" },
    });
    const hoursByDay = new Map(savedHours.map((hours) => [hours.dayOfWeek, hours]));
    const availability = DEFAULT_BUSINESS_HOURS.map((defaults) => {
      const saved = hoursByDay.get(defaults.dayOfWeek);
      return saved ? {
        dayOfWeek: saved.dayOfWeek,
        startTime: saved.startTime,
        endTime: saved.endTime,
        active: saved.active,
      } : defaults;
    });

    return res.status(200).json({ success: true, availability });
  } catch (error) {
    console.error("Business availability fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load business availability" });
  }
};

export const replaceBusinessAvailability = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = parseAvailabilityRules(req.body?.availability);
  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.error });
  }
  const days = new Set(parsed.data.map((rule) => rule.dayOfWeek));
  if (parsed.data.length !== 7 || days.size !== 7) {
    return res.status(400).json({ success: false, message: "Provide exactly one availability rule for each day of the week" });
  }

  try {
    const business = await getOwnedBusiness(req.user!.userId);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    const availability = await prisma.$transaction(async (tx) => {
      await tx.businessAvailability.deleteMany({ where: { businessId: business.id } });
      await tx.businessAvailability.createMany({
        data: parsed.data.map((rule) => ({
          businessId: business.id,
          ...rule,
          updatedAt: new Date(),
        })),
      });
      return tx.businessAvailability.findMany({
        where: { businessId: business.id },
        orderBy: { dayOfWeek: "asc" },
      });
    });

    return res.status(200).json({ success: true, availability });
  } catch (error) {
    console.error("Business availability update error:", error);
    return res.status(500).json({ success: false, message: "Unable to save business availability" });
  }
};

export const getBusinessServices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const business = await getOwnedBusiness(req.user!.userId);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    const services = await prisma.service.findMany({
      where: { businessId: business.id },
      include: {
        staffAssignments: {
          include: {
            staff: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    return res.status(200).json({
      success: true,
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        expectedPrice: service.expectedPrice,
        active: service.active,
        assignedStaffIds: service.staffAssignments.map((assignment) => assignment.staffId),
        assignedStaff: service.staffAssignments.map((assignment) => ({
          id: assignment.staffId,
          name: `${assignment.staff.user.firstName} ${assignment.staff.user.lastName ?? ""}`.trim(),
        })),
      })),
    });
  } catch (error) {
    console.error("Business services fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load business services" });
  }
};

export const createBusinessService = async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const staffIds = parseStaffIds(body?.staffIds);
  if (!staffIds) {
    return res.status(400).json({ success: false, message: "Staff assignments must be an array of staff IDs" });
  }
  const payload = { ...body };
  delete payload.staffIds;
  delete payload.active;
  const parsed = parseServicePayload(payload);
  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.error });
  }

  try {
    const business = await getOwnedBusiness(req.user!.userId);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    const service = await prisma.$transaction(async (tx) => {
      if (staffIds.length > 0) {
        const validStaff = await tx.businessStaff.count({ where: { businessId: business.id, id: { in: staffIds } } });
        if (validStaff !== staffIds.length) throw new Error("INVALID_STAFF_ASSIGNMENT");
      }

      return tx.service.create({
        data: {
          name: parsed.data.name!,
          durationMinutes: parsed.data.durationMinutes!,
          ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
          ...(parsed.data.expectedPrice !== undefined ? { expectedPrice: parsed.data.expectedPrice } : {}),
          businessId: business.id,
          active: staffIds.length > 0,
          staffAssignments: { create: staffIds.map((staffId) => ({ staffId })) },
        },
      });
    });

    return res.status(201).json({
      success: true,
      service: { ...service, assignedStaffIds: staffIds },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_STAFF_ASSIGNMENT") {
      return res.status(400).json({ success: false, message: "One or more selected staff do not belong to this business" });
    }
    console.error("Business service creation error:", error);
    return res.status(500).json({ success: false, message: "Unable to create business service" });
  }
};

export const updateBusinessService = async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const staffIds = parseStaffIds(body?.staffIds);
  if (!staffIds) {
    return res.status(400).json({ success: false, message: "Staff assignments must be an array of staff IDs" });
  }
  const payload = { ...body };
  delete payload.staffIds;
  delete payload.active;
  const parsed = parseServicePayload(payload, true);
  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.error });
  }

  const serviceId = typeof req.params.serviceId === "string" ? req.params.serviceId : "";
  try {
    const business = await getOwnedBusiness(req.user!.userId);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    const service = await prisma.$transaction(async (tx) => {
      const current = await tx.service.findFirst({
        where: { id: serviceId, businessId: business.id },
        select: { id: true, active: true, staffAssignments: { select: { id: true } } },
      });
      if (!current) return null;

      if (staffIds.length > 0) {
        const validStaff = await tx.businessStaff.count({ where: { businessId: business.id, id: { in: staffIds } } });
        if (validStaff !== staffIds.length) throw new Error("INVALID_STAFF_ASSIGNMENT");
      }

      await tx.staffService.deleteMany({ where: { serviceId: current.id } });
      if (staffIds.length > 0) {
        await tx.staffService.createMany({ data: staffIds.map((staffId) => ({ staffId, serviceId: current.id })) });
      }

      return tx.service.update({
        where: { id: current.id },
        data: {
          ...parsed.data,
          active: staffIds.length > 0 && (current.active || current.staffAssignments.length === 0),
        },
        include: { staffAssignments: { select: { staffId: true } } },
      });
    });

    if (!service) {
      return res.status(404).json({ success: false, message: "Business service not found" });
    }
    return res.status(200).json({
      success: true,
      service: { ...service, assignedStaffIds: service.staffAssignments.map(({ staffId }) => staffId) },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_STAFF_ASSIGNMENT") {
      return res.status(400).json({ success: false, message: "One or more selected staff do not belong to this business" });
    }
    console.error("Business service update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update business service" });
  }
};

export const setBusinessServiceActive = async (req: AuthenticatedRequest, res: Response) => {
  const active = (req.body as { active?: unknown } | null)?.active;
  if (typeof active !== "boolean") {
    return res.status(400).json({ success: false, message: "Active must be a boolean" });
  }

  try {
    const business = await getOwnedBusiness(req.user!.userId);
    if (!business) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }
    const service = await prisma.service.findFirst({
      where: { id: String(req.params.serviceId), businessId: business.id },
      select: { id: true, staffAssignments: { select: { id: true } } },
    });
    if (!service) {
      return res.status(404).json({ success: false, message: "Business service not found" });
    }
    if (active && service.staffAssignments.length === 0) {
      return res.status(409).json({ success: false, message: "Assign at least one staff member before activating this service" });
    }

    const updated = await prisma.service.update({ where: { id: service.id }, data: { active } });
    return res.status(200).json({ success: true, service: updated });
  } catch (error) {
    console.error("Business service activation error:", error);
    return res.status(500).json({ success: false, message: "Unable to change service status" });
  }
};

export const getBusinessProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await prisma.business.findUnique({
      where: { ownerUserId: req.user!.userId },
      select: {
        id: true,
        name: true,
        category: true,
        staffSize: true,
        email: true,
        phone: true,
        address: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }
    return res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error("Business profile fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load business profile" });
  }
};

export const updateBusinessProfile = async (req: AuthenticatedRequest, res: Response) => {
  const allowedFields = new Set(["name", "category", "staffSize", "email", "phone", "address", "description"]);
  const body = req.body as Record<string, unknown>;
  const unsupportedField = Object.keys(body ?? {}).find((field) => !allowedFields.has(field));
  if (!body || typeof body !== "object" || Array.isArray(body) || unsupportedField) {
    return res.status(400).json({
      success: false,
      message: unsupportedField ? `Unsupported profile field: ${unsupportedField}` : "A profile object is required",
    });
  }

  const data: Record<string, string | null> = {};
  for (const field of allowedFields) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    if (value !== null && typeof value !== "string") {
      return res.status(400).json({ success: false, message: `${field} must be a string or null` });
    }
    if (typeof value === "string" && value.trim().length > (field === "description" ? 2000 : 200)) {
      return res.status(400).json({ success: false, message: `${field} is too long` });
    }
    data[field] = typeof value === "string" ? value.trim() || null : null;
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ success: false, message: "At least one profile field must be provided" });
  }
  if (data.name === null) {
    return res.status(400).json({ success: false, message: "Business name cannot be empty" });
  }

  try {
    const result = await prisma.business.updateMany({
      where: { ownerUserId: req.user!.userId },
      data,
    });
    if (result.count === 0) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    const profile = await prisma.business.findUnique({
      where: { ownerUserId: req.user!.userId },
      select: {
        id: true,
        name: true,
        category: true,
        staffSize: true,
        email: true,
        phone: true,
        address: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.status(200).json({ success: true, profile });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return res.status(409).json({ success: false, message: "That business phone number is already in use" });
    }
    console.error("Business profile update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update business profile" });
  }
};

export const getBusinessStaff = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { ownerUserId: req.user!.userId },
      select: { id: true },
    });
    if (!business) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const [staffMembers, invitations, activeSubscription] = await Promise.all([
      prisma.businessStaff.findMany({
        where: { businessId: business.id },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          services: { include: { service: { select: { name: true } } } },
          appointments: {
            where: { scheduledStart: { gte: startOfToday, lt: startOfTomorrow } },
            select: { id: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.staffInvitation.findMany({
        where: { businessId: business.id, acceptedAt: null, expiresAt: { gt: now } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.providerSubscription.findFirst({
        where: { businessId: business.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: { package: true },
      }),
    ]);

    const staff = [
      ...staffMembers.map((member) => ({
        id: member.id,
        name: `${member.user.firstName} ${member.user.lastName ?? ""}`.trim(),
        email: member.user.email,
        phone: member.user.phone,
        role: member.title ?? "Staff",
        assignedServices: member.services.map(({ service }) => service.name),
        appointmentsToday: member.appointments.length,
        status: "Active",
      })),
      ...invitations.map((invitation) => ({
        id: invitation.id,
        name: `${invitation.firstName} ${invitation.lastName ?? ""}`.trim(),
        email: invitation.email,
        phone: invitation.phone,
        role: invitation.title ?? "Staff",
        assignedServices: [],
        appointmentsToday: 0,
        status: "Pending",
        expiresAt: invitation.expiresAt,
      })),
    ];

    return res.status(200).json({
      success: true,
      staff,
      maxStaff: activeSubscription?.maxStaff ?? activeSubscription?.package.maxStaff ?? null,
    });
  } catch (error) {
    console.error("Business staff fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load business staff" });
  }
};

export const inviteBusinessStaff = async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const rawPhone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const serviceIds = body?.serviceIds === undefined ? [] : parseStaffIds(body.serviceIds);

  if (!fullName || fullName.length > 100 || !EMAIL_REGEX.test(email) || !title || title.length > 80 || !serviceIds) {
    return res.status(400).json({ success: false, message: "Enter a valid name, email address, and staff title" });
  }
  const phone = rawPhone ? normalizePhone(rawPhone) : null;
  if (rawPhone && !phone) {
    return res.status(400).json({ success: false, message: "Please enter a valid South African phone number" });
  }

  try {
    const business = await prisma.business.findUnique({
      where: { ownerUserId: req.user!.userId },
      select: { id: true, name: true },
    });
    if (!business) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    const nameParts = fullName.split(/\s+/);
    const token = createStaffInvitationToken();
    const now = new Date();
    const invitation = await prisma.$transaction(async (tx) => {
      const [staffCount, pendingCount, activeSubscription, existingUser, existingInvitation] = await Promise.all([
        tx.businessStaff.count({ where: { businessId: business.id } }),
        tx.staffInvitation.count({
          where: { businessId: business.id, acceptedAt: null, expiresAt: { gt: now } },
        }),
        tx.providerSubscription.findFirst({
          where: { businessId: business.id, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          include: { package: true },
        }),
        tx.user.findFirst({
          where: { OR: phone ? [{ email }, { phone }] : [{ email }] },
          select: { email: true, phone: true },
        }),
        tx.staffInvitation.findFirst({
          where: {
            OR: phone ? [{ email }, { phone }] : [{ email }],
            acceptedAt: null,
            expiresAt: { gt: now },
          },
          select: { email: true, phone: true },
        }),
      ]);

      if (existingUser?.email === email) throw new Error("STAFF_EMAIL_EXISTS");
      if (phone && existingUser?.phone === phone) throw new Error("STAFF_PHONE_EXISTS");
      if (existingInvitation?.email === email) throw new Error("STAFF_INVITATION_EXISTS");
      if (phone && existingInvitation?.phone === phone) throw new Error("STAFF_PHONE_INVITATION_EXISTS");
      if (serviceIds.length > 0) {
        const validServices = await tx.service.count({
          where: { businessId: business.id, id: { in: serviceIds } },
        });
        if (validServices !== serviceIds.length) throw new Error("INVALID_SERVICE_ASSIGNMENT");
      }
      const maxStaff = activeSubscription?.maxStaff ?? activeSubscription?.package.maxStaff ?? null;
      if (maxStaff !== null && staffCount + pendingCount >= maxStaff) {
        throw new Error("STAFF_LIMIT_REACHED");
      }

      return tx.staffInvitation.create({
        data: {
          businessId: business.id,
          email,
          firstName: nameParts[0] ?? fullName,
          lastName: nameParts.slice(1).join(" ") || null,
          phone,
          title,
          serviceIds,
          tokenHash: hashStaffInvitationToken(token),
          expiresAt: new Date(now.getTime() + STAFF_INVITATION_TTL_MS),
        },
      });
    }, { isolationLevel: "Serializable" });

    try {
      await sendStaffInvitationEmail(email, invitation.firstName, business.name, title, token);
    } catch (error) {
      await prisma.staffInvitation.delete({ where: { id: invitation.id } });
      console.error("Staff invitation email failed:", error);
      return res.status(503).json({ success: false, message: "Invitation email could not be sent. Please try again." });
    }

    return res.status(201).json({
      success: true,
      message: "Staff invitation sent",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: `${invitation.firstName} ${invitation.lastName ?? ""}`.trim(),
        role: invitation.title,
        assignedServices: serviceIds.length > 0
          ? (await prisma.service.findMany({
              where: { businessId: business.id, id: { in: serviceIds } },
              select: { name: true },
            })).map((service) => service.name)
          : [],
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STAFF_EMAIL_EXISTS") {
      return res.status(409).json({ success: false, message: "An account already exists for this email address" });
    }
    if (error instanceof Error && error.message === "STAFF_PHONE_EXISTS") {
      return res.status(409).json({ success: false, message: "An account already exists for this phone number" });
    }
    if (error instanceof Error && error.message === "STAFF_INVITATION_EXISTS") {
      return res.status(409).json({ success: false, message: "A pending invitation already exists for this email" });
    }
    if (error instanceof Error && error.message === "STAFF_PHONE_INVITATION_EXISTS") {
      return res.status(409).json({ success: false, message: "A pending invitation already exists for this phone number" });
    }
    if (error instanceof Error && error.message === "STAFF_LIMIT_REACHED") {
      return res.status(409).json({ success: false, message: "Your business has reached its staff limit" });
    }
    if (error instanceof Error && error.message === "INVALID_SERVICE_ASSIGNMENT") {
      return res.status(400).json({ success: false, message: "One or more selected services do not belong to this business" });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") {
      return res.status(409).json({ success: false, message: "Staff seats changed during this request. Please try again." });
    }
    console.error("Business staff invitation error:", error);
    return res.status(500).json({ success: false, message: "Unable to invite this staff member" });
  }
};

export const getBusinessAppointments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const business = await prisma.business.findUnique({
      where: { ownerUserId: req.user!.userId },
      select: { id: true },
    });
    if (!business) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    const appointments = await prisma.appointment.findMany({
      where: { businessId: business.id },
      orderBy: { scheduledStart: "asc" },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        service: { select: { name: true, durationMinutes: true, expectedPrice: true } },
        staff: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });

    return res.status(200).json({
      success: true,
      appointments: appointments.map((appointment) => ({
        id: appointment.id,
        time: appointment.scheduledStart,
        customerName: `${appointment.customer.firstName} ${appointment.customer.lastName ?? ""}`.trim(),
        service: appointment.service.name,
        durationMinutes: appointment.service.durationMinutes,
        price: appointment.service.expectedPrice === null ? null : Number(appointment.service.expectedPrice),
        staffId: appointment.staffId,
        staffName: appointment.staff
          ? `${appointment.staff.user.firstName} ${appointment.staff.user.lastName ?? ""}`.trim()
          : null,
        status: appointment.status,
      })),
    });
  } catch (error) {
    console.error("Business appointments fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load business appointments" });
  }
};

export const updateBusinessAppointmentStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body as { status?: unknown };
  if (status !== "COMPLETED" && status !== "NO_SHOW" && status !== "CANCELLED") {
    return res.status(400).json({ success: false, message: "Invalid appointment status" });
  }

  const appointmentId = typeof req.params.id === "string" ? req.params.id : "";
  if (!appointmentId) {
    return res.status(400).json({ success: false, message: "Invalid appointment ID" });
  }

  try {
    const business = await prisma.business.findUnique({
      where: { ownerUserId: req.user!.userId },
      select: { id: true },
    });
    if (!business) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    const now = new Date();
    if (status === "NO_SHOW") {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          businessId: business.id,
          status: { in: ["CONFIRMED", "RESCHEDULED"] },
        },
        select: { scheduledStart: true },
      });
      if (appointment && appointment.scheduledStart > now) {
        return res.status(400).json({ success: false, message: "No-show can only be recorded after the appointment time" });
      }
    }
    if (status === "CANCELLED") {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          businessId: business.id,
          status: { in: ["CONFIRMED", "RESCHEDULED"] },
        },
        select: { scheduledStart: true },
      });
      if (appointment && appointment.scheduledStart <= now) {
        return res.status(400).json({ success: false, message: "Only future appointments can be cancelled" });
      }
    }

    const updated = await prisma.appointment.updateMany({
      where: {
        id: appointmentId,
        businessId: business.id,
        status: { in: ["CONFIRMED", "RESCHEDULED"] },
      },
      data: { status },
    });
    if (updated.count === 0) {
      return res.status(404).json({ success: false, message: "Upcoming business appointment not found" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Business appointment status update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update appointment status" });
  }
};

export const getBusinessDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const business = await prisma.business.findUnique({
      where: { ownerUserId: req.user.userId },
    });

    if (!business) {
      return res.status(404).json({ success: false, message: "Business profile not found" });
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      todayAppointments,
      todayRemaining,
      staffCount,
      activeServicesCount,
      monthAppointments,
      todayAppointmentsList,
      staffList,
      activeSubscription,
    ] = await Promise.all([
      prisma.appointment.count({
        where: { businessId: business.id, scheduledStart: { gte: startOfToday, lt: startOfTomorrow } },
      }),
      prisma.appointment.count({
        where: {
          businessId: business.id,
          scheduledStart: { gte: now, lt: startOfTomorrow },
          status: "CONFIRMED",
        },
      }),
      prisma.businessStaff.count({ where: { businessId: business.id } }),
      prisma.service.count({ where: { businessId: business.id, active: true } }),
      prisma.appointment.count({
        where: { businessId: business.id, scheduledStart: { gte: startOfMonth, lt: startOfNextMonth } },
      }),
      prisma.appointment.findMany({
        where: { businessId: business.id, scheduledStart: { gte: startOfToday, lt: startOfTomorrow } },
        orderBy: { scheduledStart: "asc" },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
          staff: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      prisma.businessStaff.findMany({
        where: { businessId: business.id },
        include: {
          user: { select: { firstName: true, lastName: true } },
          services: { include: { service: { select: { name: true } } } },
          appointments: {
            where: { scheduledStart: { gte: startOfToday, lt: startOfTomorrow } },
            select: {
              id: true,
              scheduledStart: true,
              status: true,
              service: { select: { durationMinutes: true } },
            },
          },
        },
      }),
      prisma.providerSubscription.findFirst({
        where: { businessId: business.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: { package: true },
      }),
    ]);

    const staff = staffList.map((member) => {
      const isBusyNow = member.appointments.some((appt) => {
        if (appt.status !== "CONFIRMED") return false;
        const start = appt.scheduledStart.getTime();
        const end = start + appt.service.durationMinutes * 60_000;
        return now.getTime() >= start && now.getTime() < end;
      });

      return {
        id: member.id,
        // NOTE: no `title`/`role` column on BusinessStaff yet — using first
        // assigned service as a stand-in. Add a real field if you need this.
        name: `${member.user.firstName} ${member.user.lastName ?? ""}`.trim(),
        role: member.services[0]?.service.name ?? "Staff",
        appointmentsToday: member.appointments.length,
        status: isBusyNow ? "Busy" : "Available",
      };
    });

    return res.status(200).json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        category: business.category,
        staffSize: business.staffSize,
        email: business.email,
        phone: business.phone,
        address: business.address,
      },
      stats: {
        todayAppointments,
        todayRemaining,
        staffCount,
        maxStaff: activeSubscription?.maxStaff ?? activeSubscription?.package.maxStaff ?? null,
        activeServicesCount,
        monthAppointments,
      },
      todayAppointments: todayAppointmentsList.map((a) => ({
        id: a.id,
        time: a.scheduledStart,
        customerName: `${a.customer.firstName} ${a.customer.lastName ?? ""}`.trim(),
        service: a.service.name,
        staffName: a.staff ? `${a.staff.user.firstName} ${a.staff.user.lastName ?? ""}`.trim() : null,
        status: a.status,
      })),
      staff,
      subscription: activeSubscription
        ? {
            tier: activeSubscription.package.tier,
            status: activeSubscription.status,
            paymentStatus: activeSubscription.paymentStatus,
            maxStaff: activeSubscription.maxStaff ?? activeSubscription.package.maxStaff,
            dailyAppointmentLimit:
              activeSubscription.dailyAppointmentLimit ?? activeSubscription.package.dailyAppointmentLimit,
            nextBillingDate: activeSubscription.nextBillingDate,
          }
        : null,
    });
  } catch (error) {
    console.error("Business dashboard error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong while loading the dashboard" });
  }
};
