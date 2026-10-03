import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Mail, Lock, ArrowRight, Shield, AlertCircle } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("alex.rivera@college.edu");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const destination = location.state?.from?.pathname || "/app/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || "Failed to log in. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click persona loader for evaluators & judges
  const handleQuickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("password123");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50/50">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-3 shadow-xs">
            E
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Sign In to EDVEXA
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Access your student membership, tickets, and organization tasks
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              College Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@college.edu"
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
            <span>{loading ? "Signing In..." : "Sign In to Workspace"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Personas for Quick Evaluation */}
        <div className="mt-6 pt-5 border-t border-border">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2 text-center">
            Demo Personas (1-Click Fill)
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin("alex.rivera@college.edu")}
              className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-left transition-colors"
            >
              <div className="font-semibold text-foreground">Alex (Admin/Lead)</div>
              <div className="text-[10px] text-muted-foreground truncate">All staff + Student</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("priya.sharma@college.edu")}
              className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-left transition-colors"
            >
              <div className="font-semibold text-foreground">Priya (Gate Staff)</div>
              <div className="text-[10px] text-muted-foreground truncate">QR Check-in scanner</div>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Don't have an account yet?{" "}
          <Link to="/register" className="font-semibold text-teal-600 hover:underline">
            Register as Student
          </Link>
        </div>
      </div>
    </div>
  );
}
