   # Phase 1 Overview: Provider and Business Setup APIs

## Summary

Phase 1 added **10 backend endpoints** for profile management, sole-provider services, and sole-provider weekly availability. This count excludes the pre-existing dashboard routes.

- **8 sole-provider endpoints** under `/api/provider`
- **2 business-owner endpoints** under `/api/business`

All endpoints require authentication and the matching role. The controllers resolve records using the authenticated user's ID; clients do not choose the provider or business owner whose data is changed.

No Prisma schema or database migration was needed for Phase 1. The existing schema already contains the provider/business profiles, service fields, `active` state, and weekly availability model.

## Endpoint Inventory

### Sole provider: 8 endpoints

The routes are registered in [provider.routes.ts](backend/src/routes/provider.routes.ts) and implemented in [provider.controller.ts](backend/src/controllers/provider.controller.ts).

| Method and path | Handler | What it does |
|---|---|---|
| `GET /api/provider/profile` | `getProviderProfile` | Resolves the sole-provider profile from the signed-in user and returns editable/public profile fields. Returns `404` if no profile exists. |
| `PATCH /api/provider/profile` | `updateProviderProfile` | Updates allowlisted profile fields (`displayName`, `serviceName`, `category`, `experience`, `bio`, `city`). Rejects unsupported fields and invalid/oversized values. |
| `GET /api/provider/services` | `getProviderServices` | Lists services owned by the signed-in provider, ordered consistently; includes active state for management. |
| `POST /api/provider/services` | `createProviderService` | Creates a service under the signed-in provider. Validates name, duration, optional description, optional informational expected price, and active state. |
| `PATCH /api/provider/services/:serviceId` | `updateProviderService` | Updates allowlisted fields only when the target service belongs to the signed-in provider. Returns `404` for another provider's service. |
| `DELETE /api/provider/services/:serviceId` | `deactivateProviderService` | Removes an owned service. If appointments reference it, marks it inactive to preserve history; otherwise deletes it. |
| `GET /api/provider/availability` | `getProviderAvailability` | Lists the signed-in provider's weekly availability, ordered by weekday and start time. |
| `PUT /api/provider/availability` | `replaceProviderAvailability` | Validates and atomically replaces the provider's weekly availability rules. An empty array clears the rules. |

Provider-only access is enforced with `authenticate` and `requireRole("SOLE_PROVIDER")` in the route file.

### Business owner: 2 endpoints

The routes are registered in [business.routes.ts](backend/src/routes/business.routes.ts) and implemented in [business.controller.ts](backend/src/controllers/business.controller.ts).

| Method and path | Handler | What it does |
|---|---|---|
| `GET /api/business/profile` | `getBusinessProfile` | Resolves and returns the business profile owned by the signed-in user; returns `404` if missing. |
| `PATCH /api/business/profile` | `updateBusinessProfile` | Updates allowlisted business fields (`name`, `category`, `staffSize`, `email`, `phone`, `address`, `description`). Rejects unsupported/invalid fields and returns `409` when the business phone is already in use. |

Business-owner access is enforced with `authenticate` and `requireRole("BUSINESS_OWNER")` in the route file.

## Validation and Tests

Shared Phase 1 payload validation is in [phase1-validation.ts](backend/src/lib/phase1-validation.ts):

- Service names must contain 1–100 characters.
- Service duration must be a whole number from 1 to 1440 minutes.
- Description is optional and limited to 1000 characters.
- Expected price is optional, non-negative, and informational only; it is not used to charge customers.
- Availability day is `0–6`; times use `HH:mm`; end must be after start; overlapping rules on the same day are rejected.
- Availability rules default to active unless explicitly set otherwise.

Tests are in [phase1-validation.test.ts](backend/src/lib/phase1-validation.test.ts) and [phase1-endpoints.test.ts](backend/src/controllers/phase1-endpoints.test.ts). They cover service/availability payload validation and role middleware allow/deny behavior.

Validation run for Phase 1:

- `pnpm exec tsc --noEmit` passed in `backend`.
- `pnpm test` passed: 7 tests, 0 failures.

The tests are database-independent. They do **not** make live requests against Prisma/database-backed handlers, so endpoint behavior against a test database remains a follow-up validation gap.

## Phase 1 Backend Files Changed

1. [backend/src/controllers/provider.controller.ts](backend/src/controllers/provider.controller.ts) — added provider profile, service, and availability handlers; retained the existing provider dashboard handler.
2. [backend/src/controllers/business.controller.ts](backend/src/controllers/business.controller.ts) — added business profile read/update handlers; retained the existing business dashboard handler.
3. [backend/src/routes/provider.routes.ts](backend/src/routes/provider.routes.ts) — registered the eight provider setup endpoints with role middleware.
4. [backend/src/routes/business.routes.ts](backend/src/routes/business.routes.ts) — registered the two business profile endpoints with role middleware.
5. [backend/src/lib/phase1-validation.ts](backend/src/lib/phase1-validation.ts) — added reusable service and weekly-availability validators.
6. [backend/src/lib/phase1-validation.test.ts](backend/src/lib/phase1-validation.test.ts) — added validator unit tests.
7. [backend/src/controllers/phase1-endpoints.test.ts](backend/src/controllers/phase1-endpoints.test.ts) — added role middleware tests for allowed and denied roles.
8. [backend/package.json](backend/package.json) — added the `pnpm test` script for backend TypeScript tests.

## Not Included in Phase 1

- Business staff invitations, staff CRUD, and staff account acceptance.
- Business service CRUD, staff-service assignments, and staff availability.
- Public provider discovery and slot calculation.
- Customer booking creation, cancellation, rescheduling, or appointment lifecycle endpoints.
- Admin APIs or dashboard UI work.
- Schema migrations or database updates.

Phase 2 should begin only after this Phase 1 summary and the existing Phase 1 test/typecheck results are reviewed and accepted by the team.
