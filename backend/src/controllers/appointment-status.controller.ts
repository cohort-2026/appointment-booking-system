import type { Response } from "express";
import prisma from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  allowedStaffStatuses, customerAppointmentInclude, saveAppointmentTransition, type StaffStatus,
} from "../services/appointment-lifecycle.service.js";
import { BookingError, isBookingWriteConflict } from "../services/booking.service.js";

type Actor = "OWNER" | "PROVIDER" | "STAFF" | "CUSTOMER";
function scope(actor: Actor, userId: string): Prisma.AppointmentWhereInput {
  switch (actor) {
    case "OWNER": return { business: { ownerUserId: userId } };
    case "PROVIDER": return { soleProvider: { userId } };
    case "STAFF": return { staff: { userId } };
    case "CUSTOMER": return { customerId: userId };
  }
}

function appointmentFailure(res: Response, error: unknown) {
  if (error instanceof BookingError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  if (isBookingWriteConflict(error)) {
    return res.status(409).json({ success: false, message: "The appointment changed. Refresh and try again." });
  }
  console.error("Appointment lifecycle request failed");
  return res.status(500).json({ success: false, message: "Unable to complete the appointment request." });
}

export function getAppointmentEvents(actor: Actor) {
  return async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    if (typeof id !== "string") return res.status(400).json({ success: false, message: "Invalid appointment ID" });
    try {
      const appointment = await prisma.appointment.findFirst({
        where: { id, ...scope(actor, req.user!.userId) },
        select: { status: true, scheduledStart: true, events: customerAppointmentInclude.events },
      });
      if (!appointment) throw new BookingError("Appointment not found.", 404);
      return res.json({
        success: true, events: appointment.events,
        allowedStatuses: actor === "CUSTOMER" ? [] : allowedStaffStatuses(appointment, actor),
      });
    } catch (error) {
      return appointmentFailure(res, error);
    }
  };
}

export function updateAppointmentStatus(actor: Exclude<Actor, "CUSTOMER">) {
  return async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body ?? {};
    if (typeof id !== "string" || (status !== "COMPLETED" && status !== "NO_SHOW" && status !== "CANCELLED") ||
        (reason !== undefined && (typeof reason !== "string" || Array.from(reason).length > 500))) {
      return res.status(400).json({ success: false, message: "Choose a valid status and a reason of at most 500 characters." });
    }
    try {
      const userId = req.user!.userId;
      const saved = await prisma.$transaction(async tx => {
        const appointment = await tx.appointment.findFirst({
          where: { id, ...scope(actor, userId) }, include: customerAppointmentInclude,
        });
        if (!appointment) throw new BookingError("Appointment not found.", 404);
        return saveAppointmentTransition(tx, appointment, {
          type: status as StaffStatus, reason: reason?.trim() || null,
        }, new Date(), { role: actor, userId });
      }, { isolationLevel: "Serializable" });
      return res.json({ success: true, status: saved.appointment.status, message: "Appointment updated." });
    } catch (error) {
      return appointmentFailure(res, error);
    }
  };
}
