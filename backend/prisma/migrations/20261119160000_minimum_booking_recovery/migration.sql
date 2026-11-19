BEGIN;

UPDATE "Service"
SET "bufferAfterMinutes" = 15
WHERE "bufferAfterMinutes" < 15;

ALTER TABLE "Service"
  ALTER COLUMN "bufferAfterMinutes" SET DEFAULT 15,
  ADD CONSTRAINT "Service_minimum_recovery_minutes" CHECK ("bufferAfterMinutes" >= 15);

-- Preserve historical snapshots. Availability applies the minimum to legacy bookings.
ALTER TABLE "Appointment" ALTER COLUMN "bufferAfterMinutesAtBooking" SET DEFAULT 15;

COMMIT;
