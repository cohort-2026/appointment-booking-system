import { Router } from "express";
import {
  getCustomerDashboard,
  getCustomerAppointment,
  getCustomerAppointments,
  createCustomerAppointment,
} from "../controllers/customer.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router: ReturnType<typeof Router> = Router();

router.get("/dashboard", authenticate, requireRole("CUSTOMER"), getCustomerDashboard);
router.get("/appointments", authenticate, requireRole("CUSTOMER"), getCustomerAppointments);
router.get("/appointments/:id", authenticate, requireRole("CUSTOMER"), getCustomerAppointment);
router.post("/appointments", authenticate, requireRole("CUSTOMER"), createCustomerAppointment);

export default router;