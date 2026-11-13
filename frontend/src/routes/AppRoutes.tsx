import { Navigate, Route, Routes } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import AdminLayout from "../layouts/AdminLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";

// Public pages
import Home from "../pages/public/Home";
import Pricing from "../pages/public/Pricing";
import Login from "../pages/public/Login";
import About from "../pages/public/About";
import Contact from "../pages/public/Contact";
import VerifyEmail from "../pages/public/VerifyEmail";
import ForgotPassword from "../pages/public/ForgotPassword.tsx";
import ResetPassword from "../pages/public/ResetPassword.tsx";

// Provider discovery
import Providers from "../pages/public/providers/Providers";
import ProviderProfile from "../pages/public/providers/ProviderProfile";

// Registration
import Register from "../pages/public/register/Register";
import CustomerRegister from "../pages/public/register/CustomerRegister";
import ProviderRegister from "../pages/public/register/ProviderRegister";
import BusinessRegister from "../pages/public/register/BusinessRegister";

// Dashboards
import ClientDashboard from "../pages/dashboard/customer/Dashboard";
import ProviderDashboard from "../pages/dashboard/provider/Dashboard";
import BusinessDashboard from "../pages/dashboard/business/Dashboard";

// Admin pages
import AdminDashboard from "../pages/dashboard/admin/Dashboard";
import AdminClients from "../pages/dashboard/admin/User";
import AdminBusinesses from "../pages/dashboard/admin/Businesses";
import AdminProviders from "../pages/dashboard/admin/Providers";
import AdminSubscriptions from "../pages/dashboard/admin/Subscriptions";
import AdminReports from "../pages/dashboard/admin/Reports";
// import AdminAppointments from "../pages/dashboard/admin/Appointments";
// import AdminServices from "../pages/dashboard/admin/Services";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        {/* Main public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* Provider discovery */}
        <Route path="/providers" element={<Providers />} />
        <Route path="/providers/:id" element={<ProviderProfile />} />

        {/* Registration */}
        <Route path="/register" element={<Register />} />
        <Route path="/register/customer" element={<CustomerRegister />} />
        <Route path="/register/provider" element={<ProviderRegister />} />
        <Route path="/register/business" element={<BusinessRegister />} />
      </Route>

      {/* Protected dashboards */}
      <Route
        path="/dashboard/customer"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["CUSTOMER"]}>
              <ClientDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/provider"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["SOLE_PROVIDER"]}>
              <ProviderDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/business"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["BUSINESS_OWNER"]}>
              <BusinessDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Admin dashboard (layout + nested pages) */}
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AdminLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
                <Route index element={<AdminDashboard />} />
        <Route path="clients" element={<AdminClients />} />
        <Route path="businesses" element={<AdminBusinesses />} />
        <Route path="providers" element={<AdminProviders />} />
        <Route path="subscriptions" element={<AdminSubscriptions />} />
        <Route path="reports" element={<AdminReports />} />
       <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
      </Route>
    </Routes>
  );
}