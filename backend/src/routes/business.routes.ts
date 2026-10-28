import { Router } from "express";
import {
	acceptBusinessStaffInvitation,
	createBusinessService,
	createBusinessStaffInvitation,
	getBusinessServices,
	getBusinessDashboard,
	getBusinessProfile,
	getBusinessStaff,
	getBusinessStaffDetails,
	getStaffAvailability,
	removeBusinessService,
	removeBusinessStaff,
	replaceStaffAvailability,
	replaceStaffServices,
	updateBusinessService,
	updateBusinessProfile,
	updateBusinessStaff,
} from "../controllers/business.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router: ReturnType<typeof Router> = Router();

router.get("/dashboard", authenticate, requireRole("BUSINESS_OWNER"), getBusinessDashboard);
router.get("/profile", authenticate, requireRole("BUSINESS_OWNER"), getBusinessProfile);
router.patch("/profile", authenticate, requireRole("BUSINESS_OWNER"), updateBusinessProfile);
router.get("/staff", authenticate, requireRole("BUSINESS_OWNER"), getBusinessStaff);
router.post("/staff/invitations", authenticate, requireRole("BUSINESS_OWNER"), createBusinessStaffInvitation);
router.post("/staff/invitations/accept", acceptBusinessStaffInvitation);
router.get("/staff/:staffId", authenticate, requireRole("BUSINESS_OWNER"), getBusinessStaffDetails);
router.patch("/staff/:staffId", authenticate, requireRole("BUSINESS_OWNER"), updateBusinessStaff);
router.delete("/staff/:staffId", authenticate, requireRole("BUSINESS_OWNER"), removeBusinessStaff);
router.put("/staff/:staffId/services", authenticate, requireRole("BUSINESS_OWNER"), replaceStaffServices);
router.get("/staff/:staffId/availability", authenticate, requireRole("BUSINESS_OWNER"), getStaffAvailability);
router.put("/staff/:staffId/availability", authenticate, requireRole("BUSINESS_OWNER"), replaceStaffAvailability);
router.get("/services", authenticate, requireRole("BUSINESS_OWNER"), getBusinessServices);
router.post("/services", authenticate, requireRole("BUSINESS_OWNER"), createBusinessService);
router.patch("/services/:serviceId", authenticate, requireRole("BUSINESS_OWNER"), updateBusinessService);
router.delete("/services/:serviceId", authenticate, requireRole("BUSINESS_OWNER"), removeBusinessService);

export default router;