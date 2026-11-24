import { Route, Routes, Navigate } from "react-router-dom";

import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";
import { AppLayout } from "../components/layout/AppLayout";
import PublicLayout from "../layouts/PublicLayout";

// Public pages
import Home from "../pages/public/Home";
import Pricing from "../pages/public/Pricing";
import Login from "../pages/public/Login";
import About from "../pages/public/About";
import Contact from "../pages/public/Contact";
import VerifyEmail from "../pages/public/VerifyEmail";
import ForgotPassword from "../pages/public/ForgotPassword";
import ResetPassword from "../pages/public/ResetPassword";
import AcceptStaffInvitation from "../pages/public/AcceptStaffInvitation";

// Provider discovery & Registration
import Providers from "../pages/public/providers/Providers";
import ProviderProfile from "../pages/public/providers/ProviderProfile";
import Register from "../pages/public/register/Register";
import CustomerRegister from "../pages/public/register/CustomerRegister";
import ProviderRegister from "../pages/public/register/ProviderRegister";
import BusinessRegister from "../pages/public/register/BusinessRegister";

// Customer dashboard
import CustomerDashboard from "../pages/dashboard/customer/Dashboard";
import CustomerBook from "../pages/dashboard/customer/Book";
import CustomerAppointments from "../pages/dashboard/customer/Appointments";
import CustomerAppointmentDetails from "../pages/dashboard/customer/AppointmentDetails";
import CustomerProfile from "../pages/dashboard/customer/Profile";

// Sole provider dashboard
import ProviderDashboard from "../pages/dashboard/provider/Dashboard";
import Services from "../pages/dashboard/provider/Services";
import Appointments from "../pages/dashboard/provider/Appointments";
import Availability from "../pages/dashboard/provider/Availability";
import ProviderProfilePage from "../pages/dashboard/provider/Profile";
import ProviderPackage from "../pages/dashboard/provider/Package";

// Business owner dashboard
import BusinessDashboard from "../pages/dashboard/business/Dashboard";
import BusinessServices from "../pages/dashboard/business/Services";
import BusinessStaff from "../pages/dashboard/business/Staff";
import StaffDetails from "../pages/dashboard/business/StaffDetails";
import BusinessAppointments from "../pages/dashboard/business/Appointments";
import BusinessPackage from "../pages/dashboard/business/Package";
import UpgradePlans from "../pages/dashboard/business/UpgradePlans";
import PackageCheckout from "../pages/dashboard/business/PackageCheckout";
import PackageSuccess from "../pages/dashboard/business/PackageSuccess";
import BusinessProfilePage from "../pages/dashboard/business/Profile";
import BusinessAnalytics from "../pages/dashboard/business/Analytics";

// Other dashboards
import StaffOverview from "../pages/dashboard/staff/Overview";
import StaffAppointments from "../pages/dashboard/staff/Appointments";
import StaffAvailability from "../pages/dashboard/staff/Availability";
import StaffProfile from "../pages/dashboard/staff/Profile";
import AdminDashboard from "../pages/dashboard/admin/Dashboard";
import AdminProfile from "../pages/dashboard/admin/Profile";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/manage/:token" element={<Navigate to="/dashboard/customer/appointments" replace />} />
      
      {/* --- PUBLIC PAGES --- */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-staff-invitation" element={<AcceptStaffInvitation />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/providers/:id" element={<ProviderProfile />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/customer" element={<CustomerRegister />} />
        <Route path="/register/provider" element={<ProviderRegister />} />
        <Route path="/register/business" element={<BusinessRegister />} />
      </Route>

      {/* --- 1. PROTECTED CUSTOMER DASHBOARD --- */}
      <Route
        path="/dashboard/customer"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["CUSTOMER"]}>
              <AppLayout role="customer" />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDashboard />} />
        <Route path="book" element={<CustomerBook />} />
        <Route path="book/:id" element={<ProviderProfile dashboard />} />
        <Route path="appointments" element={<CustomerAppointments />} />
        <Route path="appointments/:id" element={<CustomerAppointmentDetails />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Route>

      {/* --- 2. PROTECTED BUSINESS OWNER DASHBOARD --- */}
      <Route
        path="/dashboard/business"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["BUSINESS_OWNER"]}>
              <AppLayout role="owner" />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<BusinessDashboard />} />
        <Route path="services" element={<BusinessServices />} />
        <Route path="staff" element={<BusinessStaff />} />
        <Route path="staff/:id" element={<StaffDetails />} />
        <Route path="appointments" element={<BusinessAppointments />} />
        <Route path="analytics" element={<BusinessAnalytics />} />
        <Route path="package" element={<BusinessPackage />} />
        <Route path="package/plans" element={<UpgradePlans />} />
        <Route path="package/checkout" element={<PackageCheckout />} />
        <Route path="package/success" element={<PackageSuccess />} />
        <Route path="profile" element={<BusinessProfilePage />} />
      </Route>

      {/* --- 3. PROTECTED SOLE PROVIDER DASHBOARD --- */}
      <Route
        path="/dashboard/provider"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["SOLE_PROVIDER"]}>
              <AppLayout role="provider" />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<ProviderDashboard />} />
        <Route path="services" element={<Services />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="availability" element={<Availability />} />
        <Route path="profile" element={<ProviderProfilePage />} />
        <Route path="subscription" element={<ProviderPackage />} />
      </Route>

      {/* --- 4. PROTECTED STAFF DASHBOARD --- */}
      <Route
        path="/dashboard/staff"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["BUSINESS_STAFF"]}>
              <AppLayout role="staff" />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<StaffOverview />} />
        <Route path="appointments" element={<StaffAppointments />} />
        <Route path="availability" element={<StaffAvailability />} />
        <Route path="profile" element={<StaffProfile />} />
      </Route>

      {/* --- 5. PROTECTED ADMIN DASHBOARD --- */}
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AppLayout role="admin" />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="profile" element={<AdminProfile />} />
        {/* Add more admin routes here as needed */}
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}