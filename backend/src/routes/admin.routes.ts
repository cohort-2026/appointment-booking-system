import { Router } from "express";
import {
  getAdminDashboard,
  getAdminOutbox,
  runAdminJobs,
} from "../controllers/admin.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router: ReturnType<typeof Router> = Router();

router.use(authenticate, requireRole("ADMIN"));
router.get("/dashboard", getAdminDashboard);
router.get("/outbox", getAdminOutbox);
router.post("/jobs/run", runAdminJobs);

export default router;
