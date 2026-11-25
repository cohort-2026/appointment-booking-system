import { getAppointmentEvents, updateAppointmentStatus } from "../controllers/appointment-status.controller.js";
import { Router } from "express";
import {
  getStaffAppointments,
  getStaffAvailability,
  getStaffDashboard,
  getStaffProfile,
  replaceStaffAvailability,
  updateStaffProfile,
} from "../controllers/staff.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router: ReturnType<typeof Router> = Router();
const staffOnly = [authenticate, requireRole("BUSINESS_STAFF")];

router.get("/dashboard", ...staffOnly, getStaffDashboard);
router.get("/appointments", ...staffOnly, getStaffAppointments);
router.patch("/appointments/:id/status", ...staffOnly, updateAppointmentStatus("STAFF"));
router.get("/availability", ...staffOnly, getStaffAvailability);
router.put("/availability", ...staffOnly, replaceStaffAvailability);
router.get("/profile", ...staffOnly, getStaffProfile);
router.patch("/profile", ...staffOnly, updateStaffProfile);

router.get("/appointments/:id/events", ...staffOnly, getAppointmentEvents("STAFF"));

export default router;