import { useAuth } from "../../context/AuthContext";
import AccessDenied from "./AccessDenied";

export default function PermissionGuard({
  permission,
  requiredRole,
  anyPermissions,
  allPermissions,
  fallback,
  children,
}) {
  const { hasPermission, hasAnyPermission, hasRole, roles } = useAuth();

  // 1. Role verification if specified
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      fallback || (
        <AccessDenied
          title="Staff Role Required"
          message={`This operational module requires the ${requiredRole} role.`}
          requiredRole={requiredRole}
        />
      )
    );
  }

  // 2. Specific single permission verification
  if (permission && !hasPermission(permission)) {
    return (
      fallback || (
        <AccessDenied
          title="Permission Restricted"
          message="Your account roles do not grant the required authority for this action or module."
          requiredPermission={permission}
        />
      )
    );
  }

  // 3. Any permission of a list
  if (anyPermissions && anyPermissions.length > 0 && !hasAnyPermission(anyPermissions)) {
    return (
      fallback || (
        <AccessDenied
          title="Authorization Restricted"
          message="You do not possess any of the authorized permissions required to access this resource."
          requiredPermission={anyPermissions.join(" OR ")}
        />
      )
    );
  }

  // 4. All permissions of a list
  if (allPermissions && allPermissions.length > 0) {
    const missing = allPermissions.find((p) => !hasPermission(p));
    if (missing) {
      return (
        fallback || (
          <AccessDenied
            title="Elevated Permission Required"
            message="Your account is missing one or more required permissions for this administrative resource."
            requiredPermission={missing}
          />
        )
      );
    }
  }

  return children;
}
