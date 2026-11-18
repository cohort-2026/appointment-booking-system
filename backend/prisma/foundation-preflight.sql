-- Read-only. Run on the explicitly selected Neon branch before deployment.
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_schema() AS schema_name;
SELECT to_regclass('public.playing_with_neon') AS unmanaged_experimental_table,
       to_regclass('public._prisma_migrations') AS migration_ledger;
SELECT status, "noShow", count(*) FROM "Appointment" GROUP BY status, "noShow" ORDER BY status, "noShow";
SELECT count(*) AS invalid_referenced_durations FROM "Appointment" a
JOIN "Service" s ON s.id=a."serviceId" WHERE s."durationMinutes" <= 0;
SELECT count(*) AS appointments_with_unknown_price FROM "Appointment" a
JOIN "Service" s ON s.id=a."serviceId" WHERE s."expectedPrice" IS NULL;
SELECT table_name,column_name FROM information_schema.columns
WHERE table_schema='public' AND column_name IN
('scheduledEnd','priceAtBooking','bufferAfterMinutes','timeZone','cancellationCutoffHours','manageTokenHash')
ORDER BY table_name,column_name;
COMMIT;
