import { bookingDate, DAY_MS, parseBookingDate } from "../lib/time.js";
import { MIN_RECOVERY_MINUTES } from "../lib/booking-buffer.js";
import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";
import { parseAvailabilityRules, parseServicePayload } from "../lib/phase1-validation.js";

export const getProviderProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const profile = await prisma.soleProvider.findUnique({
      where: { userId: req.user!.userId },
      select: {
        id: true,
        displayName: true,
        serviceName: true,
        category: true,
        experience: true,
        bio: true,
        city: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    return res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error("Provider profile fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load provider profile" });
  }
};

export const updateProviderProfilePhase1 = async (req: AuthenticatedRequest, res: Response) => {
  const allowedFields = new Set(["displayName", "serviceName", "category", "experience", "bio", "city"]);
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
    if (typeof value === "string" && value.trim().length > (field === "bio" ? 1000 : 150)) {
      return res.status(400).json({ success: false, message: `${field} is too long` });
    }
    data[field] = typeof value === "string" ? value.trim() || null : null;
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ success: false, message: "At least one profile field must be provided" });
  }
  if (data.displayName === null) {
    return res.status(400).json({ success: false, message: "Display name cannot be empty" });
  }

  try {
    const result = await prisma.soleProvider.updateMany({
      where: { userId: req.user!.userId },
      data,
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    const profile = await prisma.soleProvider.findUnique({
      where: { userId: req.user!.userId },
      select: {
        id: true,
        displayName: true,
        serviceName: true,
        category: true,
        experience: true,
        bio: true,
        city: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.status(200).json({ success: true, profile });
  } catch (error) {
    console.error("Provider profile update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update provider profile" });
  }
};

export const getProviderServicesPhase1 = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const provider = await prisma.soleProvider.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    const services = await prisma.service.findMany({
      where: { soleProviderId: provider.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return res.status(200).json({ success: true, services });
  } catch (error) {
    console.error("Provider services fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load services" });
  }
};

export const createProviderServicePhase1 = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = parseServicePayload(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.error });
  }

  try {
    const provider = await prisma.soleProvider.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    const service = await prisma.service.create({
      data: {
        name: parsed.data.name!,
        durationMinutes: parsed.data.durationMinutes!,
          bufferAfterMinutes: parsed.data.bufferAfterMinutes ?? MIN_RECOVERY_MINUTES,
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.expectedPrice !== undefined ? { expectedPrice: parsed.data.expectedPrice } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        soleProviderId: provider.id,
      },
    });
    return res.status(201).json({ success: true, service });
  } catch (error) {
    console.error("Provider service creation error:", error);
    return res.status(500).json({ success: false, message: "Unable to create service" });
  }
};

export const updateProviderService = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = parseServicePayload(req.body, true);
  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.error });
  }
  const serviceId = typeof req.params.serviceId === "string" ? req.params.serviceId : "";
  if (!serviceId) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  try {
    const provider = await prisma.soleProvider.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    const result = await prisma.service.updateMany({
      where: { id: serviceId, soleProviderId: provider.id },
      data: parsed.data,
    });
    if (result.count === 0) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    return res.status(200).json({ success: true, service });
  } catch (error) {
    console.error("Provider service update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update service" });
  }
};

export const deactivateProviderService = async (req: AuthenticatedRequest, res: Response) => {
  const serviceId = typeof req.params.serviceId === "string" ? req.params.serviceId : "";
  if (!serviceId) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  try {
    const provider = await prisma.soleProvider.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, soleProviderId: provider.id },
      select: { id: true, appointments: { select: { id: true }, take: 1 } },
    });
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    if (service.appointments.length > 0) {
      const updated = await prisma.service.update({
        where: { id: service.id },
        data: { active: false },
      });
      return res.status(200).json({ success: true, action: "deactivated", service: updated });
    }

    await prisma.service.delete({ where: { id: service.id } });
    return res.status(200).json({ success: true, action: "deleted" });
  } catch (error) {
    console.error("Provider service removal error:", error);
    return res.status(500).json({ success: false, message: "Unable to remove service" });
  }
};

export const getProviderAvailability = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const provider = await prisma.soleProvider.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    const availability = await prisma.availability.findMany({
      where: { soleProviderId: provider.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return res.status(200).json({ success: true, availability });
  } catch (error) {
    console.error("Provider availability fetch error:", error);
    return res.status(500).json({ success: false, message: "Unable to load availability" });
  }
};

export const replaceProviderAvailability = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = parseAvailabilityRules(req.body?.availability);
  if (!parsed.ok) {
    return res.status(400).json({ success: false, message: parsed.error });
  }

  try {
    const provider = await prisma.soleProvider.findUnique({
      where: { userId: req.user!.userId },
      select: { id: true },
    });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    const availability = await prisma.$transaction(async (transaction) => {
      await transaction.availability.deleteMany({ where: { soleProviderId: provider.id } });
      if (parsed.data.length > 0) {
        await transaction.availability.createMany({
          data: parsed.data.map((rule) => ({ ...rule, soleProviderId: provider.id })),
        });
      }
      return transaction.availability.findMany({
        where: { soleProviderId: provider.id },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
    });

    return res.status(200).json({ success: true, availability });
  } catch (error) {
    console.error("Provider availability update error:", error);
    return res.status(500).json({ success: false, message: "Unable to update availability" });
  }
};

const getSoleProvider = async (userId: string) =>
  prisma.soleProvider.findUnique({ where: { userId }, select: { id: true } });


export const getProviderDashboard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const soleProvider = await prisma.soleProvider.findUnique({
      where: { userId: req.user.userId },
    });

    if (!soleProvider) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    const now = new Date();
    const startOfToday = parseBookingDate(bookingDate(now))!;
    const startOfTomorrow = new Date(+startOfToday + DAY_MS);

    const [
      todayBookings,
      upcomingBookings,
      completedBookings,
      cancelledBookings,
      upcomingAppointments,
      activeSubscription,
    ] = await Promise.all([
      prisma.appointment.count({
        where: {
          soleProviderId: soleProvider.id,
          status: { not: "CANCELLED" }, scheduledStart: { gte: startOfToday, lt: startOfTomorrow },
        },
      }),
      prisma.appointment.count({
        where: { soleProviderId: soleProvider.id, scheduledStart: { gte: now }, status: { in: ["CONFIRMED", "RESCHEDULED"] } },
      }),
      prisma.appointment.count({
        where: { soleProviderId: soleProvider.id, status: "COMPLETED" },
      }),
      prisma.appointment.count({
        where: { soleProviderId: soleProvider.id, status: "CANCELLED" },
      }),
      prisma.appointment.findMany({
        where: { soleProviderId: soleProvider.id, scheduledStart: { gte: now }, status: { in: ["CONFIRMED", "RESCHEDULED"] } },
        orderBy: { scheduledStart: "asc" },
        take: 5,
        include: {
          customer: { select: { firstName: true, lastName: true } },
          service: { select: { name: true } },
        },
      }),
      prisma.providerSubscription.findFirst({
        where: { soleProviderId: soleProvider.id, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: { package: true },
      }),
    ]);

    return res.status(200).json({
      success: true,
      stats: { todayBookings, upcomingBookings, completedBookings, cancelledBookings },
      upcomingAppointments: upcomingAppointments.map((a) => ({
        id: a.id,
        time: a.scheduledStart,
        customerName: `${a.customer.firstName} ${a.customer.lastName ?? ""}`.trim(),
        service: a.service.name,
        status: a.status,
      })),
      subscription: activeSubscription
        ? {
            tier: activeSubscription.package.tier,
            status: activeSubscription.status,
            paymentStatus: activeSubscription.paymentStatus,
            dailyAppointmentLimit:
              activeSubscription.dailyAppointmentLimit ?? activeSubscription.package.dailyAppointmentLimit,
            monthlyPrice: activeSubscription.package.monthlyPrice,
            nextBillingDate: activeSubscription.nextBillingDate,
          }
        : null,
    });
  } catch (error) {
    console.error("Provider dashboard error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong while loading the dashboard" });
  }
};

export const getProviderPackages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const packages = await prisma.package.findMany({
      where: { providerType: "SOLE_PROVIDER" },
      orderBy: { monthlyPrice: "asc" },
      select: {
        tier: true,
        monthlyPrice: true,
        dailyAppointmentLimit: true,
        featureFlags: true,
      },
    });

    return res.status(200).json(packages.map((pkg) => ({
      ...pkg,
      monthlyPrice: Number(pkg.monthlyPrice),
    })));
  } catch (error) {
    console.error("Provider packages fetch failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load provider plans" });
  }
};

export const changeProviderSubscription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const tier: unknown = req.body?.tier;
    if (tier !== "BASIC" && tier !== "GROWTH") {
      return res.status(400).json({ success: false, message: "Select a valid provider plan" });
    }

    // No payment gateway is connected. Reject before any subscription mutation.
    if (tier === "GROWTH") {
      return res.status(403).json({
        success: false,
        code: "PAID_UPGRADES_UNAVAILABLE",
        message: "Paid upgrades are not available yet. Your current plan has not changed.",
      });
    }

    const provider = await getSoleProvider(req.user.userId);
    if (!provider) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    const [selectedPackage, currentSubscription] = await Promise.all([
      prisma.package.findUnique({
        where: { providerType_tier: { providerType: "SOLE_PROVIDER", tier } },
      }),
      prisma.providerSubscription.findFirst({
        where: { soleProviderId: provider.id, status: "ACTIVE" },
        include: { package: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!selectedPackage || Number(selectedPackage.monthlyPrice) !== 0) {
      return res.status(500).json({ success: false, message: "Selected provider plan is not available" });
    }

    if (currentSubscription?.package.tier === tier) {
      return res.status(200).json({
        success: true,
        subscription: {
          tier: selectedPackage.tier,
          status: currentSubscription.status,
          paymentStatus: currentSubscription.paymentStatus,
          dailyAppointmentLimit: currentSubscription.dailyAppointmentLimit,
          monthlyPrice: Number(selectedPackage.monthlyPrice),
          nextBillingDate: currentSubscription.nextBillingDate,
        },
      });
    }

    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    const isUpgrade =
      currentSubscription !== null &&
      Number(selectedPackage.monthlyPrice) > Number(currentSubscription.package.monthlyPrice);

    const subscription = await prisma.$transaction(async (tx) => {
      if (currentSubscription) {
        await tx.providerSubscription.update({
          where: { id: currentSubscription.id },
          data: { status: "CANCELLED" },
        });
      }

      return tx.providerSubscription.create({
        data: {
          soleProviderId: provider.id,
          packageId: selectedPackage.id,
          status: "ACTIVE",
          dailyAppointmentLimit: selectedPackage.dailyAppointmentLimit,
          maxStaff: selectedPackage.maxStaff,
          billingStartDate: now,
          nextBillingDate,
          paymentStatus: "PAID", // Basic is free.
          upgradedAt: isUpgrade ? now : null,
        },
      });
    });

    return res.status(200).json({
      success: true,
      subscription: {
        tier: selectedPackage.tier,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
        dailyAppointmentLimit: subscription.dailyAppointmentLimit,
        monthlyPrice: Number(selectedPackage.monthlyPrice),
        nextBillingDate: subscription.nextBillingDate,
      },
    });
  } catch (error) {
    console.error("Provider subscription change failed:", error);
    return res.status(500).json({ success: false, message: "Unable to change provider plan" });
  }
};



export const deleteProviderService = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const serviceId = req.params.id;
    if (typeof serviceId !== "string") {
      return res.status(400).json({ success: false, message: "Invalid service ID" });
    }

    const provider = await getSoleProvider(req.user.userId);
    if (!provider) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    const result = await prisma.service.deleteMany({
      where: { id: serviceId, soleProviderId: provider.id },
    });
    if (result.count === 0) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Provider service deletion failed:", error);
    return res.status(500).json({ success: false, message: "Unable to delete service" });
  }
};

export const getProviderAppointments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const status = req.query.status;
    const statusFilter =
      status === "UPCOMING"
        ? ["CONFIRMED", "RESCHEDULED"] as const
        : status === "COMPLETED"
          ? ["COMPLETED"] as const
          : status === "CANCELLED"
            ? ["CANCELLED"] as const
            : status === "NO_SHOW" ? ["NO_SHOW"] as const : null;

    if (!statusFilter) {
      return res.status(400).json({ success: false, message: "Invalid appointment status filter" });
    }

    const provider = await getSoleProvider(req.user.userId);
    if (!provider) {
      return res.status(404).json({ success: false, message: "Sole provider profile not found" });
    }

    const appointments = await prisma.appointment.findMany({
      where: { soleProviderId: provider.id, status: { in: [...statusFilter] } },
      orderBy: { scheduledStart: status === "UPCOMING" ? "asc" : "desc" },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        service: { select: { name: true } },
      },
    });

    return res.status(200).json(appointments.map((appointment) => ({
      id: appointment.id,
      customerName: `${appointment.customer.firstName} ${appointment.customer.lastName ?? ""}`.trim(),
      customerEmail: appointment.customer.email,
      serviceName: appointment.service.name,
      date: appointment.scheduledStart,
      status: ["CONFIRMED", "RESCHEDULED"].includes(appointment.status) ? "UPCOMING" : appointment.status,
    })));
  } catch (error) {
    console.error("Provider appointments fetch failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load appointments" });
  }
};
