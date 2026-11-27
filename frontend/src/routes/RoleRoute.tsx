import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { DashboardSkeleton } from "../components/dashboard/DashboardSkeleton";

export function RoleRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
