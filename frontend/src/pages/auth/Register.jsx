import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../api";
import { User, Mail, Lock, IdCard, Building2, ArrowRight, CheckCircle2, AlertCircle, Check, X } from "lucide-react";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    studentId: "",
    joinCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Password Rules Checklist
  const passwordRules = useMemo(() => {
    const p = formData.password;
    return [
      { label: "At least 8 characters", met: p.length >= 8 },
      { label: "Contains uppercase letter", met: /[A-Z]/.test(p) },
      { label: "Contains lowercase letter", met: /[a-z]/.test(p) },
      { label: "Contains number", met: /[0-9]/.test(p) },
      { label: "Contains special character", met: /[^A-Za-z0-9]/.test(p) },
    ];
  }, [formData.password]);

  const allRulesMet = passwordRules.every((r) => r.met);
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.studentId.trim() && !formData.joinCode.trim()) {
      setError("Add an organization join code when supplying a student ID.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    if (!allRulesMet) {
      setError("Please ensure your password meets all security requirements.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Strictly pass normal fields only - no role field (R4)
      await authApi.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        studentId: formData.studentId ? formData.studentId.trim() : undefined,
        joinCode: formData.joinCode ? formData.joinCode.trim() : undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Registration failed. Please check your information.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50/50">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Check Your Email
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If this request is eligible, a verification email will be sent to <strong>{formData.email}</strong>. Open the link in your inbox to verify your account.
          </p>
          <div className="pt-4">
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50/50">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Register as Student
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Create an EDVEXA student account to access events, store, and memberships
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Note per Section 10b */}
        <div className="mb-4 p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-800">
          <strong>Note:</strong> Club officers are added by your organization admin.
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Rohan Sharma"
                className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@college.edu"
                className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                University ID <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={(e) =>
                    setFormData({ ...formData, studentId: e.target.value })
                  }
                  placeholder="STU-2026-001"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Org Code <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.joinCode}
                  onChange={(e) =>
                    setFormData({ ...formData, joinCode: e.target.value })
                  }
                  placeholder="EDVEXA26"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 uppercase"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Create Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Strong password"
                className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
              />
            </div>

            {/* Rules Checklist */}
            <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
              <span className="font-semibold text-slate-700 block text-[10px] uppercase tracking-wider">
                Password Rules:
              </span>
              {passwordRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  {rule.met ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className={rule.met ? "text-emerald-700 font-medium" : "text-slate-500"}>
                    {rule.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="Repeat password"
                className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
              />
            </div>
            {formData.confirmPassword && !passwordsMatch && (
              <p className="text-[11px] text-rose-600 mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !passwordsMatch || !allRulesMet}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <span>{loading ? "Registering..." : "Create Student Account"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-teal-600 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
