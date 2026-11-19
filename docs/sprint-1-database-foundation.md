# Sprint 1 database foundation — review and handoff

Related: #70 MODEL, schema portion of #76 HISTORY, #87 SCHEMAFIX, #78 MAIL,
#79 TOKEN and #80 JOBS. Base: main at d0cd9cf. This does not close the full
lifecycle, availability, token, mail or management issues.

## Booking entry points (clarified)

Customers can book from BOTH the public provider pages and the customer dashboard.
A booking begun inside `/dashboard/customer/book/:providerId` must stay inside the
customer shell through selection and saved confirmation. Public booking remains
available, with authentication before saving. Both paths use the same booking API,
slot resolver, service/staff identity, snapshot logic and lifecycle rules. There is
one Appointment model, not separate public/dashboard bookings. No routing changes
are included in this database PR.

## Ownership and migration sequence

Mosa owns the schema/migrations and S1/S3; John reviews the event contract and
reconciles Neon drift (#87), then implements #76; Concilia consumes this schema for
#74/#75. Do not generate competing migrations for these fields.

1. `20261118150000_booking_foundation`: provider policy, service cleanup,
   appointment snapshots/management fields, AppointmentEvent and indexes.
2. `20261118151000_notification_foundation`: token hash, reminder marker and
   OutboxMessage. This is storage only; it does not enable new mail/jobs.

The two migrations are ordered separately for review. `prisma migrate deploy`
applies BOTH pending migrations, not just the first. An S2-only deployment would
need a separate reviewed branch/PR; do not hand-delete migration folders.

## Model contract

| Model | Fields | Semantics |
| --- | --- | --- |
| Business / SoleProvider | timeZone; cancellationCutoffHours | Africa/Johannesburg and 24 by default; cutoff is nonnegative; S1 validates supported IANA zone values |
| Service | bufferAfterMinutes | Nonnegative integer; default 0 |
| Appointment | scheduledEnd | Service end only; cleanup is excluded; nullable ONLY for rolling deployment compatibility |
| Appointment | priceAtBooking | Decimal(10,2); null means unknown/unpriced, never silently zero |
| Appointment | bufferAfterMinutesAtBooking | Saved cleanup minutes; do not reread Service on reschedule |
| Appointment | cancelledAt; cancelledBy; cancellationReason | Actual cancellation instant, actor category, optional reason up to 500 characters |
| Appointment | rescheduleCount; customerNotes | Successful moves only; notes max 500 characters (API validation plus VARCHAR constraint) |
| Appointment | manageTokenHash; reminderSentAt | Nullable until S3; SHA-256 hex hash (64 chars); marker alone does not deduplicate concurrent sends |
| AppointmentEvent | type; actor; actorUserId; old/new status/start/end; reason; createdAt | One committed change, immutable history; actorUserId is a User ID, never a BusinessStaff ID |
| OutboxMessage | appointment/event IDs; kind; recipient; deduplicationKey; scheduledStart; delivery/lease fields | One durable delivery intent per recipient and event/schedule revision; no raw token or rendered email body |

Actor categories: CUSTOMER, STAFF, OWNER, PROVIDER, SYSTEM. `cancelledBy` is this
category, NOT a user ID. Exact user attribution lives in AppointmentEvent.
An email-token customer action uses CUSTOMER with null actorUserId: possession of
the link must not be misrepresented as a signed-in user's identity.

Event types: CREATED, CANCELLED, RESCHEDULED, COMPLETED, NO_SHOW. No artificial
historical events are generated. Old cancelled appointments may have null actor,
time and reason; old reschedules have count 0 because the actual count is unknown.
Show historical metadata as unavailable; the counter measures changes recorded
since adoption, not proof that a legacy appointment was never moved.

Deletion: history and outbox restrict appointment deletion. User deletion sets an
event's actorUserId to null, retaining the actor category. Existing appointment
ownership/deletion rules otherwise remain unchanged. API responses must explicitly
select public fields; never serialize token hashes or internal outbox locks.

## Backfill and rolling deployment

Current services are the only source available for historical duration/price.
Backfills are approximations, not recovered booking-time evidence. Prices remain
null where Service.expectedPrice is null. Cleanup starts at 0. The migration aborts
atomically if a referenced service has a non-positive duration; repair the data
intentionally before rerunning. Existing IDs/status/noShow/lateArrival are retained.

The current creation endpoint now always stores snapshots and a CREATED event
using a nested write in the booking transaction. It accepts optional customerNotes.
Customer lists and existing booking overlap checks read the stored service duration,
with an explicit fallback only for legacy writes whose scheduledEnd is null.
The combined S1 delivery implements 15-minute starts, explicit SAST conversion,
cleanup-aware occupancy and complete overlap queries. See s1-core-booking.md.

After all app instances use the new writer, audit remaining null ends. Backfill only
those legacy rows under a controlled write pause, then make scheduledEnd required in
a FOLLOW-UP migration and remove fallbacks. Do not make it required before old
writers are retired. Do not recalculate already saved snapshots during that sweep.

## Concilia's S2 contract

- Keep appointment ID, service, staff/sole-provider resource, price and cleanup snapshot.
- Calculate duration from stored end minus stored start. A move changes both start/end
  by the same displacement; do not use the service's current duration.
- Derive permitted actions/deadline on the server; UI displays the server result.
- Cancel records status, cancelledAt/cancelledBy/reason and one event atomically.
- Reschedule rechecks availability excluding the current appointment, increments
  rescheduleCount, and records old/new instants in one transaction.
- 409: slot conflict; 422: cutoff/lifecycle rejection. Neither changes the booking,
  counter, history or notification intents. Ownership checks precede mutation.
- Customer cutoff applies to the current appointment; John and Mosa should confirm
  the exact equality boundary and permitted target-start policy before #74 integration.
- The combined delivery supplies #71 availability and owned appointment details.
  The remaining #73 paging/profile work is outside this package.

Proposed shared service boundary for John (interface contract, not an implementation):
`transitionAppointment(tx, { appointmentId, action, actor, actorUserId, reason?, startsAt? })`
returns the saved appointment and event ID. The caller controls the transaction.
Resource/ownership checks are server-side. No nested transaction or email network
call. When John adopts creation into that service, REPLACE the nested CREATED event
write in booking.service; do not append a second creation event.

## John review: #76 and #87

- Review enum/actor semantics, event snapshots and deletion behavior before consumers
  depend on them. Lifecycle mutation/event/outbox intent must share one transaction.
- Keep noShow for now. Audit contradictions against status; migrate all writers and
  consumers before removing that legacy boolean in a later reviewed migration.
- `playing_with_neon` had no runtime references and no migration. This PR removes
  ONLY its Prisma client declaration. No DROP is issued; an existing table and data
  remain untouched and unmanaged. Confirm live state before closing #87.
- Existing 20261105130000 migration uses NOT NULL for StaffInvitation.serviceIds;
  Prisma-generated DDL allows nullable arrays. Tests explicitly preserve that
  stricter legacy constraint. This is not permission to rewrite old migrations.
- Verify the actual Neon branch, applied migration checksums and any drift with a
  read-only inspection. Fresh replay does not prove a shared database is in sync.

## S3 delivery contract for follow-up implementation

- Outbox is initially empty. This PR keeps the existing notification sender unchanged.
- Enqueue inside the booking/lifecycle transaction, deliver after commit.
- Event messages use a deterministic key including event ID, message kind and recipient;
  reminders use appointment ID, current scheduled start (canonical UTC) and recipient.
- Unique keys prevent duplicate intent, not exactly-once external delivery. The worker
  must use provider idempotency where available and handle uncertain delivery results.
- Claim using status/availableAt and a lease (lockedAt, lockToken); only the lease holder
  may finalize delivery. Retry FAILED work with backoff; recover abandoned PROCESSING
  leases. Compare schedule revision before sending reminders, mark obsolete work SKIPPED.
- Proposed reschedule policy: clear reminderSentAt on a successful move, deduplicate
  for the new start, and skip old queued reminders. Update reminderSentAt on success
  only if the appointment still has the sent schedule revision. Review this with John.
- Token expiry is the current saved scheduledEnd (no second expiry column to drift).
  #79 must define retry-safe issuance/rotation before the worker is enabled: a hash
  cannot reconstruct a random token. Never put raw management links in this outbox,
  logs, lastError or admin responses. Token generation/delivery is not implemented here.
- Render event notices from saved event old/new instants and appointment price snapshot;
  do not accidentally render an earlier reschedule using a later appointment start.
- A booking or lifecycle change must remain successful even if delivery fails.

## Validation and rollout

Run from backend:

```bash
corepack pnpm@11.22.0 install --frozen-lockfile
corepack pnpm@11.22.0 exec prisma validate
corepack pnpm@11.22.0 exec prisma generate
corepack pnpm@11.22.0 exec tsc --noEmit
corepack pnpm@11.22.0 test
corepack pnpm@11.22.0 run test:foundation
```

The foundation tests use PGlite's in-memory PostgreSQL, never DATABASE_URL. They
replay every existing migration plus both additions; compare schema columns,
indexes and foreign keys to Prisma-generated DDL (with the documented legacy array
constraint); exercise populated backfills, invalid-data rollback, unknown prices,
unmanaged table preservation, field bounds, token uniqueness and outbox deduplication.
These are SQL/storage tests, not an end-to-end proof of #71/#74/#76 or live Neon.

Before shared rollout, John confirms #87 and validates a populated isolated Neon
branch. Use read-only `prisma migrate status`, `prisma db pull --print` and
`prisma/foundation-preflight.sql`; do not reset, db push or accept automatic DROP.
Apply reviewed migrations to the isolated branch with `prisma migrate deploy`,
regenerate the client, and run `prisma/foundation-verify.sql`. Then pause shared
booking writes briefly, apply the same reviewed migrations to the intended shared
branch, deploy the updated backend, and resume booking. Check public AND dashboard
booking entry points, existing appointments and role pages. Concilia regenerates
her client only after her connection points at a database with these migrations.

No shared Neon credentials were used and no shared database was migrated during
preparation. Schema deployment is a separate coordinated action.
