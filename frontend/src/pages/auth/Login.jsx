import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { ROLES } from "../../constants/permissions";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const destination = location.state?.from?.pathname || location.state?.from;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login({ email, password });
      const roles = res?.roles || [];

      // Determine default role landing page (Section 10d)
      const isPlat = roles.includes(ROLES.PLATFORM_ADMIN);
      let defaultTarget = "/dashboard";
      if (isPlat) {
        defaultTarget = "/platform";
      } else if (roles.length === 1 && roles.includes(ROLES.GATE_STAFF)) {
        defaultTarget = "/scanner";
      } else if (roles.length === 1 && roles.includes(ROLES.VOLUNTEER)) {
        defaultTarget = "/my-tasks";
      }

      // If user had an intended destination, ensure it matches their role clearance
      if (destination && destination !== "/login" && destination !== "/") {
        if (destination.startsWith("/platform") && !isPlat) {
          // Never send non-platform users (like ORG_ADMIN) into /platform
          navigate(defaultTarget, { replace: true });
        } else if (destination.startsWith("/app") && isPlat) {
          // Never send platform admins without tenant context into /app
          navigate(defaultTarget, { replace: true });
        } else {
          navigate(destination, { replace: true });
        }
      } else {
        navigate(defaultTarget, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to log in. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50/50">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <img
            src="/logo.png"
            alt="EDVEXA Logo"
            className="w-16 h-16 rounded-2xl object-contain mx-auto mb-3 shadow-sm bg-white border border-border/40 p-1"
          />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Sign In to EDVEXA
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Student Organization Governance, Ticketing, and Member Services
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Credentials Login Form (Email + Password only) */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@edvexa.edu"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-teal-600 hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>{loading ? "Authenticating Session..." : "Sign In to Workspace"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
          Don't have an account yet?{" "}
          <Link to="/register" className="font-semibold text-teal-600 hover:underline">
            Register as Student
          </Link>
        </div>
      </div>
    </div>
  );
}
