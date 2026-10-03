import { Link } from "react-router-dom";
import { AlertTriangle, LogOut, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function OrgSuspended() {
  const { organization, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md bg-card rounded-2xl border border-rose-200 p-8 shadow-xs text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Organization Currently Unavailable
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            The workspace for <strong>{organization?.name || "your organization"}</strong> is currently suspended by platform administrators.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 text-xs text-rose-800 text-left">
          <span className="font-semibold block mb-0.5">Status: SUSPENDED</span>
          <span>
            Operational tools, member ticketing, and financial records are temporarily locked. Please contact your campus activities administrator.
          </span>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition-colors shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
