import { getAppointmentEvents, updateAppointmentStatus } from "../controllers/appointment-status.controller.js";
import { Router } from "express";
import {
	createProviderServicePhase1,
	changeProviderSubscription,
	deactivateProviderService,
	getProviderAvailability,
	getProviderAppointments,
	getProviderDashboard,
	getProviderPackages,
	getProviderProfile,
	getProviderServicesPhase1,
	replaceProviderAvailability,
	updateProviderProfilePhase1,
	updateProviderService,
} from "../controllers/provider.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router: ReturnType<typeof Router> = Router();

router.get("/dashboard", authenticate, requireRole("SOLE_PROVIDER"), getProviderDashboard);
router.get("/profile", authenticate, requireRole("SOLE_PROVIDER"), getProviderProfile);
router.patch("/profile", authenticate, requireRole("SOLE_PROVIDER"), updateProviderProfilePhase1);
router.get("/services", authenticate, requireRole("SOLE_PROVIDER"), getProviderServicesPhase1);
router.post("/services", authenticate, requireRole("SOLE_PROVIDER"), createProviderServicePhase1);
router.patch("/services/:serviceId", authenticate, requireRole("SOLE_PROVIDER"), updateProviderService);
router.delete("/services/:serviceId", authenticate, requireRole("SOLE_PROVIDER"), deactivateProviderService);
router.get("/availability", authenticate, requireRole("SOLE_PROVIDER"), getProviderAvailability);
router.put("/availability", authenticate, requireRole("SOLE_PROVIDER"), replaceProviderAvailability);
router.get("/appointments", authenticate, requireRole("SOLE_PROVIDER"), getProviderAppointments);
router.patch("/appointments/:id/status", authenticate, requireRole("SOLE_PROVIDER"), updateAppointmentStatus("PROVIDER"));
router.get("/packages", authenticate, requireRole("SOLE_PROVIDER"), getProviderPackages);
router.patch("/subscription", authenticate, requireRole("SOLE_PROVIDER"), changeProviderSubscription);

router.get("/appointments/:id/events", authenticate, requireRole("SOLE_PROVIDER"), getAppointmentEvents("PROVIDER"));

export default router;