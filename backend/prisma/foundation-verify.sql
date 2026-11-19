-- Read-only post-migration verification. Zero missing/invalid snapshots is expected
-- while writes are paused; null prices may legitimately remain.
BEGIN READ ONLY;
SELECT count(*) AS appointments,
       count(*) FILTER (WHERE "scheduledEnd" IS NULL) AS missing_ends,
       count(*) FILTER (WHERE "scheduledEnd" <= "scheduledStart") AS invalid_ends,
       count(*) FILTER (WHERE "priceAtBooking" IS NULL) AS unknown_prices,
       count(*) FILTER (WHERE "bufferAfterMinutesAtBooking" < 0) AS invalid_buffers
FROM "Appointment";
SELECT "timeZone","cancellationCutoffHours",count(*) FROM "Business" GROUP BY 1,2;
SELECT "timeZone","cancellationCutoffHours",count(*) FROM "SoleProvider" GROUP BY 1,2;
SELECT count(*) AS event_count FROM "AppointmentEvent";
SELECT status,count(*) FROM "OutboxMessage" GROUP BY status;
SELECT to_regclass('public.playing_with_neon') AS unmanaged_experimental_table;
COMMIT;
