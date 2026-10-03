import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../api";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50/50">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 shadow-sm">
        {submitted ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Check your email
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If an account with <strong>{email}</strong> exists in the student organization registry, a reset link will be sent. Open that email to continue.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-block py-2.5 px-4 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Reset Password
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your registered college email to receive recovery instructions
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                {loading ? "Sending link..." : "Send Reset Link"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-teal-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
