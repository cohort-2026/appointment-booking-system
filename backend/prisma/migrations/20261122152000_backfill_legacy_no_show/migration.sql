-- Keep the legacy column through deployment so previous binaries can still use it.
UPDATE "Appointment"
SET status = 'NO_SHOW'
WHERE "noShow" AND status IN ('CONFIRMED', 'RESCHEDULED');
