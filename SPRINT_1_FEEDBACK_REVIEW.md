# Sprint 1 Feedback and Implementation Review

Review date: 2026-11-25  
Branch reviewed: `100-sprin1-test-and-debug`

## Scope and verdict

Sprint 1 is **not yet complete end to end**. There is substantial booking, lifecycle, authentication and dashboard work, but important security and delivery gaps remain. Prioritize session consistency and rate limiting, then complete logged-out management, durable notification delivery and admin message visibility.

The issue titles in [SPRINT_1_PLAN.md](SPRINT_1_PLAN.md) and the feedback provided in the conversation were used as the backlog. That plan is a proposed interpretation, not the authoritative acceptance criteria for every issue. [docs/feedback/f.md](docs/feedback/f.md) is empty. Statuses below describe observed code, not GitHub issue state or proof of deployment.

## Priority findings

### High: Session identity can be stale across browser tabs

- [frontend/src/context/AuthContext.tsx](frontend/src/context/AuthContext.tsx#L49) keeps the current user in each tab's React state while the session cookie is shared across tabs.
- If customer A has a booking page open, then another tab signs out and signs in as customer B, the first tab may still show A while its booking request sends B's cookie. The backend associates the booking with the authenticated cookie user, not the stale displayed user.
- **Next:** synchronize sign-in/sign-out changes between tabs and revalidate the session identity before a sensitive action. Test the two-account, two-tab case and reject a draft bound to a different customer.

### High: Logout and password reset do not revoke issued tokens

- [backend/src/controllers/auth.controller.ts](backend/src/controllers/auth.controller.ts#L417) clears the browser cookie, while [backend/src/middleware/auth.middleware.ts](backend/src/middleware/auth.middleware.ts#L14) accepts a valid signed token until it expires. Password reset updates the password but does not revoke existing tokens.
- A copied cookie or bearer token remains usable until expiry even after logout or password reset. Cookie deletion protects the ordinary browser session, not a copied token.
- **Next:** add server-side session revocation or a user session/version check, and revoke prior sessions on password reset. Test with an old token after both actions.

### High: Login limits can be bypassed across IP addresses

- [backend/src/middleware/auth-rate-limit.ts](backend/src/middleware/auth-rate-limit.ts#L25) keys its 15-minute limit by route and IP only. Attempts against the same email from different IPs do not share an account budget.
- **Next:** add an account-aware control alongside the IP limit, with privacy-preserving keys and a design that limits account-lockout abuse. Verify distributed attempts and normal recovery.

### High: Concurrent OTP attempts can exceed the account attempt limit

- [backend/src/controllers/auth.controller.ts](backend/src/controllers/auth.controller.ts#L1146) and [backend/src/controllers/auth.controller.ts](backend/src/controllers/auth.controller.ts#L1337) read the attempt count before checking the code and increment it in a separate write. Concurrent requests can pass the same pre-check before increments complete. Per-IP limiting does not eliminate a distributed burst.
- **Next:** atomically claim an attempt against the current unexpired code and account before evaluating it; ensure a successful use consumes the code atomically. Test concurrent verification and reset attempts.

### High: Secure logged-out management is not connected

- [frontend/src/routes/AppRoutes.tsx](frontend/src/routes/AppRoutes.tsx#L66) discards `/manage/:token` and redirects to the authenticated customer dashboard. [backend/prisma/schema.prisma](backend/prisma/schema.prisma#L250) contains a token hash, but the reviewed application has no matching issuance, expiry validation or public management endpoints.
- **Next:** coordinate #79 and #81: issue high-entropy expiring tokens, store hashes, expose scoped and rate-limited management endpoints, and implement the logged-out page. Test expiry, revocation, unauthorized access and token leakage.

### High: Outbox records are not populated by notification delivery

- [backend/src/controllers/customer.controller.ts](backend/src/controllers/customer.controller.ts#L202) triggers notifications after booking, and [backend/src/services/appointment-notification.service.ts](backend/src/services/appointment-notification.service.ts#L79) handles sends directly. The reviewed notification services do not write or process `OutboxMessage` records.
- The admin outbox reader therefore cannot be assumed to represent real SENT or FAILED emails, and failed delivery has no durable outbox retry. The admin UI currently has no message list: [frontend/src/services/admin.ts](frontend/src/services/admin.ts#L1).
- **Next:** coordinate with MAIL: persist delivery intent transactionally, implement safe processing and status updates, then connect a paged admin list. Do not display empty records as proof no emails were sent.

### High: Reminder delivery can be missed

- [backend/src/services/appointment-reminders.service.ts](backend/src/services/appointment-reminders.service.ts#L14) claims before sending and selects at most 20 appointments. [vercel.json](vercel.json#L26) schedules one daily pass. Without additional runs, eligible appointments beyond that batch may never be sent; a process crash after a claim can also lose a reminder.
- The atomic claim helps prevent simultaneous runs from sending the same appointment, but a provider acceptance followed by a network error can still make a retry uncertain.
- **Next:** coordinate with JOBS/MAIL on durable work, batching until eligible work is handled, claim recovery, and delivery idempotency. Validate concurrent runs, failures, retries and batches larger than 20.

## Session and storage details

### What is already in place

- Login sets a JWT in an `HttpOnly`, `SameSite=Lax` cookie with a one-day lifetime; `Secure` is enabled when `NODE_ENV` is production. The reviewed login response serializes user data rather than returning the JWT. See [backend/src/controllers/auth.controller.ts](backend/src/controllers/auth.controller.ts#L378).
- On startup, the frontend calls `/auth/me`; API requests include credentials. No frontend JWT stored in localStorage was found in the reviewed authentication flow. See [frontend/src/context/AuthContext.tsx](frontend/src/context/AuthContext.tsx#L53) and [frontend/src/services/api.ts](frontend/src/services/api.ts#L20).
- Booking return paths are constrained by an allowlist in [frontend/src/lib/bookingFlow.ts](frontend/src/lib/bookingFlow.ts#L6).

### Remaining problems

1. **Transient errors cause apparent sign-out.** Any `/auth/me` failure clears the user, including network and server errors, and protected routes redirect to login. Distinguish invalid sessions from retryable connection errors. [frontend/src/context/AuthContext.tsx](frontend/src/context/AuthContext.tsx#L53)
2. **Expired-session booking loop.** A booking 401 redirects to login without clearing/revalidating the cached user. Login may immediately redirect the still-cached user back to booking. Preserve the draft while invalidating the stale auth state. [frontend/src/components/booking/BookingJourney.tsx](frontend/src/components/booking/BookingJourney.tsx#L105) [frontend/src/pages/public/Login.tsx](frontend/src/pages/public/Login.tsx#L60)
3. **Logout can look successful when it failed.** The frontend ignores non-success HTTP responses and clears local state even on a network failure. It also hardcodes `/api/auth/logout`, unlike the configurable API base. Reloading may restore the still-valid cookie. [frontend/src/context/AuthContext.tsx](frontend/src/context/AuthContext.tsx#L87)
4. **Booking notes persist in browser storage.** The booking draft includes customer notes and customer ID in localStorage. The 24-hour check prevents reuse of an expired selection but does not automatically remove stored data. Minimize retained personal data and remove expired drafts. [frontend/src/lib/bookingDraft.ts](frontend/src/lib/bookingDraft.ts#L49)
5. **Invitation tokens are exposed in URLs.** Staff invitation bearer tokens appear in query strings and can enter browser history or request/referrer logs depending on deployment. Remove the token from the visible URL after reading it, set a restrictive referrer policy and redact logs. [backend/src/services/email.service.ts](backend/src/services/email.service.ts#L142) [frontend/src/pages/public/AcceptStaffInvitation.tsx](frontend/src/pages/public/AcceptStaffInvitation.tsx#L16)
6. **Deployment cookie settings need verification.** The intended same-origin proxy is configured, but a genuinely cross-site `VITE_API_URL` may not send a `SameSite=Lax` cookie on fetch. Check actual production HTTPS, origin, `NODE_ENV`, cookie attributes and CORS. [vercel.json](vercel.json#L17)

## Rate-limiting details

### What is already in place

- Nine public authentication POST paths have route-specific limits in [backend/src/middleware/auth-rate-limit.ts](backend/src/middleware/auth-rate-limit.ts#L13). The limiter is mounted on the auth router in [backend/src/server.ts](backend/src/server.ts#L32).
- PostgreSQL upsert updates the counter atomically, making the per-IP/route budget shareable across instances using the same database. Responses include `429` and `Retry-After`; address or database failures return a generic `503` instead of silently bypassing the limiter.
- OTP verification and password reset have account attempt counters, but the concurrent check defect above needs correction.

### Remaining problems and checks

- **Shared IP effects:** all users behind the same address share each route budget, and fixed windows allow bursts around window boundaries. Tune limits and test shared networks alongside account-aware controls.
- **Cleanup:** expired bucket rows are reset when reused, but the checked-in cleanup script is not scheduled in the visible Vercel cron configuration. Verify an external cleanup schedule or add one. [backend/scripts/cleanup-auth-rate-limits.ts](backend/scripts/cleanup-auth-rate-limits.ts#L3)
- **Proxy handling:** Vercel mode relies on `x-vercel-forwarded-for`; elsewhere the socket peer is used, which may represent a reverse proxy rather than the client. Verify real ingress, trusted headers and behavior for missing addresses. Do not trust arbitrary client-provided forwarding headers.
- **Privacy:** unsalted deterministic route/IP hashes avoid storing raw IPs but are pseudonymous and may be matched against candidate addresses. Consider a keyed hash, retention policy and restricted access.
- **Operational verification:** confirm the migration is applied, all instances use the same database, cleanup runs, and the deployed proxy supplies the expected client address. Source configuration alone does not establish these facts.

## Sprint 1 issue-by-issue status

Status is based on inspected code and issue titles; it is not a substitute for checking each GitHub issue's full acceptance criteria.

| Issue | Status | Evidence and follow-up |
| --- | --- | --- |
| #66 CARDS | Substantially implemented | The inspected registration and package screens say Basic is free and paid upgrades are unavailable. Verify all deployed registration paths. [ProviderRegister.tsx](frontend/src/pages/public/register/ProviderRegister.tsx#L355) |
| #67 BASIC | Partial | Registration assigns a seeded Basic subscription, but the booking path does not appear to enforce its configured daily appointment cap. Confirm the cap is required and enforce it atomically if so. [auth.controller.ts](backend/src/controllers/auth.controller.ts#L725) [booking.service.ts](backend/src/services/booking.service.ts#L110) |
| #68 DEBUG | Implemented in inspected router | The former auth debug endpoint is not registered. Add a regression check if required. [auth.routes.ts](backend/src/routes/auth.routes.ts#L23) |
| #69 LIMIT | Partial | Database-backed per-IP limits exist; distributed login attempts and concurrent OTP checks remain concerns. |
| #70 MODEL | Partial | Price, scheduled end, buffer, cancellation metadata and event relations exist; historical display names are read from current related records rather than booking-time snapshots. Backfilled values may be approximations. [schema.prisma](backend/prisma/schema.prisma#L229) |
| #71 SLOTS | Substantially implemented | Server-side availability and serializable reservation protect booking conflicts; the Basic cap needs a product decision. [booking.service.ts](backend/src/services/booking.service.ts#L110) |
| #72 BOOKING | Substantially implemented | Booking and saved appointment confirmation exist; test real cookies, redirects and conflicts on deployment. [AppointmentDetails.tsx](frontend/src/pages/dashboard/customer/AppointmentDetails.tsx#L16) |
| #73 DETAIL | Partial | Detail ownership and profile routes exist, but customer history is limited to ten past appointments without pagination. [customer.controller.ts](backend/src/controllers/customer.controller.ts#L108) |
| #74 MANAGE | Substantially implemented | Authenticated cancellation/rescheduling uses transactional lifecycle changes; notification delivery occurs afterward and is not durable. [customer-appointment.service.ts](backend/src/services/customer-appointment.service.ts#L69) |
| #75 CUSTOMER | Partial | Customer actions use real endpoints; older history cannot be reached through the truncated list. [AppointmentManagement.tsx](frontend/src/components/booking/AppointmentManagement.tsx#L80) |
| #76 HISTORY | Substantially implemented | Shared lifecycle rules and event records exist. Verify complete role permissions and deployed behavior. [appointment-lifecycle.service.ts](backend/src/services/appointment-lifecycle.service.ts#L52) |
| #77 DRAWER | Partial | A real reusable history/action drawer exists in list views; the provider's default calendar view does not expose it. [AppointmentHistoryDrawer.tsx](frontend/src/components/booking/AppointmentHistoryDrawer.tsx#L14) |
| #78 MAIL | Partial | Email and calendar support exist, but delivery does not use a durable outbox. |
| #79 TOKEN | Not implemented | Token hash schema alone does not provide issuing, expiry, validation or public management. |
| #80 JOBS | Partial | Cron and admin trigger exist, but batch size and crash recovery can miss reminders. |
| #81 MANAGEUI | Not implemented | The manage-token URL redirects to the signed-in customer area. |
| #82 SHELL | Implemented with caveats | Five roles use the shared layout; some business legacy navigation remains hidden by compatibility CSS. Verify responsive behavior. [AppRoutes.tsx](frontend/src/routes/AppRoutes.tsx#L88) [index.css](frontend/src/index.css#L203) |
| #83 STATES | Partial | Shared states exist, but some pages still display empty or fabricated information after failures. [Appointments.tsx](frontend/src/pages/dashboard/customer/Appointments.tsx#L55) [Analytics.tsx](frontend/src/pages/dashboard/business/Analytics.tsx#L36) |
| #84 ADMINAPI | Partial | Protected real overview and paged outbox reader exist, but notification delivery does not populate that outbox. [admin.routes.ts](backend/src/routes/admin.routes.ts#L8) |
| #85 ADMINUI | Partial | Overview and manual job controls exist; the Sent messages list is absent. [Dashboard.tsx](frontend/src/pages/dashboard/admin/Dashboard.tsx#L35) |
| #86 AUTH | Partial | Session rehydration exists; cross-tab identity, expiry, failed logout, transient errors and revocation need work. |
| #87 SCHEMAFIX | Unverified | Migration checks exist, but the standalone SQL and Prisma representations differ; actual deployed migration state was not inspected. [schema.sql](database/schema.sql#L3) [test-foundation.mjs](backend/scripts/test-foundation.mjs#L37) |
| #88 VERIFY | Unverified | No live deployment, production email/cron, bug-bash results or demo were verified in this review. |

## Recommended sequence

1. Fix cross-tab identity, stale-session handling, logout reporting and server-side revocation. Verify password reset invalidates existing sessions.
2. Add account-aware throttling and atomic OTP attempt/consumption controls; verify the proxy, shared database and cleanup in deployment.
3. Complete management tokens and the logged-out customer journey.
4. Coordinate the outbox, reliable reminder jobs and admin message records across MAIL, JOBS, ADMINAPI and ADMINUI.
5. Add customer history pagination and resolve booking snapshot, Basic-cap and truthful page-state gaps against the actual issue criteria.
6. Run deployed integration checks for each role, real browser cookies, concurrent bookings, reminder retries, outbox records and authorization; record the bug bash and demo results.

## Verification limits

The review inspected code and existing tests. Review agents reported 25 backend unit tests, three in-memory migration tests, and 13 mocked booking UI tests passing; focused notification/admin tests were also reported passing. These do not prove real browser cookie behavior, live message delivery or production security. The PostgreSQL integration script creates and drops a test database and was not run. No production secrets, database contents, deployed configuration or live service behavior were inspected. No application code was changed as part of this review.