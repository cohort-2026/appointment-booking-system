import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { sendTomorrowReminders } from "../services/appointment-reminders.service.js";

export const appointmentRemindersRoutes: ReturnType<typeof Router> = Router();

/** Only Vercel's cron (or an authorized manual invocation) may trigger reminders. */
appointmentRemindersRoutes.get("/daily", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(req.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  try {
    return res.json({ success: true, ...await sendTomorrowReminders() });
  } catch {
    console.error("Daily appointment reminders failed");
    return res.status(500).json({ success: false, message: "Reminder job failed" });
  }
});
