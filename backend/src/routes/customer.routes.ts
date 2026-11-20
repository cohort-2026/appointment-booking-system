import { Router } from "express";
import {
  getCustomerDashboard,
  getCustomerAppointment,
  getCustomerAppointments,
  createCustomerAppointment,
  getCustomerRescheduleOptions,
  cancelCustomerAppointment,
  rescheduleCustomerAppointment,
} from "../controllers/customer.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router: ReturnType<typeof Router> = Router();

router.get("/dashboard", authenticate, requireRole("CUSTOMER"), getCustomerDashboard);
router.get("/appointments", authenticate, requireRole("CUSTOMER"), getCustomerAppointments);
router.get("/appointments/:id", authenticate, requireRole("CUSTOMER"), getCustomerAppointment);
router.post("/appointments", authenticate, requireRole("CUSTOMER"), createCustomerAppointment);

router.get("/appointments/:id/reschedule-options", authenticate, requireRole("CUSTOMER"), getCustomerRescheduleOptions);
router.patch("/appointments/:id/cancel", authenticate, requireRole("CUSTOMER"), cancelCustomerAppointment);
router.patch("/appointments/:id/reschedule", authenticate, requireRole("CUSTOMER"), rescheduleCustomerAppointment);

export default router;