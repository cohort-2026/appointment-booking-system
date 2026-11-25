# Sprint 1 Developer Guide — How to Implement the Feedback

Use this guide after an issue is assigned. It explains the implementation approach, likely files, dependencies, and checks for issues **#66–#88**.

## Before Starting

1. Read the GitHub issue and copy its acceptance criteria into the PR or implementation notes.
2. Pull the latest base branch.
3. Create an issue-specific branch.
4. Backend changes follow: migration/schema → service → controller → route → tests.
5. Frontend changes follow: types → API service → components/pages → loading/empty/error states.
6. Run backend tests plus frontend lint/build before opening a PR.

## Shared Project Files

### Backend

- `backend/prisma/schema.prisma`: Prisma models and enums
- `backend/src/routes/`: route registration
- `backend/src/controllers/`: HTTP parsing and responses
- `backend/src/services/`: business logic
- `backend/src/middleware/`: auth and request protections
- `backend/src/lib/`: shared helpers

Important existing services:

- `backend/src/services/booking.service.ts`
- `backend/src/services/availability.service.ts`
- `backend/src/services/email.service.ts`
- `backend/src/services/appointment-notification.service.ts`
- `backend/src/services/subscription.service.ts`

### Frontend

- `frontend/src/pages/`
- `frontend/src/components/`
- `frontend/src/layouts/`
- `frontend/src/routes/`
- `frontend/src/services/`
- `frontend/src/context/`
- `frontend/src/types/`

---

## #66 — CARDS: Remove Card Collection and Fake Payment Flow

**Area:** Frontend; urgent.

1. Search for card, CVV, checkout, payment, and subscription payment UI.
2. Remove the card form and fake purchase transaction.
3. Remove routes and API calls that imply payment collection.
4. Replace plan selection with a truthful Basic-plan/current-package state.
5. Verify that registration, upgrade, and provider setup have no card fields.

Do not delete database payment history yet unless the issue explicitly requests it.

## #67 — BASIC: Give New Businesses and Providers Basic

**Area:** Backend and frontend; urgent.

1. Ensure the Basic package exists in seed data.
2. In the provider/business creation transaction, create or assign `ProviderSubscription` with the Basic package.
3. Look up the package by its tier enum rather than a hardcoded package ID.
4. Set the first subscription status according to the existing product rules.
5. Remove the frontend requirement to complete fake payment before receiving Basic access.

Test both sole-provider and business registrations.

## #68 — DEBUG: Remove the Auth Debug Endpoint

**Area:** Backend.

1. Search route and controller files for an auth debug route or method.
2. Remove the route, handler, and frontend calls.
3. Remove debug secrets, response fields, and logging that expose credentials or tokens.
4. Add a route test proving the endpoint is unavailable.

## #69 — LIMIT: Rate-Limit Authentication Requests

**Area:** Backend and database.

1. Add middleware to login, register, password reset, OTP send, and OTP verify routes.
2. Combine IP-based limits with an account or identifier-based limit.
3. Return `429` and a retry message when the limit is exceeded.
4. For serverless deployments, in-memory limits may not persist; use a database-backed counter if required.
5. Add frontend handling for the `429` response.

Test repeated requests and verify limits reset after the configured window.

## #70 — MODEL: Add Booking Snapshots and Management Fields

**Area:** Database.

Add fields needed to preserve booking details and manage a booking safely:

- service name snapshot
- price snapshot
- duration snapshot
- provider/business snapshot
- staff snapshot
- timezone
- secure management token hash and expiry
- cancellation and reschedule metadata
- appointment event/history relation
- email outbox relation

Before editing the schema:

1. Complete or coordinate #87.
2. Change `backend/prisma/schema.prisma`.
3. Generate and review a migration.
4. Add only one migration for this feature.
5. Backfill existing appointment snapshots from current relations where safe.
6. Never manually edit an already-applied migration.

## #71 — SLOTS: Generate and Reserve Trustworthy Slots

**Area:** Backend.

Work in `availability.service.ts` and add tests beside it.

1. Read `Availability`, `BusinessAvailability`, services, and existing appointments.
2. Build slot candidates from weekly availability and the selected service duration.
3. Remove past, cancelled, booked, and overlapping time ranges.
4. Apply provider/staff timezone and DST behavior consistently.
5. Reserve the slot during the booking transaction.
6. Prevent concurrent creation for the same staff/provider/time.
7. Return conflict `409` if reservation fails.

The client must never be trusted to decide an appointment is available. Server validation is authoritative.

## #72 — BOOKING: Complete Booking and Saved Confirmation

**Area:** Frontend.

1. Build or repair the flow: service → staff (optional) → date → slot → customer details → confirmation.
2. Fetch slots from the real slot API.
3. Reuse auth state and preserve the booking if login happens mid-flow.
4. Handle slot conflict `409` by refreshing available slots.
5. Submit and show the returned booking snapshot.
6. Make confirmation reloadable using the confirmation ID/code.
7. Show manage/cancel/reschedule information if provided by the API.

Every API failure needs a retry or error state.

## #73 — DETAIL: Customer Details, Paging, and Profile

**Area:** Backend.

1. Add authenticated appointment list endpoint with page/page-size/status parameters.
2. Return stable pagination metadata.
3. Add appointment detail endpoint with ownership validation.
4. Include booking snapshot, appointment status, allowed actions, and history where expected.
5. Add profile read/update endpoints.
6. Never expose another customer's appointments.

Write tests for page boundaries, invalid IDs, and ownership denial.

## #74 — MANAGE: Cancel and Reschedule Atomically

**Area:** Backend.

Work in `booking.service.ts` or an appropriately named management service.

1. Reuse #76 lifecycle rules.
2. Validate the appointment and actor.
3. Validate the new slot with #71 before modifying the appointment.
4. Perform the update and history event in one database transaction.
5. For reschedule, leave the original untouched if any step fails.
6. Release/replace old availability safely.
7. Trigger email/outbox work in the same transaction only for records, not external network delivery.

Test cancellation, no-op reschedule, collision, and unauthorized actors.

## #75 — CUSTOMER: Appointment Details, Cancel, and Reschedule

**Area:** Frontend.

1. Add an appointment list with pagination.
2. Add an appointment detail page or modal.
3. Add cancel reason/action UI.
4. Reuse the real slot picker for reschedule.
5. Render actions only when returned by the API.
6. Refresh detail/list after an action.
7. Show loading, empty, error, success, and 409 states.

Do not calculate whether actions are allowed on the frontend only.

## #76 — HISTORY: Shared Lifecycle Rules and Appointment History

**Area:** Backend and database.

1. Create one shared lifecycle module or service.
2. Define allowed status transitions.
3. Define actor permissions: customer, staff, business, and admin.
4. Make every state change write a history/event row.
5. Add history to detail APIs and the drawer.
6. Keep validation in the backend service rather than scattered controllers.

Suggested event fields: type, actor type/id, metadata, and timestamp.

## #77 — DRAWER: Appointment Actions and History Drawer

**Area:** Frontend.

1. Create a reusable appointment drawer.
2. Show snapshot details and current status.
3. Render allowed actions returned by the API.
4. Render history chronologically.
5. Use it consistently in dashboard business/staff/admin views.

The drawer must use real detail/history API responses and the shared status components from #83.

## #78 — MAIL: Booking Emails, Calendar Attachment and Outbox

**Area:** Backend and database.

1. Add an email outbox table or model.
2. When booking, cancel, or reschedule succeeds, write an outbox record in the database transaction.
3. Send asynchronously or through a job/trigger.
4. Update sent, failed, attempts, and timestamps after delivery.
5. Generate `.ics` data with appointment UID and cancellation/reschedule information.
6. Include the secure management link for cancellation/rescheduling.
7. Never make the database appointment transaction fail because SMTP delivery failed.

Test outbox creation and `.ics` content separately from external email delivery.

## #79 — TOKEN: Secure Logged-Out Management Links

**Area:** Backend and database.

1. Generate at least 32 random bytes for a management token.
2. Store only a SHA-256 or stronger hash in the appointment model.
3. Put the raw token in the emailed URL.
4. Add public detail/cancel/reschedule endpoints for the token.
5. Use constant-time comparison or an equivalent secure lookup.
6. Expire and revoke tokens when appropriate.
7. Rotate the token after successful reschedule if the product requires a new link.
8. Return generic not-found responses for invalid, expired, or already-used tokens.

Never log or expose raw tokens in API responses.

## #80 — JOBS: Daily Reminders and Manual Job Trigger

**Area:** Backend.

1. Implement an idempotent job that finds appointments needing reminders.
2. Create email outbox records rather than calling SMTP directly.
3. Record reminder-sent state or a reminder history event.
4. Protect a cron route with a secret appropriate for the deployment.
5. Configure Vercel Cron or the chosen scheduler in `vercel.json`.
6. Add an admin-only manual trigger endpoint.

The manual trigger should report jobs and message counts processed.

## #81 — MANAGEUI: Logged-Out Manage Booking Page

**Area:** Frontend.

1. Add `/manage/:token` or the agreed public route.
2. Fetch appointment details using the public token API.
3. Render details and allowed cancel/reschedule actions.
4. Reuse the slot picker for reschedule.
5. Show invalid, expired, loading, and success states.
6. Do not request normal customer authentication for this page.

## #82 — SHELL: One Dashboard Shell for Five Roles

**Area:** Frontend.

Use one layout for:

- admin
- business
- staff
- sole provider
- customer

1. Create one dashboard layout with shared topbar/sidebar/outlet.
2. Define role-to-navigation configuration.
3. Centralize route guards by role.
4. Replace per-role duplicate layouts.
5. Confirm direct URL navigation and refresh work for every role.

## #83 — STATES: Shared Status Components and Truthful States

**Area:** Frontend.

Create shared components for:

- loading
- empty
- error with retry
- success
- appointment status badges
- unavailable or conflict states

Replace mock data and fixed placeholder success messages in the touched dashboard pages.

## #84 — ADMINAPI: Real Admin Overview and Message Records

**Area:** Backend.

1. Add an admin overview endpoint.
2. Count real businesses, providers, customers, and appointments.
3. Group appointment counts by status.
4. Include upcoming appointments and failed email counts.
5. Add paged message/outbox endpoint with status filtering.
6. Protect both routes with admin authorization.

Use database aggregates; do not calculate fake values in frontend code.

## #85 — ADMINUI: Real Overview, Sent Messages, and Run Jobs

**Area:** Frontend.

1. Fetch overview cards from #84.
2. Fetch paged sent/failed/pending messages from #84.
3. Replace fake admin placeholders.
4. Add a `Run jobs now` action for #80.
5. Show confirmation, loading, success/error, and returned counts.

Only users with the admin role should see these controls.

## #86 — AUTH: Preserve Sign-In Across Refresh and Booking

**Area:** Backend and frontend.

1. Rehydrate authentication on app startup.
2. Verify or refresh a valid session before clearing auth state.
3. Do not clear the user for network/temporary API errors.
4. Preserve `returnTo` while redirecting to login.
5. Restore that page after successful login.
6. Confirm booking flow state survives login/refresh.

Test login, refresh, direct route, network failure, and expired token separately.

## #87 — SCHEMAFIX: Reconcile the Experimental Database Model

**Area:** Database.

1. Compare `backend/prisma/schema.prisma` with migrations and `database/schema.sql`.
2. Identify drifted columns and duplicate/experimental models.
3. Choose Prisma as the source of truth.
4. Create a reconciliation migration for the real database.
5. Verify a fresh database and a production-shaped database migrate successfully.
6. Remove or stop using stale backup SQL/schema files if they conflict.

Finish this before #70 when possible.

## #88 — VERIFY: Deployed Bug Bash and Friday Demo

**Area:** Integration and QA.

Test in the deployed environment:

- role registration and login
- signup as sole provider and business
- Basic package assignment
- booking with real availability
- email and `.ics` attachment
- logged-in appointment detail
- logged-out manage link
- cancel and reschedule
- refresh during login and booking
- invalid/expired token
- concurrent booking conflict
- admin overview
- sent/failed message data
- manual job trigger
- cron/scheduled reminder behavior

Record issues in GitHub with deployment, role, steps, expected result, actual result, and screenshots.

## Standard PR Checklist

- [ ] Issue number linked
- [ ] Acceptance criteria checked
- [ ] One focused feature/PR
- [ ] Migration reviewed and applied locally
- [ ] Tests pass
- [ ] Frontend lint/build pass
- [ ] Loading/empty/error states handled
- [ ] No secrets or raw tokens committed
- [ ] Deployed environment verified
