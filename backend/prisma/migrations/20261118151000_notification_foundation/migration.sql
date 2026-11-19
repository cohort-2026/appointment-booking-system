BEGIN;

-- CreateEnum
CREATE TYPE "OutboxMessageKind" AS ENUM ('CONFIRMATION', 'BOOKING_ALERT', 'CANCELLATION', 'RESCHEDULE', 'REMINDER');

-- CreateEnum
CREATE TYPE "OutboxMessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "manageTokenHash" VARCHAR(64),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OutboxMessage" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "appointmentEventId" TEXT,
    "kind" "OutboxMessageKind" NOT NULL,
    "recipient" TEXT NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "status" "OutboxMessageStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockToken" TEXT,
    "sentAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "lastError" VARCHAR(1000),
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutboxMessage_deduplicationKey_key" ON "OutboxMessage"("deduplicationKey");

-- CreateIndex
CREATE INDEX "OutboxMessage_status_availableAt_idx" ON "OutboxMessage"("status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxMessage_appointmentId_createdAt_idx" ON "OutboxMessage"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxMessage_appointmentEventId_idx" ON "OutboxMessage"("appointmentEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_manageTokenHash_key" ON "Appointment"("manageTokenHash");

-- AddForeignKey
ALTER TABLE "OutboxMessage" ADD CONSTRAINT "OutboxMessage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxMessage" ADD CONSTRAINT "OutboxMessage_appointmentEventId_fkey" FOREIGN KEY ("appointmentEventId") REFERENCES "AppointmentEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "OutboxMessage" ADD CONSTRAINT "OutboxMessage_attempts_nonnegative"
  CHECK ("attempts" >= 0);
COMMIT;
