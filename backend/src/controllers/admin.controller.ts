import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";
import { bookingMonthBounds } from "../lib/time.js";
import { sendTomorrowReminders } from "../services/appointment-reminders.service.js";

const OUTBOX_STATUSES = ["PENDING", "PROCESSING", "SENT", "FAILED", "SKIPPED"] as const;
type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

function positivePage(value: string | undefined, fallback: number, maximum?: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return maximum ? Math.min(parsed, maximum) : parsed;
}

export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  if (!domain) return "hidden";
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

export function createAdminControllers(db: typeof prisma = prisma, runReminders = sendTomorrowReminders) {
const getAdminDashboard = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const { start } = bookingMonthBounds(now);

    const [totalUsers, totalBusinesses, totalProviders, totalBookingsThisMonth] = await Promise.all([
      db.user.count(),
      db.business.count(),
      db.soleProvider.count(),
      db.appointment.count({
        where: { createdAt: { gte: start, lte: now } },
      }),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalBusinesses,
        totalProviders,
        totalBookingsThisMonth,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while loading the admin dashboard",
    });
  }
};

const getAdminOutbox = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = positivePage(typeof req.query.page === "string" ? req.query.page : undefined, 1);
    const pageSize = positivePage(typeof req.query.pageSize === "string" ? req.query.pageSize : undefined, 20, 100);
    const requestedStatus = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;

    if (requestedStatus && !OUTBOX_STATUSES.includes(requestedStatus as OutboxStatus)) {
      return res.status(400).json({ success: false, message: "Invalid outbox status" });
    }

    const status = requestedStatus as OutboxStatus | undefined;
    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      db.outboxMessage.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          kind: true,
          recipient: true,
          status: true,
          attempts: true,
          scheduledStart: true,
          sentAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.outboxMessage.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      items: items.map((item) => ({ ...item, recipient: maskEmail(item.recipient) })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Admin outbox error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while loading notification records",
    });
  }
};

const runAdminJobs = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await runReminders();
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("Admin manual job error:", error);
    return res.status(500).json({
      success: false,
      message: "Manual reminder job failed",
    });
  }
};

return { getAdminDashboard, getAdminOutbox, runAdminJobs };
}
