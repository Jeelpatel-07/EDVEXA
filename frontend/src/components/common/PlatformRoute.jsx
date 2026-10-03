import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingState from "./LoadingState";
import AccessDenied from "./AccessDenied";
import { PERMISSIONS, ROLES } from "../../constants/permissions";

/**
 * Guard for Section 11 Platform Admin workspace (/platform/...)
 * Strictly restricted to users with PLATFORM_ADMIN role.
 */
export default function PlatformRoute({ children }) {
  const { isAuthenticated, isLoading, isPlatformAdmin, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <LoadingState message="Verifying platform security clearances..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isPlatformAdmin() && !hasPermission(PERMISSIONS.ORGANIZATIONS_MANAGE)) {
    return (
      <AccessDenied
        title="Platform Administration Restricted"
        message="This workspace is exclusively restricted to EDVEXA Platform Administrators. Organization-level officers do not have platform access."
        requiredRole={ROLES.PLATFORM_ADMIN}
      />
    );
  }

  return children;
}
