import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home, HelpCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ROLE_METADATA } from "../../constants/permissions";

export default function AccessDenied({
  title = "Access Denied",
  message = "You are signed in, but your current account permissions do not allow access to this section.",
  requiredPermission,
  requiredRole,
}) {
  const { roles, user, organization, isPlatformAdmin, hasStaffAccess } = useAuth();

  const destination = isPlatformAdmin() ? "/platform/dashboard" : (hasStaffAccess ? "/app/manage" : "/app/dashboard");

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 bg-slate-50/50">
      <div className="w-full max-w-lg bg-card rounded-2xl border border-border p-8 shadow-xs text-center space-y-6">
        {/* Shield Icon */}
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        {/* Header Text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {message}
          </p>
        </div>

        {/* Audit Context Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-border text-left space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-muted-foreground font-medium">Signed In As</span>
            <span className="font-semibold text-foreground">{user?.email || "Authenticated User"}</span>
          </div>

          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-muted-foreground font-medium">Organization</span>
            <span className="font-semibold text-foreground">
              {organization?.name || (isPlatformAdmin() ? "Platform Scope" : "None")}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2 pt-0.5">
            <span className="text-muted-foreground font-medium">Your Roles</span>
            <div className="flex flex-wrap gap-1 justify-end max-w-[240px]">
              {roles.length > 0 ? (
                roles.map((r) => {
                  const meta = ROLE_METADATA[r];
                  return (
                    <span
                      key={r}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        meta?.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {meta?.name || r}
                    </span>
                  );
                })
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Guest Student (No Staff Roles)
                </span>
              )}
            </div>
          </div>

          {(requiredPermission || requiredRole) && (
            <div className="mt-2 pt-2 border-t border-dashed border-border flex items-center justify-between text-[11px] text-rose-700">
              <span className="font-medium">Required Authorization</span>
              <code className="font-mono bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                {requiredPermission || `Role: ${requiredRole}`}
              </code>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to={destination}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <Link
            to="/app/membership"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>View Permissions & Perks</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
