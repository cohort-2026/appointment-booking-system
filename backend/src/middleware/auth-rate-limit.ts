import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type { Request, RequestHandler } from "express";
import prisma from "../lib/prisma.js";

export function clientAddress(req: Pick<Request, "get" | "socket">, vercel = process.env.VERCEL === "1"): string {
  // Trust the platform-overwritten header only on Vercel, never a client header locally.
  const address = vercel ? req.get("x-vercel-forwarded-for") : req.socket.remoteAddress;
  if (!address || !isIP(address.trim())) throw new Error("Unable to identify request origin");
  return address.trim();
}

const limits = new Map([
  ["/login", 30],
  ["/register/customer", 10],
  ["/register/provider", 10],
  ["/register/business", 10],
  ["/forgot-password", 5],
  ["/accept-staff-invitation", 10],
  ["/verify-otp", 15],
  ["/resend-otp", 5],
  ["/reset-password", 10],
]);

export const authRateLimit: RequestHandler = async (req, res, next) => {
  const path = req.path.toLowerCase().replace(/\/+$/, "");
  const limit = limits.get(path);
  if (req.method !== "POST" || limit === undefined) {
    next();
    return;
  }
  try {
    const key = createHash("sha256").update(`${path}:${clientAddress(req)}`).digest("hex");
    const rows = await prisma.$queryRaw<Array<{ count: number; retryAfter: number }>>`
      INSERT INTO "AuthRateLimit" ("key", "count", "expiresAt")
      VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW() THEN 1 ELSE LEAST("AuthRateLimit"."count" + 1, ${limit + 1}) END,
        "expiresAt" = CASE WHEN "AuthRateLimit"."expiresAt" <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE "AuthRateLimit"."expiresAt" END
      RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("expiresAt" - NOW()))))::int AS "retryAfter"
    `;
    const row = rows[0];
    if (!row) throw new Error("No rate limit result");
    if (row.count > limit) {
      res.setHeader("Retry-After", String(row.retryAfter));
      res.status(429).json({ success: false, message: "Too many attempts. Please try again later." });
      return;
    }
    next();
  } catch {
    res.status(503).json({ success: false, message: "Authentication is temporarily unavailable. Please try again later." });
  }
};
