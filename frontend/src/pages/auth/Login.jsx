import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Building2,
  Users,
} from "lucide-react";
import { ROLES } from "../../constants/permissions";

export default function Login() {
  const { login, loginAsPersona } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("org.admin@college.edu");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const destination = location.state?.from?.pathname || location.state?.from || "/app/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login({ email, password });
      if (res?.roles?.includes(ROLES.PLATFORM_ADMIN)) {
        navigate("/platform/dashboard", { replace: true });
      } else {
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to log in. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handlePersonaLogin = async (personaKey) => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginAsPersona(personaKey);
      if (res?.roles?.includes(ROLES.PLATFORM_ADMIN) || personaKey === "DEMO_PLATFORM_ADMIN") {
        navigate("/platform/dashboard", { replace: true });
      } else {
        navigate(destination, { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to authenticate demo persona.");
    } finally {
      setLoading(false);
    }
  };

  const demoPersonas = [
    {
      key: "DEMO_PLATFORM_ADMIN",
      title: "Platform Admin",
      desc: "Tenant isolation, org setups, audit trail",
      badge: "PLATFORM",
      color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    },
    {
      key: "DEMO_ORG_ADMIN",
      title: "Org Admin",
      desc: "Full org governance, users & role delegation",
      badge: "ORG ADMIN",
      color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    },
    {
      key: "DEMO_TREASURER",
      title: "Treasurer",
      desc: "Treasury ledger, claim review & reimbursement payouts",
      badge: "TREASURER",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    },
    {
      key: "DEMO_EVENT_MANAGER",
      title: "Event Manager",
      desc: "Events, tickets, products, finance READ-ONLY",
      badge: "EVENT MGR",
      color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    },
    {
      key: "DEMO_GATE_STAFF",
      title: "Gate Staff",
      desc: "Rapid QR scanning & door check-in scanner",
      badge: "GATE STAFF",
      color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    },
    {
      key: "DEMO_VOLUNTEER",
      title: "Volunteer",
      desc: "Assigned duties, task updates, submits claims",
      badge: "VOLUNTEER",
      color: "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100",
    },
    {
      key: "DEMO_MEMBER",
      title: "Active Member",
      desc: "Gold pass active, member pricing & discounts",
      badge: "MEMBER",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    },
    {
      key: "DEMO_GUEST",
      title: "Guest Student",
      desc: "Registered non-member student, standard pricing",
      badge: "GUEST",
      color: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
    },
    {
      key: "DEMO_ORG_ADMIN_TREASURER_MEMBER",
      title: "Admin + Treasurer",
      desc: "Multi-Role: Org Admin + Treasurer authority",
      badge: "MULTI-ROLE",
      color: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
    },
    {
      key: "DEMO_EVENT_MANAGER_VOLUNTEER_MEMBER",
      title: "Event Mgr + Volunteer",
      desc: "Multi-Role: Event management + Volunteer duties",
      badge: "MULTI-ROLE",
      color: "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50/50">
      <div className="w-full max-w-2xl bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-3 shadow-xs">
            E
          </div>
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

        {/* Standard Credentials Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
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
            <span>{loading ? "Authenticating Session..." : "Sign In to Workspace"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Evaluation Personas (Section 21, 45, 46) */}
        <div className="pt-6 border-t border-border">
          <div className="text-center mb-3">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Try EDVEXA Demo (1-Click Authenticated Personas)</span>
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Clicking authenticates an actual backend session with the exact permission matrix and tenant context.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            {demoPersonas.map((p) => (
              <button
                key={p.key}
                type="button"
                disabled={loading}
                onClick={() => handlePersonaLogin(p.key)}
                className={`p-2.5 rounded-xl border text-left transition-all ${p.color}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{p.title}</span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-white/70">
                    {p.badge}
                  </span>
                </div>
                <div className="text-[10px] opacity-80 mt-0.5 leading-snug">
                  {p.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-2">
          Don't have an account yet?{" "}
          <Link to="/register" className="font-semibold text-teal-600 hover:underline">
            Register as Student
          </Link>
        </div>
      </div>
    </div>
  );
}
