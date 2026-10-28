import type { Response } from "express";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";
import { parseAvailabilityRules, parseServicePayload } from "../lib/phase1-validation.js";
import {
  parseServiceIdList,
  parseStaffActiveUpdate,
  parseStaffInvitationAcceptance,
  parseStaffInvitationEmail,
} from "../lib/phase2-validation.js";
import { sendStaffInvitationEmail } from "../services/email.service.js";

const STAFF_INVITATION_TTL_MS = 48 * 60 * 60 * 1000;

async function findOwnedBusiness(userId: string) {
  return prisma.business.findUnique({
    where: { ownerUserId: userId },
    select: { id: true, name: true },
  });
}

async function findOwnedStaff(businessId: string, staffId: string) {
  return prisma.businessStaff.findFirst({
    where: { id: staffId, businessId },
    select: { id: true, businessId: true, userId: true, isActive: true },
  });
}

export const getBusinessStaff = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });

    const staff = await prisma.businessStaff.findMany({
      where: { businessId: business.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        isActive: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, isVerified: true } },
        services: { select: { service: { select: { id: true, name: true, active: true } } } },
      },
    });
    return res.status(200).json({
      success: true,
      staff: staff.map(({ services, ...member }) => ({
        ...member,
        services: services.map(({ service }) => service),
      })),
    });
  } catch (error) {
    console.error("Business staff list error:", error);
    return res.status(500).json({ success: false, message: "Unable to load business staff" });
  }
};

export const createBusinessStaffInvitation = async (req: AuthenticatedRequest, res: Response) => {
  const parsedEmail = parseStaffInvitationEmail(req.body);
  if (!parsedEmail.ok) return res.status(400).json({ success: false, message: parsedEmail.error });
  const email = parsedEmail.data;

  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) return res.status(409).json({ success: false, message: "An account with this email already exists" });

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const invitation = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${business.id} FOR UPDATE`;

      const activeSubscription = await transaction.providerSubscription.findFirst({
        where: { businessId: business.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: { package: { select: { maxStaff: true } } },
      });
      if (!activeSubscription) throw new Error("ACTIVE_BUSINESS_SUBSCRIPTION_REQUIRED");

      const maxStaff = activeSubscription.maxStaff ?? activeSubscription.package.maxStaff;
      const [staffCount, pendingInvitations] = await Promise.all([
        transaction.businessStaff.count({ where: { businessId: business.id, isActive: true } }),
        transaction.staffInvitation.count({ where: { businessId: business.id, acceptedAt: null, expiresAt: { gt: new Date() } } }),
      ]);
      if (maxStaff !== null && staffCount + pendingInvitations >= maxStaff) {
        throw new Error("BUSINESS_STAFF_LIMIT_REACHED");
      }

      const pending = await transaction.staffInvitation.findFirst({
        where: { businessId: business.id, email, acceptedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true },
      });
      if (pending) throw new Error("STAFF_INVITATION_ALREADY_PENDING");

      return transaction.staffInvitation.create({
        data: {
          businessId: business.id,
          invitedByUserId: req.user!.userId,
          email,
          tokenHash,
          expiresAt: new Date(Date.now() + STAFF_INVITATION_TTL_MS),
        },
        select: { id: true, email: true, expiresAt: true, createdAt: true },
      });
    });

    try {
      await sendStaffInvitationEmail(email, business.name, token);
    } catch (error) {
      await prisma.staffInvitation.delete({ where: { id: invitation.id } });
      console.error("Staff invitation email failed:", error);
      return res.status(503).json({ success: false, message: "Unable to send staff invitation email" });
    }

    return res.status(201).json({ success: true, invitation });
  } catch (error) {
    if (error instanceof Error && error.message === "ACTIVE_BUSINESS_SUBSCRIPTION_REQUIRED") {
      return res.status(409).json({ success: false, message: "An active business subscription is required to invite staff" });
    }
    if (error instanceof Error && error.message === "BUSINESS_STAFF_LIMIT_REACHED") {
      return res.status(409).json({ success: false, message: "The business staff limit has been reached" });
    }
    if (error instanceof Error && error.message === "STAFF_INVITATION_ALREADY_PENDING") {
      return res.status(409).json({ success: false, message: "A pending invitation already exists for this email" });
    }
    console.error("Staff invitation creation error:", error);
    return res.status(500).json({ success: false, message: "Unable to create staff invitation" });
  }
};

export const acceptBusinessStaffInvitation = async (req: AuthenticatedRequest, res: Response) => {
  const parsedAcceptance = parseStaffInvitationAcceptance(req.body);
  if (!parsedAcceptance.ok) return res.status(400).json({ success: false, message: parsedAcceptance.error });
  const { token, firstName, lastName, password } = parsedAcceptance.data;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const invitation = await transaction.staffInvitation.findUnique({ where: { tokenHash } });
      if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return null;

      await transaction.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${invitation.businessId} FOR UPDATE`;
      const activeSubscription = await transaction.providerSubscription.findFirst({
        where: { businessId: invitation.businessId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: { package: { select: { maxStaff: true } } },
      });
      const activeStaffCount = await transaction.businessStaff.count({
        where: { businessId: invitation.businessId, isActive: true },
      });
      const maxStaff = activeSubscription?.maxStaff ?? activeSubscription?.package.maxStaff ?? null;
      if (!activeSubscription || (maxStaff !== null && activeStaffCount >= maxStaff)) return null;

      const claimed = await transaction.staffInvitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: new Date() } },
        data: { acceptedAt: new Date() },
      });
      if (claimed.count !== 1) return null;

      const user = await transaction.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName,
          lastName: lastName || null,
          role: "BUSINESS_STAFF",
          isVerified: true,
          termsAcceptedAt: new Date(),
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });
      const staff = await transaction.businessStaff.create({
        data: { businessId: invitation.businessId, userId: user.id },
        select: { id: true, businessId: true, isActive: true },
      });
      return { user, staff };
    });

    if (!result) return res.status(400).json({ success: false, message: "Invitation is invalid, expired, or already used" });
    return res.status(201).json({ success: true, user: result.user, staff: result.staff });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return res.status(409).json({ success: false, message: "An account with this invitation email already exists" });
    }
    console.error("Staff invitation acceptance error:", error);
    return res.status(500).json({ success: false, message: "Unable to accept staff invitation" });
  }
};

export const getBusinessStaffDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });
    const staffId = typeof req.params.staffId === "string" ? req.params.staffId : "";
    const staff = await prisma.businessStaff.findFirst({
      where: { id: staffId, businessId: business.id },
      select: {
        id: true,
        isActive: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, isVerified: true } },
        services: { select: { service: { select: { id: true, name: true, active: true } } } },
        availability: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      },
    });
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });
    const { services, ...staffData } = staff;
    return res.status(200).json({ success: true, staff: { ...staffData, services: services.map(({ service }) => service) } });
  } catch (error) {
    console.error("Business staff detail error:", error);
    return res.status(500).json({ success: false, message: "Unable to load staff member" });
  }
};

export const updateBusinessStaff = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = parseStaffActiveUpdate(req.body);
  if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.error });
  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });
    const staffId = typeof req.params.staffId === "string" ? req.params.staffId : "";
    const updated = await prisma.businessStaff.updateMany({
      where: { id: staffId, businessId: business.id },
      data: { isActive: parsed.data },
    });
    if (updated.count === 0) return res.status(404).json({ success: false, message: "Staff member not found" });
    const staff = await prisma.businessStaff.findUnique({ where: { id: staffId }, select: { id: true, isActive: true, updatedAt: true } });
    return res.status(200).json({ success: true, staff });
  } catch (error) {
    console.error("Business staff update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update staff member" });
  }
};

export const removeBusinessStaff = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });
    const staffId = typeof req.params.staffId === "string" ? req.params.staffId : "";
    const staff = await findOwnedStaff(business.id, staffId);
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });

    await prisma.businessStaff.update({ where: { id: staff.id }, data: { isActive: false } });
    return res.status(200).json({ success: true, action: "deactivated" });
  } catch (error) {
    console.error("Business staff removal error:", error);
    return res.status(500).json({ success: false, message: "Unable to remove staff member" });
  }
};

export const getBusinessServices = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });
    const services = await prisma.service.findMany({
      where: { businessId: business.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: { staffAssignments: { select: { staffId: true } } },
    });
    return res.status(200).json({
      success: true,
      services: services.map(({ staffAssignments, ...service }) => ({
        ...service,
        assignedStaffIds: staffAssignments.map(({ staffId }) => staffId),
      })),
    });
  } catch (error) {
    console.error("Business services list error:", error);
    return res.status(500).json({ success: false, message: "Unable to load business services" });
  }
};

export const createBusinessService = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = parseServicePayload(req.body);
  if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.error });
  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });
    const service = await prisma.service.create({
      data: {
        name: parsed.data.name!,
        durationMinutes: parsed.data.durationMinutes!,
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.expectedPrice !== undefined ? { expectedPrice: parsed.data.expectedPrice } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        businessId: business.id,
      },
    });
    return res.status(201).json({ success: true, service });
  } catch (error) {
    console.error("Business service creation error:", error);
    return res.status(500).json({ success: false, message: "Unable to create business service" });
  }
};

export const updateBusinessService = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = parseServicePayload(req.body, true);
  if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.error });
  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });
    const serviceId = typeof req.params.serviceId === "string" ? req.params.serviceId : "";
    const updated = await prisma.service.updateMany({ where: { id: serviceId, businessId: business.id }, data: parsed.data });
    if (updated.count === 0) return res.status(404).json({ success: false, message: "Service not found" });
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    return res.status(200).json({ success: true, service });
  } catch (error) {
    console.error("Business service update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update business service" });
  }
};

export const removeBusinessService = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });
    const serviceId = typeof req.params.serviceId === "string" ? req.params.serviceId : "";
    const service = await prisma.service.findFirst({
      where: { id: serviceId, businessId: business.id },
      select: { id: true, appointments: { select: { id: true }, take: 1 }, staffAssignments: { select: { id: true }, take: 1 } },
    });
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });
    if (service.appointments.length > 0 || service.staffAssignments.length > 0) {
      const updated = await prisma.service.update({ where: { id: service.id }, data: { active: false } });
      return res.status(200).json({ success: true, action: "deactivated", service: updated });
    }
    await prisma.service.delete({ where: { id: service.id } });
    return res.status(200).json({ success: true, action: "deleted" });
  } catch (error) {
    console.error("Business service removal error:", error);
    return res.status(500).json({ success: false, message: "Unable to remove business service" });
  }
};

export const replaceStaffServices = async (req: AuthenticatedRequest, res: Response) => {
  const parsedServiceIds = parseServiceIdList(req.body?.serviceIds);
  if (!parsedServiceIds.ok) return res.status(400).json({ success: false, message: parsedServiceIds.error });
  const serviceIds = parsedServiceIds.data;
  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });
    const staffId = typeof req.params.staffId === "string" ? req.params.staffId : "";
    const staff = await findOwnedStaff(business.id, staffId);
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, businessId: business.id, active: true },
      select: { id: true },
    });
    if (services.length !== serviceIds.length) {
      return res.status(400).json({ success: false, message: "Every service must be active and owned by this business" });
    }
    if (!staff.isActive && serviceIds.length > 0) {
      return res.status(409).json({ success: false, message: "Services cannot be assigned to inactive staff" });
    }
    const assignments = await prisma.$transaction(async (transaction) => {
      await transaction.staffService.deleteMany({ where: { staffId: staff.id } });
      if (serviceIds.length > 0) {
        await transaction.staffService.createMany({ data: serviceIds.map((serviceId: string) => ({ staffId: staff.id, serviceId })) });
      }
      return transaction.staffService.findMany({
        where: { staffId: staff.id },
        orderBy: { createdAt: "asc" },
        include: { service: { select: { id: true, name: true, active: true } } },
      });
    });
    return res.status(200).json({ success: true, services: assignments.map(({ service }) => service) });
  } catch (error) {
    console.error("Staff service assignment error:", error);
    return res.status(500).json({ success: false, message: "Unable to update staff service assignments" });
  }
};

export const getStaffAvailability = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });
    const staffId = typeof req.params.staffId === "string" ? req.params.staffId : "";
    const staff = await findOwnedStaff(business.id, staffId);
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });
    const availability = await prisma.availability.findMany({
      where: { staffId: staff.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return res.status(200).json({ success: true, availability });
  } catch (error) {
    console.error("Staff availability fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load staff availability" });
  }
};

export const replaceStaffAvailability = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = parseAvailabilityRules(req.body?.availability);
  if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.error });
  try {
    const business = await findOwnedBusiness(req.user!.userId);
    if (!business) return res.status(404).json({ success: false, message: "Business profile not found" });
    const staffId = typeof req.params.staffId === "string" ? req.params.staffId : "";
    const staff = await findOwnedStaff(business.id, staffId);
    if (!staff) return res.status(404).json({ success: false, message: "Staff member not found" });
    const availability = await prisma.$transaction(async (transaction) => {
      await transaction.availability.deleteMany({ where: { staffId: staff.id } });
      if (parsed.data.length > 0) {
        await transaction.availability.createMany({ data: parsed.data.map((rule) => ({ ...rule, staffId: staff.id })) });
      }
      return transaction.availability.findMany({
        where: { staffId: staff.id },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
    });
    return res.status(200).json({ success: true, availability });
  } catch (error) {
    console.error("Staff availability update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update staff availability" });
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