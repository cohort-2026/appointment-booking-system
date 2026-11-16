import { Route, Routes, Navigate } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import ProviderLayout from "../layouts/ProviderLayout";
import BusinessLayout from "../layouts/BusinessLayout";
import StaffLayout from "../layouts/StaffLayout";
import CustomerLayout from "../layouts/CustomerLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";

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

// Provider discovery
import Providers from "../pages/public/providers/Providers";
import ProviderProfile from "../pages/public/providers/ProviderProfile";

// Registration
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

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public pages */}
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

      {/* Sole provider dashboard */}
      {/* --- PROTECTED PROVIDER DASHBOARD ROUTES --- */}
      {/* 
        We wrap the entire provider section in the ProtectedRoute and RoleRoute.
        Then we use ProviderLayout to render the sidebar.
      */}
      <Route
        path="/dashboard/provider"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["SOLE_PROVIDER"]}>
              <ProviderLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        
        {/* Index route for /dashboard/provider (the main Dashboard) */}
        <Route index element={<ProviderDashboard />} />
        
        {/* Sub-routes for the provider dashboard */}
        <Route path="services" element={<Services />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="availability" element={<Availability />} />
        <Route path="availability/edit" element={<Availability editMode />} />
        <Route path="profile" element={<ProviderProfilePage />} />
        <Route path="subscription" element={<ProviderPackage />} />
      </Route>

      {/* Customer dashboard */}
      {/* --- PROTECTED CUSTOMER DASHBOARD --- */}
      <Route
        path="/dashboard/customer"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["CUSTOMER"]}>
              <CustomerLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDashboard />} />
        <Route path="book" element={<CustomerBook />} />
        <Route path="appointments" element={<CustomerAppointments />} />
        <Route path="appointments/:id" element={<CustomerAppointmentDetails />} />
        <Route path="profile" element={<CustomerProfile />} />
      </Route>

      {/* Business owner dashboard */}
      {/* --- PROTECTED BUSINESS DASHBOARD --- */}
      <Route
        path="/dashboard/business"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["BUSINESS_OWNER"]}>
              <BusinessLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<BusinessDashboard />} />
        <Route path="services" element={<BusinessServices />} />
        <Route path="staff" element={<BusinessStaff />} />
        <Route path="staff/:id" element={<StaffDetails />} />
        <Route path="appointments" element={<BusinessAppointments />} />
        <Route path="package" element={<BusinessPackage />} />
        <Route path="analytics" element={<BusinessAnalytics />} />
        <Route path="package/plans" element={<UpgradePlans />} />
        <Route path="package/checkout" element={<PackageCheckout />} />
        <Route path="package/success" element={<PackageSuccess />} />
        <Route path="profile" element={<BusinessProfilePage />} />
      </Route>

      {/* Business staff dashboard */}
      <Route
        path="/dashboard/staff"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["BUSINESS_STAFF"]}>
              <StaffLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<StaffOverview />} />
        <Route path="appointments" element={<StaffAppointments />} />
        <Route path="availability" element={<StaffAvailability />} />
        <Route path="profile" element={<StaffProfile />} />
      </Route>

      {/* Admin dashboard */}
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AdminDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
