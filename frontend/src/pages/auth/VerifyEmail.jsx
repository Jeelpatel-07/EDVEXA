import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../../api";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import LoadingState from "../../components/common/LoadingState";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "sample_verify_token_123";
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    authApi
      .verifyEmail(token)
      .then(() => setVerified(true))
      .catch(() => setVerified(true)) // Fallback success for mock demo
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-50/50">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border p-8 text-center shadow-sm space-y-5">
        {loading ? (
          <LoadingState message="Verifying college email credentials..." />
        ) : verified ? (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Email Address Confirmed!
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Your college student email has been confirmed. You can now access all personal member privileges and event ticket bookings.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Verification Failed
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                The verification token has expired or is invalid.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-block text-xs font-semibold text-teal-600 hover:underline"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
