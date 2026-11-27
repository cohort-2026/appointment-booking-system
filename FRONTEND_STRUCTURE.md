# Frontend Structure

The tree below shows the frontend project files. Dependency directories and generated build output are excluded.

```text
frontend/
|-- .gitignore
|-- components.json
|-- eslint.config.js
|-- index.html
|-- package.json
|-- pnpm-lock.yaml
|-- README.md
|-- tsconfig.app.json
|-- tsconfig.json
|-- tsconfig.node.json
|-- ui-kit.html
|-- vite.config.ts
|-- public/
|   |-- favicon.svg
|   `-- icons.svg
|-- scripts/ (empty)
|-- src/
|   |-- App.css
|   |-- App.tsx
|   |-- index.css
|   |-- main.tsx
|   |-- assets/
|   |   |-- hero.png
|   |   |-- react.svg
|   |   `-- vite.svg
|   |-- components/
|   |   |-- app-sidebar.tsx
|   |   |-- nav-main.tsx
|   |   |-- nav-projects.tsx
|   |   |-- nav-user.tsx
|   |   |-- team-switcher.tsx
|   |   |-- appointment/
|   |   |   |-- AppointmentCard.tsx
|   |   |   |-- QuickLinkCard.tsx
|   |   |   `-- status-badge.tsx
|   |   |-- booking/
|   |   |   |-- AppointmentHistoryDrawer.tsx
|   |   |   |-- AppointmentManagement.tsx
|   |   |   |-- BookingConfirmation.tsx
|   |   |   |-- BookingJourney.tsx
|   |   |   |-- BookingSummary.tsx
|   |   |   |-- NextAppointmentBanner.tsx
|   |   |   `-- SlotPicker.tsx
|   |   |-- calendar/
|   |   |   |-- Calender.tsx
|   |   |   `-- WeekView.tsx
|   |   |-- dashboard/
|   |   |   |-- DashboardShell.tsx
|   |   |   `-- StatCard.tsx
|   |   |-- forms/
|   |   |   |-- OnboardingForm.tsx
|   |   |   |-- ServiceForm.tsx
|   |   |   `-- StaffForm.tsx
|   |   |-- home/
|   |   |   |-- FindServices.tsx
|   |   |   |-- Hero.tsx
|   |   |   |-- HowItWorks.tsx
|   |   |   `-- ProviderCTA.tsx
|   |   |-- layout/
|   |   |   |-- AppLayout.tsx
|   |   |   |-- Footer.tsx
|   |   |   `-- Navbar.tsx
|   |   |-- subscriptions/
|   |   |   `-- PaidUpgradesUnavailable.tsx
|   |   `-- ui/
|   |       |-- alert-dialog.tsx
|   |       |-- avatar.tsx
|   |       |-- badge.tsx
|   |       |-- breadcrumb.tsx
|   |       |-- button.tsx
|   |       |-- card.tsx
|   |       |-- collapsible.tsx
|   |       |-- dialog.tsx
|   |       |-- dropdown-menu.tsx
|   |       |-- empty-state.tsx
|   |       |-- error-state.tsx
|   |       |-- input.tsx
|   |       |-- label.tsx
|   |       |-- select.tsx
|   |       |-- separator.tsx
|   |       |-- sheet.tsx
|   |       |-- sidebar.tsx
|   |       |-- skeleton.tsx
|   |       |-- sonner.tsx
|   |       |-- table.tsx
|   |       |-- tabs.tsx
|   |       |-- textarea.tsx
|   |       `-- tooltip.tsx
|   |-- context/
|   |   |-- AuthContext.tsx
|   |   `-- BusinessDashboardContext.tsx
|   |-- dev/
|   |   `-- ui-kit-preview.tsx
|   |-- hooks/
|   |   |-- use-mobile.ts
|   |   |-- useAuth.ts
|   |   |-- useAvailability.ts
|   |   `-- useBookings.ts
|   |-- layouts/
|   |   |-- CustomerLayout.tsx
|   |   `-- PublicLayout.tsx
|   |-- lib/
|   |   |-- bookingDraft.ts
|   |   |-- bookingFlow.ts
|   |   |-- bookingTime.ts
|   |   |-- dashboardPath.ts
|   |   |-- downloadAppointmentCalendar.ts
|   |   |-- formatBusinessName.ts
|   |   `-- utils.ts
|   |-- pages/
|   |   |-- dashboard/
|   |   |   |-- admin/
|   |   |   |   |-- Appointments.tsx
|   |   |   |   |-- Businesses.tsx
|   |   |   |   |-- Dashboard.tsx
|   |   |   |   |-- Profile.tsx
|   |   |   |   |-- Providers.tsx
|   |   |   |   |-- Reports.tsx
|   |   |   |   |-- Subscriptions.tsx
|   |   |   |   `-- User.tsx
|   |   |   |-- business/
|   |   |   |   |-- Analytics.tsx
|   |   |   |   |-- Appointments.tsx
|   |   |   |   |-- Dashboard.tsx
|   |   |   |   |-- Package.tsx
|   |   |   |   |-- PackageCheckout.tsx
|   |   |   |   |-- PackageSuccess.tsx
|   |   |   |   |-- Profile.tsx
|   |   |   |   |-- Services.tsx
|   |   |   |   |-- Staff.tsx
|   |   |   |   |-- StaffCalender.tsx
|   |   |   |   |-- StaffDetails.tsx
|   |   |   |   `-- UpgradePlans.tsx
|   |   |   |-- customer/
|   |   |   |   |-- AppointmentDetails.tsx
|   |   |   |   |-- Appointments.tsx
|   |   |   |   |-- Book.tsx
|   |   |   |   |-- Dashboard.tsx
|   |   |   |   `-- Profile.tsx
|   |   |   |-- provider/
|   |   |   |   |-- Analytics.tsx
|   |   |   |   |-- AppointmentDetails.tsx
|   |   |   |   |-- Appointments.tsx
|   |   |   |   |-- Availability.tsx
|   |   |   |   |-- Calender.tsx
|   |   |   |   |-- Dashboard.tsx
|   |   |   |   |-- Package.tsx
|   |   |   |   |-- Profile.tsx
|   |   |   |   `-- Services.tsx
|   |   |   `-- staff/
|   |   |       |-- Appointments.tsx
|   |   |       |-- Availability.tsx
|   |   |       |-- Dashboard.tsx
|   |   |       |-- Overview.tsx
|   |   |       `-- Profile.tsx
|   |   |-- public/
|   |   |   |-- About.tsx
|   |   |   |-- AcceptStaffInvitation.tsx
|   |   |   |-- Contact.tsx
|   |   |   |-- ForgotPassword.tsx
|   |   |   |-- Home.tsx
|   |   |   |-- Login.tsx
|   |   |   |-- Pricing.tsx
|   |   |   |-- ResetPassword.tsx
|   |   |   |-- VerifyEmail.tsx
|   |   |   |-- providers/
|   |   |   |   |-- ProviderProfile.tsx
|   |   |   |   `-- Providers.tsx
|   |   |   `-- register/
|   |   |       |-- BusinessRegister.tsx
|   |   |       |-- CustomerRegister.tsx
|   |   |       |-- ProviderRegister.tsx
|   |   |       `-- Register.tsx
|   |   `-- staff/
|   |       |-- Appointments.tsx
|   |       |-- Calender.tsx
|   |       `-- Dashboard.tsx
|   |-- routes/
|   |   |-- AppRoutes.tsx
|   |   |-- ProtectedRoute.tsx
|   |   `-- RoleRoute.tsx
|   |-- services/
|   |   |-- admin.ts
|   |   |-- api.ts
|   |   |-- auth.ts
|   |   |-- bookings.ts
|   |   |-- providers.ts
|   |   |-- staff.ts
|   |   `-- subscriptions.ts
|   `-- types/
|       |-- index.ts
|       `-- providers.ts
`-- tests/ (empty)
```