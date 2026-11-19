# S1 core booking: review and handoff

Base: d0cd9cf72a79cab43881312bb6bbac2e83026531. Includes #70 foundation, #71 slots and #72 booking UI, plus owned appointment details needed for persisted confirmation. This is a reviewable code delivery; no shared Neon migrations have been applied.

## Two entry points, one engine

Public provider pages remain bookable. Customer Find a service links to /dashboard/customer/book/:id and keeps the customer shell. Both use BookingJourney and SlotPicker: Service → Time → Confirm. Business bookings choose assigned staff; sole providers have no staff selector. Being closed now does not prevent booking future hours.

Dates and slots use Africa/Johannesburg (SAST), independent of browser/server timezone. Inline sign-in and the existing registration/verification continuation retain booking intent and notes. Draft ownership and expiry are checked; successful creation clears the draft. A conflict refreshes availability and retains service/notes. Confirmation reloads the saved appointment by ID, including saved duration/price, contact details, notes and an ICS download.

Business and sole-provider service forms can edit cleanup buffer minutes (integer 0–1440). Buffer reserves resource time without extending the customer's displayed service duration.

## Backend contract

The existing provider availability endpoint returns slots with startsAt, endsAt, label and status, staff options, timezone, cutoff and service snapshot inputs. Use BusinessStaff IDs, not User IDs. Omit staff for sole providers. Business staff must be verified, assigned to the service and belong to the business. Missing staff selection returns options without slots.

Only Africa/Johannesburg is supported in this sprint; other configured zones return 422. Dates are strictly validated and limited to the booking window (90 days). Starts are aligned to 15-minute boundaries. Service plus cleanup must fit opening hours. Staff hours intersect business hours; missing staff hours inherit them. Breaks remain unavailable. Past starts are excluded.

Occupancy queries include earlier appointments whose saved end plus cleanup overlaps the requested day, including appointments beginning on a prior day. Existing nullable ends use a legacy service-duration fallback. After all writers migrate and ends become required, review indexing/query performance with production volumes.

POST /api/customer/appointments requires a verified customer and an offset-bearing ISO start; notes are limited to 500 characters. A SERIALIZABLE transaction rechecks current availability, checks customer overlap, saves duration/price/buffer snapshots and appends one CREATED event atomically. Resource conflicts include cleanup; customer conflicts include service duration. Prisma and PostgreSQL serialization/deadlock conflicts become 409. Email is outside the transaction. There are no slot holds or idempotency keys: uncertain network failures direct users to check appointments rather than automatically resubmit.

GET /api/customer/appointments/:id reads one owned appointment directly, with a safe response projection. Missing and another customer's IDs return 404. No management hashes are exposed.

## Concilia and John

Concilia can reuse resolveBookingAvailability inside an authorized transaction, with excludeAppointmentId and saved duration/buffer when implementing a move. These are internal arguments, not public query parameters. Keep appointment ID, service/resource, price and duration snapshots; enforce ownership, cutoff and lifecycle rules before mutation. Cancellation/rescheduling endpoints and controls are not implemented by this package.

John should review event enums, actor identity, transactional invariants and migration drift. If creation is absorbed into the shared lifecycle service, replace the nested CREATED write in booking.service; do not append a duplicate. Review the foundation document and preflight/verify SQL before deploying. S3 token/outbox storage is included, but delivery workers and secure management links remain separate work.

## Validation

Passed: Prisma validation/generation; backend TypeScript; 17 backend unit tests; 3 migration/backfill tests; 10 real PostgreSQL integration checks including synchronized concurrent staff, sole-provider and customer bookings; 6 React interaction tests; frontend production build; changed frontend source/test ESLint; git diff whitespace check.

Full frontend lint still reports 10 errors in unchanged AuthContext, BusinessDashboardContext, business Appointments/Profile and staff Appointments. Production build warns about the existing large bundle. The included Playwright browser suite could not run because Chromium cannot create required sockets in this environment. Browser/mobile visual acceptance remains to be run locally. Browser fixtures are mocked API contract checks, not a live Neon end-to-end test.

## Local checks (Git Bash)

Install backend and frontend dependencies with pnpm install --frozen-lockfile in each directory. In backend run:

```bash
pnpm exec prisma generate
pnpm exec prisma validate
pnpm exec tsc --noEmit
pnpm test
pnpm run test:foundation
S1_TEST_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/postgres pnpm run test:booking:integration
```

The integration runner accepts a local PostgreSQL maintenance URL, creates a uniquely named test database, migrates/seeds it, and drops that test database at completion. The local role needs create-database permission. Do not supply Neon or a shared remote URL. Normal Prisma configuration needs the project's usual local environment settings; no secrets are included.

In frontend run:

```bash
pnpm run build
pnpm run test:booking
pnpm exec playwright install chromium
pnpm run test:booking:ui
```

Deploy only after John's migration/drift review on an isolated development database. New code requires the new schema. Follow the foundation rollout instructions, then coordinate the shared migration and application deployment. After retiring legacy writers, audit/backfill null ends and make scheduledEnd required in a separate migration. Do not reset or db-push the shared database.
