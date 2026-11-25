import { Router } from "express";
import { createAdminControllers } from "../controllers/admin.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

export function createAdminRoutes(controllers = createAdminControllers()): ReturnType<typeof Router> {
const router: ReturnType<typeof Router> = Router();

router.use(authenticate, requireRole("ADMIN"));
router.get("/dashboard", controllers.getAdminDashboard);
router.get("/outbox", controllers.getAdminOutbox);
router.post("/jobs/run", controllers.runAdminJobs);

return router;
}

const adminRoutes: ReturnType<typeof Router> = createAdminRoutes();
export default adminRoutes;
