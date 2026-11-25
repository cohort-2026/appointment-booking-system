import assert from "node:assert/strict";
import test from "node:test";
import { notifyAppointmentCreated } from "./appointment-notification.service.js";
import {
  buildAppointmentConfirmationEmail, type AppointmentConfirmationInput, type sendAppointmentScheduleAlert,
} from "./email.service.js";

test("confirmation and provider alerts keep the full appointment reference out of outgoing email", async () => {
  const id = "b7011346-b5f0-45d3-8437-3253aa4b18bf";
  const startsAt = new Date("2026-11-25T10:15:00Z");
  const confirmations: AppointmentConfirmationInput[] = [];
  const alerts: Parameters<typeof sendAppointmentScheduleAlert>[0][] = [];

  await notifyAppointmentCreated({
    id,
    status: "CONFIRMED",
    scheduledStart: startsAt,
    scheduledEnd: new Date("2026-11-25T11:00:00Z"),
    service: { name: "Consultation", durationMinutes: 45 },
    customer: { firstName: "Customer", email: "customer@example.invalid" },
    business: { name: "Test Studio", owner: { email: "owner@example.invalid" } },
    staff: { user: { firstName: "Staff", lastName: null, email: "staff@example.invalid" } },
    soleProvider: null,
  }, async message => { confirmations.push(message); },
  "https://example.invalid", async message => { alerts.push(message); });

  assert.equal(confirmations.length, 1);
  const confirmation = confirmations[0]!;
  assert.equal(confirmation.to, "customer@example.invalid");
  assert.equal(confirmation.appointmentUrl, "https://example.invalid/dashboard/customer/appointments");
  const content = buildAppointmentConfirmationEmail(confirmation);
  for (const body of [content.text, content.html]) {
    assert.ok(!body.includes(id));
    assert.match(body, /Open My Appointments/);
    assert.match(body, /Consultation/);
  }
  assert.deepEqual(alerts.map(alert => alert.to).sort(), ["owner@example.invalid", "staff@example.invalid"]);
  assert.ok(!JSON.stringify(alerts).includes(id));
});
