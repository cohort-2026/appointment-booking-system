import { authRateLimit } from "../middleware/auth-rate-limit.js";
import { Router } from "express";
import {
  acceptStaffInvitation,
  registerCustomer,
  registerProvider,
  registerBusiness,
  login,
  logout,
  getMe,
  updateMe,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import {
  authenticate,
  requireRole,
} from "../middleware/auth.middleware.js";

const router: ReturnType<typeof Router> = Router();
router.use(authRateLimit);

router.post("/register/customer", registerCustomer);
router.post("/register/provider", registerProvider);
router.post("/register/business", registerBusiness);
router.post("/accept-staff-invitation", acceptStaffInvitation);

router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateMe);

router.get(
  "/customer-test",
  authenticate,
  requireRole("CUSTOMER"),
  (_req, res) => {
    res.json({
      success: true,
      message: "Customer-only route accessed successfully",
    });
  },
);

export default router;