import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { membershipApi } from "../../api";
import { RefreshCw, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";

export default function MembershipRenew() {
  const { membership } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleRenew = async () => {
    setLoading(true);
    try {
      const order = await membershipApi.renewMembership(membership?.id || "mem_01");
      navigate(`/app/checkout/${order.orderId}`);
    } catch (err) {
      alert("Renewal initialization failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Membership", to: "/app/membership" },
          { label: "Renew Membership" },
        ]}
      />

      <PageHeader
        title="Renew Student Membership"
        description="Extend your organization status for another 12-month academic term."
      />

      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-teal-800 font-semibold uppercase tracking-wider block">
              Current Plan
            </span>
            <h3 className="text-lg font-bold text-teal-950">
              {membership?.planName || "Annual Gold Member"}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-teal-700">$35.00</span>
            <span className="text-[11px] text-teal-800 block">/ 12 Months</span>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Retain 20% discount on all ticket purchases</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Maintain active voting rights in student senate</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Complimentary welcome gift and badge stickers</span>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
          <Link
            to="/app/membership"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>

          <button
            onClick={handleRenew}
            disabled={loading}
            className="py-2.5 px-6 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Processing..." : "Proceed to Checkout ($35.00)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
