# Phase 2 Overview: Business Staff, Services, Assignments, and Availability

## Summary

Phase 2 adds **13 business API endpoints** under `/api/business`:

- 9 staff/invitation/assignment/availability endpoints
- 4 business service management endpoints

The business management routes require authentication and `BUSINESS_OWNER` role. Staff invitation acceptance is public but requires a high-entropy single-use invitation token. All business-owned records are resolved/scoped through the authenticated owner's business.

Unlike Phase 1, Phase 2 requires a database migration: staff invitations need persistent token state and the `BusinessStaff` model needs an active flag to revoke access while preserving appointment history. The migration has been created and Prisma client generated, but the migration has **not** been applied to the configured database.

## Endpoint Inventory

Routes are registered in [business.routes.ts](backend/src/routes/business.routes.ts) and implemented in [business.controller.ts](backend/src/controllers/business.controller.ts).

### Staff, invitations, assignment, and availability: 9 endpoints

| Method and path | Handler | What it does |
|---|---|---|
| `GET /api/business/staff` | `getBusinessStaff` | Lists staff for the signed-in owner's business with safe user fields and assigned service summaries. |
| `POST /api/business/staff/invitations` | `createBusinessStaffInvitation` | Creates an owner-authorized, 48-hour invitation. Enforces the subscription staff cap including pending invitations, stores only a SHA-256 token hash, and emails the raw token link. |
| `POST /api/business/staff/invitations/accept` | `acceptBusinessStaffInvitation` | Validates and atomically consumes a single-use token, creates a `BUSINESS_STAFF` account with the staff member's own password, and links them to the invited business. Enforces the cap again at acceptance. |
| `GET /api/business/staff/:staffId` | `getBusinessStaffDetails` | Returns safe staff details, assignments, and availability only when the staff member belongs to the owner's business. |
| `PATCH /api/business/staff/:staffId` | `updateBusinessStaff` | Enables/disables a staff record; rejects arbitrary fields and role changes. |
| `DELETE /api/business/staff/:staffId` | `removeBusinessStaff` | Deactivates staff rather than deleting the user, preserving appointment history and preventing orphaned staff accounts. |
| `PUT /api/business/staff/:staffId/services` | `replaceStaffServices` | Atomically replaces service assignments after validating that every service is active and belongs to the same business. Inactive staff cannot receive assignments. |
| `GET /api/business/staff/:staffId/availability` | `getStaffAvailability` | Lists weekly availability for a staff member in the owner's business. |
| `PUT /api/business/staff/:staffId/availability` | `replaceStaffAvailability` | Atomically replaces weekly staff availability using Phase 1 weekday/time/overlap validation. |

### Business service management: 4 endpoints

| Method and path | Handler | What it does |
|---|---|---|
| `GET /api/business/services` | `getBusinessServices` | Lists this business's services with assigned staff IDs. |
| `POST /api/business/services` | `createBusinessService` | Creates a service under the authenticated owner's business using Phase 1 service validation. |
| `PATCH /api/business/services/:serviceId` | `updateBusinessService` | Updates allowlisted service fields only when owned by this business. |
| `DELETE /api/business/services/:serviceId` | `removeBusinessService` | Deactivates services with appointments or assignments; deletes only when no dependent records exist. |

## Invitation and Schema Changes

The staff invitation flow follows the agreed default:

1. An authenticated business owner submits an email address.
2. The backend checks the active subscription staff cap, counting active staff and unexpired pending invitations.
3. The backend generates a cryptographically random token, stores only its SHA-256 hash, and sends the raw token in a 48-hour email link.
4. The invited person submits the token, their own first/last name, a strong password, and terms acceptance.
5. A transaction locks the business row, rechecks staff capacity, claims the invitation once, creates the user and staff relation, and marks the account verified.

Schema changes are in [schema.prisma](backend/prisma/schema.prisma):

- Added `StaffInvitation` with business/inviter relations, email, unique token hash, expiry, acceptance time, and lookup indexes.
- Added `BusinessStaff.isActive` defaulting to `true` for revocable access while retaining historic appointments.

Migration: [migration.sql](backend/prisma/migrations/20261028120000_add_staff_invitations_and_active_state/migration.sql). It is committed as a migration artifact only; it has not been run against the configured database.

Invitation delivery is implemented in [email.service.ts](backend/src/services/email.service.ts), using the existing Resend configuration and a frontend URL at `/staff-invitation/accept?token=...`. The frontend acceptance page/route is not part of this backend work and must be implemented before invited staff can complete onboarding in the UI.

## Validation and Tests

Phase 2 request parsing is in [phase2-validation.ts](backend/src/lib/phase2-validation.ts), with unit tests in [phase2-validation.test.ts](backend/src/lib/phase2-validation.test.ts). Tests cover normalized/valid invitation email, invitation acceptance inputs and password rules, active-state-only updates, and unique service ID lists.

Validation completed:

- `pnpm exec prisma validate` passed.
- `pnpm exec prisma generate` passed.
- `pnpm exec tsc --noEmit` passed.
- `pnpm test` passed for the Phase 2 suite: 4 tests, 0 failures.

The tests are database-independent. They do **not** exercise the Prisma-backed handlers, email delivery, migration execution, staff cap races, or business isolation against a test database. Those require an isolated test database and configured email/test harness before Phase 2 can be considered fully integration-tested.

## Files Changed for Phase 2

1. [backend/prisma/schema.prisma](backend/prisma/schema.prisma) — added staff invitation model/relations and staff active state.
2. [backend/prisma/migrations/20261028120000_add_staff_invitations_and_active_state/migration.sql](backend/prisma/migrations/20261028120000_add_staff_invitations_and_active_state/migration.sql) — creates invitation table/indexes/foreign keys and adds `BusinessStaff.isActive`.
3. [backend/src/controllers/business.controller.ts](backend/src/controllers/business.controller.ts) — added staff, invitation, business service, assignment, and staff availability handlers.
4. [backend/src/routes/business.routes.ts](backend/src/routes/business.routes.ts) — registered the 13 Phase 2 endpoints.
5. [backend/src/services/email.service.ts](backend/src/services/email.service.ts) — added staff invitation email delivery.
6. [backend/src/lib/phase2-validation.ts](backend/src/lib/phase2-validation.ts) — added Phase 2 request validators.
7. [backend/src/lib/phase2-validation.test.ts](backend/src/lib/phase2-validation.test.ts) — added Phase 2 validator tests.
8. [backend/src/generated/prisma/](backend/src/generated/prisma/) — regenerated Prisma client from the updated schema; generated output is normally not hand-edited.

## Remaining Before Phase 2 Sign-Off

- Apply the migration to the intended development/test database using the team's approved migration workflow; do not run against production without review/backup.
- Add database-backed endpoint tests for authorization, business isolation, package-cap concurrency, invitation single-use/expiry, service history, and atomic replacement behavior.
- Add the frontend staff invitation acceptance page/route so emailed invitations can be completed.
- Confirm the deployed email link origin and configure `FRONTEND_ORIGIN` for each environment.
- Confirm `BUSINESS_STAFF` login/session routing and role-protected staff dashboard pages before inviting production users.
