import assert from "node:assert/strict";
import test from "node:test";
import prisma from "../lib/prisma.js";
import { sendTomorrowReminders } from "./appointment-reminders.service.js";

test("concurrent and repeated successful reminder runs do not send twice", async () => {
  const startsAt = new Date("2026-11-26T10:00:00Z");
  const appointment = {
    id: "appointment", status: "CONFIRMED", scheduledStart: startsAt,
    customer: { firstName: "Customer", email: "customer@example.invalid" },
    service: { name: "Service" }, business: null, soleProvider: { displayName: "Provider" },
  };
  let claimed = false;
  let sends = 0;
  const db = {
    appointment: {
      findMany: async () => [appointment],
      updateMany: async () => {
        if (claimed) return { count: 0 };
        claimed = true;
        return { count: 1 };
      },
      findUnique: async () => ({ status: "CONFIRMED", scheduledStart: startsAt }),
    },
  } as unknown as Pick<typeof prisma, "appointment">;
  const send = async () => { sends++; };
  const now = new Date("2026-11-25T10:00:00Z");

  const results = await Promise.all([
    sendTomorrowReminders(now, send, db),
    sendTomorrowReminders(now, send, db),
  ]);
  await sendTomorrowReminders(now, send, db);
  assert.equal(sends, 1);
  assert.equal(results.reduce((total, result) => total + result.accepted, 0), 1);
});