import { getAppointmentEvents, updateAppointmentStatus } from "../controllers/appointment-status.controller.js";
import { Router } from "express";
import {
	getBusinessDashboard,
	getBusinessAppointments,
	getBusinessAvailability,
	getBusinessServices,
	getBusinessStaff,
	getBusinessProfile,
	inviteBusinessStaff,
	updateBusinessProfile,
	replaceBusinessAvailability,
	createBusinessService,
	setBusinessServiceActive,
	updateBusinessService,
} from "../controllers/business.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router: ReturnType<typeof Router> = Router();

router.get("/dashboard", authenticate, requireRole("BUSINESS_OWNER"), getBusinessDashboard);
router.get("/appointments", authenticate, requireRole("BUSINESS_OWNER"), getBusinessAppointments);
router.patch("/appointments/:id/status", authenticate, requireRole("BUSINESS_OWNER"), updateAppointmentStatus("OWNER"));
router.get("/availability", authenticate, requireRole("BUSINESS_OWNER"), getBusinessAvailability);
router.put("/availability", authenticate, requireRole("BUSINESS_OWNER"), replaceBusinessAvailability);
router.get("/services", authenticate, requireRole("BUSINESS_OWNER"), getBusinessServices);
router.post("/services", authenticate, requireRole("BUSINESS_OWNER"), createBusinessService);
router.put("/services/:serviceId", authenticate, requireRole("BUSINESS_OWNER"), updateBusinessService);
router.patch("/services/:serviceId/toggle", authenticate, requireRole("BUSINESS_OWNER"), setBusinessServiceActive);
router.get("/staff", authenticate, requireRole("BUSINESS_OWNER"), getBusinessStaff);
router.post("/staff/invitations", authenticate, requireRole("BUSINESS_OWNER"), inviteBusinessStaff);
router.get("/profile", authenticate, requireRole("BUSINESS_OWNER"), getBusinessProfile);
router.patch("/profile", authenticate, requireRole("BUSINESS_OWNER"), updateBusinessProfile);

router.get("/appointments/:id/events", authenticate, requireRole("BUSINESS_OWNER"), getAppointmentEvents("OWNER"));

export default router;