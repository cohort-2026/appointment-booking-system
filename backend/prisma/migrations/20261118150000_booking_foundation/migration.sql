-- Additive expansion. Do not remove noShow or drop unmanaged tables here.
-- Pause booking writes during migration and deploy the updated writer next.
BEGIN;

-- CreateEnum
CREATE TYPE "AppointmentActor" AS ENUM ('CUSTOMER', 'STAFF', 'OWNER', 'PROVIDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AppointmentEventType" AS ENUM ('CREATED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "SoleProvider" ADD COLUMN     "cancellationCutoffHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'Africa/Johannesburg';

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "cancellationCutoffHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'Africa/Johannesburg';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "bufferAfterMinutesAtBooking" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cancellationReason" VARCHAR(500),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" "AppointmentActor",
ADD COLUMN     "customerNotes" VARCHAR(500),
ADD COLUMN     "priceAtBooking" DECIMAL(10,2),
ADD COLUMN     "rescheduleCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduledEnd" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AppointmentEvent" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "type" "AppointmentEventType" NOT NULL,
    "actor" "AppointmentActor" NOT NULL,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldStatus" "AppointmentStatus",
    "newStatus" "AppointmentStatus" NOT NULL,
    "oldScheduledStart" TIMESTAMP(3),
    "newScheduledStart" TIMESTAMP(3) NOT NULL,
    "oldScheduledEnd" TIMESTAMP(3),
    "newScheduledEnd" TIMESTAMP(3),
    "reason" VARCHAR(500),

    CONSTRAINT "AppointmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentEvent_appointmentId_createdAt_id_idx" ON "AppointmentEvent"("appointmentId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AppointmentEvent_actorUserId_idx" ON "AppointmentEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "Appointment_staffId_status_scheduledStart_idx" ON "Appointment"("staffId", "status", "scheduledStart");

-- CreateIndex
CREATE INDEX "Appointment_soleProviderId_status_scheduledStart_idx" ON "Appointment"("soleProviderId", "status", "scheduledStart");

-- CreateIndex
CREATE INDEX "Appointment_customerId_scheduledStart_idx" ON "Appointment"("customerId", "scheduledStart");

-- AddForeignKey
ALTER TABLE "AppointmentEvent" ADD CONSTRAINT "AppointmentEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentEvent" ADD CONSTRAINT "AppointmentEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Historical prices/durations were not stored: current Service values are the
-- only available approximation. Unknown prices remain NULL, never zero.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "Appointment" a JOIN "Service" s ON s.id = a."serviceId"
    WHERE s."durationMinutes" <= 0
  ) THEN
    RAISE EXCEPTION 'Booking foundation: repair non-positive service durations before backfilling appointments';
  END IF;
END $$;

UPDATE "Appointment" a
SET "scheduledEnd" = a."scheduledStart" + s."durationMinutes" * INTERVAL '1 minute',
    "priceAtBooking" = s."expectedPrice",
    "bufferAfterMinutesAtBooking" = s."bufferAfterMinutes"
FROM "Service" s
WHERE a."serviceId" = s.id;

ALTER TABLE "Business" ADD CONSTRAINT "Business_cutoff_nonnegative"
  CHECK ("cancellationCutoffHours" >= 0);
ALTER TABLE "SoleProvider" ADD CONSTRAINT "SoleProvider_cutoff_nonnegative"
  CHECK ("cancellationCutoffHours" >= 0);
ALTER TABLE "Service" ADD CONSTRAINT "Service_buffer_nonnegative"
  CHECK ("bufferAfterMinutes" >= 0);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_snapshot_valid"
  CHECK (("scheduledEnd" IS NULL OR "scheduledEnd" > "scheduledStart")
    AND "bufferAfterMinutesAtBooking" >= 0 AND "rescheduleCount" >= 0);

-- No invented historical actors, cancellations or events. John reconciles
-- noShow/status conflicts separately in #76, and any Neon drift in #87.
COMMIT;
