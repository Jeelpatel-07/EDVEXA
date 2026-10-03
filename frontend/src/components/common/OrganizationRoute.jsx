import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LoadingState from "./LoadingState";
import OrgSuspended from "./OrgSuspended";

/**
 * Guard for Organization Workspaces (/app/...)
 * Verifies authentication, tenant context, and organization status (Section 38).
 */
export default function OrganizationRoute({ children }) {
  const { isAuthenticated, isLoading, organization, isPlatformAdmin } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <LoadingState message="Connecting to organization workspace..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If organization is suspended, display Section 38 suspended notification
  if (organization && organization.status === "SUSPENDED") {
    return <OrgSuspended />;
  }

  return children;
}
