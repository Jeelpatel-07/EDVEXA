import { useAuth } from "../../context/AuthContext";
import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export default function PermissionGuard({
  permission,
  requiredRole,
  fallback,
  children,
}) {
  const { user, activeRole, permissions } = useAuth();

  // If specific role requested
  if (requiredRole && activeRole !== requiredRole && !user?.roles?.includes(requiredRole)) {
    return (
      fallback || (
        <div className="p-8 max-w-lg mx-auto my-8 bg-card rounded-2xl border border-border text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Staff Role Required
          </h3>
          <p className="text-xs text-muted-foreground mt-1 mb-5">
            This module requires the <strong>{requiredRole}</strong> role. You are currently browsing as <strong>{activeRole}</strong>.
          </p>
          <Link
            to="/app/dashboard"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 shadow-xs"
          >
            Back to Dashboard
          </Link>
        </div>
      )
    );
  }

  // If specific permission requested
  if (permission && !permissions[permission]) {
    return (
      fallback || (
        <div className="p-8 max-w-lg mx-auto my-8 bg-card rounded-2xl border border-border text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Access Restricted
          </h3>
          <p className="text-xs text-muted-foreground mt-1 mb-5">
            Your current active role ({activeRole}) does not have permission for this staff module.
          </p>
          <Link
            to="/app/dashboard"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 shadow-xs"
          >
            Return to Personal Area
          </Link>
        </div>
      )
    );
  }

  return children;
}
