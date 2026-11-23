import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import prisma from "./lib/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import businessRoutes from "./routes/business.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import publicProviderRoutes from "./routes/public-provider.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import { appointmentRemindersRoutes } from "./routes/appointment-reminders.routes.js";

const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalDevelopmentOrigin =
        process.env.NODE_ENV !== "production" &&
        /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin ?? "");

      callback(
        null,
        !origin || origin === FRONTEND_ORIGIN || isLocalDevelopmentOrigin,
      );
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/providers", publicProviderRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/jobs", appointmentRemindersRoutes);

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "API and database are connected",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});