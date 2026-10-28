# Remaining Phase Issues by Milestone

## Purpose

Create one GitHub issue for each remaining milestone/work phase below. The endpoint and frontend work that was previously described as separate issues is now a checklist inside its phase's single issue. Do not create individual GitHub issues for those checklist items unless the team later decides to split the scope.

Phase 1 is complete. Backend phases must be delivered sequentially: complete and test Phase 2 before Phase 3, then complete Phase 3 before Phase 4. Phase 4 spans M6 and M8 because the supplied GitHub milestones divide customer dashboard work from appointment management. M7 admin work is a separate workstream; M9 and M10 are integration and release phases.

The milestone details and due dates below follow the information supplied by the team. M4–M8 due dates have passed as of October 28, 2026; confirm whether to retain those milestones or move the issues. No GitHub issues have been created by this document.

## Issue Count and Milestones

| Draft issue | Milestone | Work |
|---|---|---|
| M4 issue | [M4 - Service & Availability Management](https://github.com/cohort-2026/appointment-booking-system/milestone/4) | Phase 2: business staff, business services, assignments, and staff availability. Due Sep 25, 2026. |
| M5 issue | [M5 - Appointment Booking System](https://github.com/cohort-2026/appointment-booking-system/milestone/5) | Phase 3 discovery/slots and the booking-creation endpoint/UI. Due Oct 2, 2026. |
| M6 issue | [M6 - Client Dashboard](https://github.com/cohort-2026/appointment-booking-system/milestone/6) | Phase 4 customer appointment list and detail views. Due Oct 9, 2026. |
| M7 issue | [M7 - Admin Dashboard & Platform Management](https://github.com/cohort-2026/appointment-booking-system/milestone/7) | Admin APIs and dashboard integration. Due Oct 16, 2026. |
| M8 issue | [M8 - Appointment Management & Business Rules](https://github.com/cohort-2026/appointment-booking-system/milestone/8) | Phase 4 cancellation, rescheduling, provider/business/staff appointment management. Due Oct 23, 2026. |
| M9 issue | [M9 - Testing, Integration & Bug Fixing](https://github.com/cohort-2026/appointment-booking-system/milestone/9) | Cross-role integration and regression. Due Oct 30, 2026. |
| M10 issue | [M10 - Finalization, Deployment & Documentation](https://github.com/cohort-2026/appointment-booking-system/milestone/10) | Production deployment, documentation, cleanup, and demonstration. Due Nov 6, 2026. |

---

## Draft Issue: M4 - Complete Business Services, Staff, and Availability

**Milestone:** M4 - Service & Availability Management  
**Backend phase:** Phase 2  
**Suggested title:** `Complete business staff, services, assignments, and availability APIs`

**Description:** Complete the business-owner workflow for inviting and managing staff, creating business services, assigning services to staff, and configuring staff weekly availability. This is one phase-level issue; use the checklist below to track its endpoint-sized deliverables. Do not begin Phase 3 backend implementation until this issue's API work, tests, and phase gate are complete.

**Checklist:**

- [ ] `GET /api/business/staff`: list only the authenticated owner's staff with safe user fields and assigned service IDs/names.
- [ ] `POST /api/business/staff/invitations`: issue a single-use, expiring staff invitation; enforce subscription staff cap; send through the email service without exposing the token or a password.
- [ ] `POST /api/business/staff/invitations/accept`: validate and consume an invitation, collect staff-owned credentials, and atomically create/link a `BUSINESS_STAFF` account.
- [ ] `GET /api/business/staff/:staffId`: return safe details only for staff belonging to the owner's business.
- [ ] `PATCH /api/business/staff/:staffId`: update approved staff fields/access state without allowing role escalation or business reassignment.
- [ ] `DELETE /api/business/staff/:staffId`: deactivate/remove staff safely while preserving appointment history.
- [ ] `GET /api/business/services`: list this business's services in stable order.
- [ ] `POST /api/business/services`: create a business-owned service using Phase 1 service validation; expected price remains informational.
- [ ] `PATCH /api/business/services/:serviceId`: update allowlisted fields only for a service owned by this business.
- [ ] `DELETE /api/business/services/:serviceId`: deactivate when appointments/assignments exist; hard-delete only when safe.
- [ ] `PUT /api/business/staff/:staffId/services`: atomically replace assignments; validate same-business ownership and active services.
- [ ] `GET /api/business/staff/:staffId/availability`: return that staff member's weekly rules only to the owning business.
- [ ] `PUT /api/business/staff/:staffId/availability`: atomically replace rules using Phase 1 weekday/time/overlap validation.
- [ ] Complete business staff UI: list, invitation, acceptance, details/edit, removal/deactivation, and protected routes.
- [ ] Complete business service and assignment UI; connect weekly staff availability editor.
- [ ] Add focused tests for each endpoint plus cross-business isolation, invitation expiry/reuse, staff cap, assignment validation, and availability validation.
- [ ] Run Phase 2 regression tests and backend typecheck/build; record final API contracts for the frontend member.

**Acceptance criteria:**

- Every private endpoint requires the correct role and scopes data from the authenticated owner's business.
- Staff invitation uses a single-use, expiring token; staff create their own password; no credentials or invitation secrets leak.
- Business staff caps are enforced server-side.
- Staff and services cannot be linked across businesses; assignment replacement is atomic.
- Service/availability inputs are validated; history remains intact when staff/services are removed or deactivated.
- Phase 2 tests and backend typecheck/build pass before Phase 3 starts.

---

## Draft Issue: M5 - Complete Discovery, Availability Slots, and Booking Creation

**Milestone:** M5 - Appointment Booking System  
**Backend phases:** Phase 3, followed by the booking-creation portion of Phase 4  
**Suggested title:** `Implement public discovery, availability slots, and free booking`

**Description:** Make active sole providers, businesses, services, and bookable time slots discoverable, then allow customers to create a free confirmed booking. Complete and validate all Phase 3 discovery/slot work before implementing booking creation. The browser's slot list is advisory; the booking endpoint must repeat all checks at write time.

**Checklist:**

- [ ] `GET /api/providers`: bounded, paginated public search for verified/bookable sole providers and businesses with agreed filters.
- [ ] `GET /api/providers/:providerId`: safe public profile response with a stable identifier and type discriminator.
- [ ] `GET /api/providers/:providerId/services`: list active bookable services and eligible business staff without private fields.
- [ ] `GET /api/availability/slots`: calculate slots from weekly availability, service duration, existing appointments, and configured package caps.
- [ ] Finish Phase 3 focused tests for filters, pagination, public-field safety, inactive records, timezone handling, slot duration, conflicts, and daily caps; pass the Phase 3 gate.
- [ ] `POST /api/customer/appointments`: derive customer ID from session; validate provider/service/staff, future time, active state, availability, conflicts, and package caps; atomically create a free `CONFIRMED` appointment.
- [ ] Add a database-safe concurrency strategy so simultaneous requests cannot claim the same provider/staff slot or exceed a cap.
- [ ] Complete live provider discovery/profile UI using the public endpoints; replace mock/static provider records.
- [ ] Complete customer provider/service/staff/date/slot selection and free booking confirmation UI.
- [ ] Show clear slot-conflict feedback and refresh available slots; no customer payment step or payment record.
- [ ] Add focused endpoint, isolation, limit, and concurrent-booking tests; run backend typecheck/build.

**Acceptance criteria:**

- Public APIs return only safe, active, bookable records with bounded pagination.
- Slot results use the agreed 15-minute start cadence and timezone-explicit ISO timestamps; full service duration must fit.
- Booking creation revalidates the slot and applicable daily limits at write time and creates `CONFIRMED` immediately on success.
- Customer ID is never accepted from the request body; no booking payment is collected.
- Phase 3 is signed off before booking creation begins, and M5 API/UI checks pass before M6/M8 integration.

---

## Draft Issue: M6 - Complete the Customer Appointment Dashboard

**Milestone:** M6 - Client Dashboard  
**Backend phase:** Phase 4 customer read endpoints  
**Suggested title:** `Complete customer appointment list and detail views`

**Description:** Complete the customer-facing dashboard data and UI for viewing upcoming and past appointments and opening an appointment detail view. Appointment mutation actions remain in the M8 issue.

**Checklist:**

- [ ] Review and test existing `GET /api/customer/appointments`; keep the path and define bounded pagination, ordering, and upcoming/past status rules.
- [ ] Add `GET /api/customer/appointments/:appointmentId`, scoped to the authenticated customer and returning only customer-facing fields.
- [ ] Complete customer appointment list and detail pages; display service, provider/business, selected staff where applicable, time, and status.
- [ ] Register protected customer routes and connect dashboard navigation to the pages.
- [ ] Add tests for customer ownership, status buckets, date boundary, pagination, missing appointment, and empty data.
- [ ] Coordinate cancel/reschedule buttons with M8; do not expose actions before those endpoints are ready.

**Acceptance criteria:**

- Customer can see only their own appointments, with upcoming and past results clearly separated and ordered.
- Missing or another customer's appointment is not disclosed.
- Loading, empty, and error states work; customer routes require authentication and the `CUSTOMER` role.
- Backend typecheck and focused customer dashboard tests pass.

---

## Draft Issue: M7 - Implement Admin Dashboard Data and Platform Lists

**Milestone:** M7 - Admin Dashboard & Platform Management  
**Workstream:** Admin APIs/UI; separate from the sequential booking backend phases unless explicitly made a dependency.  
**Suggested title:** `Connect admin dashboard to platform management APIs`

**Description:** Add the read-only, admin-authorized API data needed for platform summary metrics and admin lists, then connect the admin dashboard UI. The current schema has no provider/business approval status, so do not fabricate pending approvals or add approval controls without a separate product/schema decision.

**Checklist:**

- [ ] `GET /api/admin/dashboard`: return total users, businesses, sole providers, and bookings this month with documented counting rules.
- [ ] `GET /api/admin/users`: bounded, searchable, paginated safe user data; omit password, OTP, and reset fields.
- [ ] `GET /api/admin/providers`: bounded, paginated sole-provider data with safe profile fields.
- [ ] `GET /api/admin/businesses`: bounded, paginated business data with safe profile fields.
- [ ] `GET /api/admin/appointments`: bounded, filterable, read-only platform appointment list with minimal personal data.
- [ ] Register and protect admin API routes with `ADMIN` middleware.
- [ ] Connect admin dashboard summary metrics to live responses and remove fabricated/local placeholder activity data.
- [ ] Add tests for role restriction, pagination/filtering, zero-data response, and sensitive-field omission.

**Acceptance criteria:**

- Every endpoint requires `ADMIN`; other roles receive `403`.
- Counts, filters, and response fields are documented and consistent.
- Secrets and unnecessary personal data never appear; approval state is not invented.
- Admin UI is API-backed and handles loading/error/empty states.

---

## Draft Issue: M8 - Implement Appointment Management Rules and Actions

**Milestone:** M8 - Appointment Management & Business Rules  
**Backend phase:** Remaining Phase 4 appointment mutation and provider/business/staff management  
**Dependency:** M5 booking creation must be stable; M6 customer read views may be developed separately.  
**Suggested title:** `Implement appointment cancellation, rescheduling, and lifecycle management`

**Description:** Implement customer cancellation/rescheduling and role-scoped appointment views/status actions for sole providers, business owners, and assigned business staff. Enforce the agreed lifecycle: booking is immediately `CONFIRMED`; customer may change a future confirmed booking before its start; authorized provider/business/staff actions may explicitly set `COMPLETED` or `NO_SHOW`; never infer completion from elapsed time.

**Checklist:**

- [ ] `PATCH /api/customer/appointments/:appointmentId/cancel`: cancel only an owned future confirmed appointment; preserve history and release the slot.
- [ ] `PATCH /api/customer/appointments/:appointmentId/reschedule`: validate and atomically recheck the new slot; leave original booking unchanged if it fails.
- [ ] `GET /api/provider/appointments`: bounded, filtered list scoped to authenticated sole provider.
- [ ] `PATCH /api/provider/appointments/:appointmentId/status`: validate ownership and allowed explicit outcome transitions.
- [ ] `GET /api/business/appointments`: bounded, filtered list scoped to authenticated owner's business.
- [ ] `PATCH /api/business/appointments/:appointmentId/status`: validate business ownership and allowed transitions.
- [ ] `GET /api/staff/appointments`: list appointments for staff resolved from authenticated user; show customer display name only by default.
- [ ] `PATCH /api/staff/appointments/:appointmentId/status`: allow only approved actions on appointments assigned to that staff member.
- [ ] Complete provider, business-owner, and staff appointment list/detail/action UI and register protected routes.
- [ ] Complete customer cancel/reschedule UI with confirmation, conflict handling, and refresh after success.
- [ ] Add focused tests for ownership isolation, terminal/invalid states, transition permissions, failed reschedule rollback, and slot release.

**Acceptance criteria:**

- Every query/mutation is scoped to the authenticated customer's/provider's/business's/staff's records.
- Cancellation and rescheduling follow the agreed before-start policy; failed rescheduling preserves the original appointment.
- Status transitions are explicit, validated, and never inferred from time.
- Staff sees only assigned appointments and no customer email/phone by default.
- M8 endpoint tests and backend typecheck/build pass; frontend actions handle success and failure states.

---

## Draft Issue: M9 - Integrate and Regression-Test Core User Workflows

**Milestone:** M9 - Testing, Integration & Bug Fixing  
**Suggested title:** `Integrate and regression-test provider, business, and customer workflows`

**Description:** After the relevant M4–M8 features are integrated, run repeatable end-to-end testing across the core roles, fix defects, and record remaining release risks. Endpoint issues still require their own focused tests; this issue covers cross-layer behavior.

**Checklist:**

- [ ] Test sole-provider registration/verification, profile, service, availability, discovery, booking receipt, and appointment status flow.
- [ ] Test business registration, staff invitation/acceptance, service CRUD, service assignment, staff availability, customer booking, and owner/staff appointment flow.
- [ ] Test customer discovery, free booking, upcoming/past list, detail, cancel, and reschedule flow.
- [ ] Run authorization/tenant isolation regression across customer, sole provider, business owner, staff, and admin roles.
- [ ] Test same-slot concurrent booking and provider/staff daily limits using an isolated test database.
- [ ] Verify frontend request/response types, error handling, protected routes, loading/empty states, and mobile/desktop flows.
- [ ] Run backend tests/typecheck and frontend tests/lint/build where configured.
- [ ] Fix critical/high-severity defects or document an explicit release decision for each remaining issue.

**Acceptance criteria:**

- Repeatable test steps/results are recorded for each role workflow.
- Cross-user/cross-business access is denied and no private fields leak.
- Concurrent booking and cap tests pass on isolated test data.
- Agreed backend/frontend checks pass and remaining defects have owners/severity.

---

## Draft Issue: M10 - Prepare Production Deployment and Final Submission

**Milestone:** M10 - Finalization, Deployment & Documentation  
**Suggested title:** `Finalize deployment, documentation, and project demonstration`

**Description:** Prepare production configuration and deployment, document setup and API contracts, complete final cleanup, and rehearse the submission walkthrough. Never place real secrets in repository files or documentation.

**Checklist:**

- [ ] Document production environment variables for backend, frontend, database, email, and JWT without including secret values.
- [ ] Store production secrets in deployment secret management; rotate exposed/development credentials as needed.
- [ ] Configure production CORS, HTTPS cookies, frontend API origin, and allowed origins.
- [ ] Deploy backend and frontend; verify health, database connectivity, authentication, role redirects, and core workflows.
- [ ] Apply database migrations through a documented, repeatable release process; document backup/rollback steps and avoid accidental seed data.
- [ ] Verify production build contains no localhost API URLs or environment secrets.
- [ ] Update root/backend/frontend setup, migration, seed/admin, endpoint, user workflow, deployment, and known-limitations documentation.
- [ ] Remove dead/debug artifacts in scope; verify lint/typecheck/tests/build and responsive/accessibility basics.
- [ ] Prepare safe reproducible demo accounts/data and rehearse sole-provider, business, customer, and admin walkthroughs.

**Acceptance criteria:**

- Production frontend/backend operate over HTTPS and complete the core flows.
- Required setup, migration, deployment, rollback, and API instructions are accurate and repeatable.
- No credentials or tokens are committed, logged, or published in build output/docs.
- Final checks pass and known limitations are recorded for submission.

---

## Creation Notes

- Create exactly one GitHub issue for each draft above and assign it to the listed milestone.
- The checkboxes are sub-work items within that phase issue, not separate GitHub issues.
- Preserve the backend sequence: M4/Phase 2 gate, then M5 discovery/slots gate and booking creation, then M6/M8 Phase 4 completion. M7 may run separately; M9 follows integration; M10 follows release-scope sign-off.
- Confirm whether the overdue M4–M8 work should remain in its original milestone or be moved to a revised milestone.
