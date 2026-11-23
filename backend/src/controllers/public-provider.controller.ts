import { bookingMinute, bookingWeekday } from "../lib/time.js";
import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { formatPublicHours, type AvailabilityWindow } from "../lib/public-hours.js";
import { capitalizeBusinessName } from "../lib/business-name.js";
import { BookingError, resolveBookingAvailability } from "../services/booking.service.js";

function isCurrentlyOpen(windows: AvailabilityWindow[], now = new Date()): boolean {
  const minute = bookingMinute(now);
  return windows.some((window) => {
    if (!window.active || window.dayOfWeek !== bookingWeekday(now)) return false;
    const startParts = window.startTime.split(":").map(Number);
    const endParts = window.endTime.split(":").map(Number);
    const startHour = startParts[0] ?? Number.NaN;
    const startMinute = startParts[1] ?? Number.NaN;
    const endHour = endParts[0] ?? Number.NaN;
    const endMinute = endParts[1] ?? Number.NaN;
    if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return false;
    return minute >= startHour * 60 + startMinute && minute < endHour * 60 + endMinute;
  });
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function normalizeSoleProvider(provider: {
  id: string;
  displayName: string;
  category: string | null;
  bio: string | null;
  city: string | null;
  availability: AvailabilityWindow[];
  services: Array<{ id: string; name: string; description: string | null; durationMinutes: number; expectedPrice: unknown }>;
}) {
  const name = provider.displayName;
  return {
    id: `sole:${provider.id}`,
    kind: "SOLE_PROVIDER" as const,
    name,
    category: provider.category ?? "Service provider",
    description: provider.bio ?? "",
    city: provider.city,
    hours: formatPublicHours(provider.availability),
    initials: initials(name),
    status: isCurrentlyOpen(provider.availability) ? "Open" as const : "Closed" as const,
    services: provider.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description ?? "",
      duration: service.durationMinutes,
      price: service.expectedPrice === null ? null : Number(service.expectedPrice),
    })),
  };
}

function normalizeBusiness(business: {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  address: string | null;
  availability: AvailabilityWindow[];
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    expectedPrice: unknown;
    active: boolean;
    staffAssignments: Array<{ staff: { user: { isVerified: boolean } } }>;
  }>;
}) {
  const name = capitalizeBusinessName(business.name);
  const services = business.services.map((service) => {
    const assigned = service.staffAssignments.some((assignment) => assignment.staff.user.isVerified);
    return {
      id: service.id,
      name: service.name,
      description: service.description ?? "",
      duration: service.durationMinutes,
      price: service.expectedPrice === null ? null : Number(service.expectedPrice),
      assigned,
      bookable: service.active && assigned,
    };
  });
  return {
    id: `business:${business.id}`,
    kind: "BUSINESS" as const,
    name,
    category: business.category ?? "Business",
    description: business.description ?? "",
    city: business.address,
    hours: formatPublicHours(business.availability),
    initials: initials(name),
    status: isCurrentlyOpen(business.availability) ? "Open" as const : "Closed" as const,
    services,
  };
}

const publicBusinessInclude = {
  availability: { select: { dayOfWeek: true, startTime: true, endTime: true, active: true } },
  services: {
    orderBy: { createdAt: "asc" },
    include: {
      staffAssignments: {
        include: {
          staff: {
            select: {
              user: { select: { isVerified: true } },
            },
          },
        },
      },
    },
  },
} as const;

export const getPublicProviders = async (_req: Request, res: Response) => {
  try {
    const [soleProviders, businesses] = await Promise.all([
      prisma.soleProvider.findMany({
        where: {
          user: { isVerified: true },
          services: { some: { active: true } },
        },
        select: {
          id: true,
          displayName: true,
          category: true,
          bio: true,
          city: true,
          availability: { select: { dayOfWeek: true, startTime: true, endTime: true, active: true } },
          services: {
            where: { active: true },
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, description: true, durationMinutes: true, expectedPrice: true },
          },
        },
        orderBy: { displayName: "asc" },
      }),
      prisma.business.findMany({
        where: {
          owner: { isVerified: true },
        },
        include: publicBusinessInclude,
        orderBy: { name: "asc" },
      }),
    ]);

    const providers = [
      ...soleProviders.map(normalizeSoleProvider),
      ...businesses.map(normalizeBusiness),
    ].sort((left, right) => left.name.localeCompare(right.name));

    return res.status(200).json({ success: true, providers });
  } catch (error) {
    console.error("Public provider list error:", error);
    return res.status(500).json({ success: false, message: "Unable to load providers" });
  }
};

export const getPublicProvider = async (req: Request, res: Response) => {
  const providerId = typeof req.params.id === "string" ? req.params.id : "";
  const separator = providerId.indexOf(":");
  const kind = providerId.slice(0, separator);
  const id = providerId.slice(separator + 1);
  if (!id || (kind !== "sole" && kind !== "business")) {
    return res.status(404).json({ success: false, message: "Provider not found" });
  }

  try {
    if (kind === "sole") {
      const provider = await prisma.soleProvider.findFirst({
        where: { id, user: { isVerified: true }, services: { some: { active: true } } },
        select: {
          id: true,
          displayName: true,
          category: true,
          bio: true,
          city: true,
          availability: { select: { dayOfWeek: true, startTime: true, endTime: true, active: true } },
          services: {
            where: { active: true },
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, description: true, durationMinutes: true, expectedPrice: true },
          },
        },
      });
      if (!provider) return res.status(404).json({ success: false, message: "Provider not found" });
      return res.status(200).json({ success: true, provider: normalizeSoleProvider(provider) });
    }

    const business = await prisma.business.findFirst({
      where: {
        id,
        owner: { isVerified: true },
      },
      include: publicBusinessInclude,
    });
    if (!business) return res.status(404).json({ success: false, message: "Provider not found" });
    return res.status(200).json({ success: true, provider: normalizeBusiness(business) });
  } catch (error) {
    console.error("Public provider detail error:", error);
    return res.status(500).json({ success: false, message: "Unable to load provider" });
  }
};

export const getPublicProviderAvailability = async (req: Request, res: Response) => {
  const providerId = typeof req.params.id === "string" ? req.params.id : "";
  const separator = providerId.indexOf(":");
  const kind = providerId.slice(0, separator);
  const id = providerId.slice(separator + 1);
  const serviceId = typeof req.query.serviceId === "string" ? req.query.serviceId : "";
  const date = typeof req.query.date === "string" ? req.query.date : "";
  const staffId = typeof req.query.staffId === "string" ? req.query.staffId : undefined;

  if (!id || (kind !== "sole" && kind !== "business") || !serviceId || !date) {
    return res.status(400).json({ success: false, message: "Provider, service, and date are required" });
  }

  try {
    const availability = await resolveBookingAvailability(prisma, {
      providerKind: kind,
      providerId: id,
      serviceId,
      date,
      ...(staffId ? { staffId } : {}),
    });
    return res.status(200).json({ success: true, ...availability });
  } catch (error) {
    if (error instanceof BookingError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error("Public provider availability error:", error);
    return res.status(500).json({ success: false, message: "Unable to load appointment availability" });
  }
};