import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { membershipApi } from "../../api";
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";

export default function Membership() {
  const { membership } = useAuth();
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    membershipApi.getPlans().then((data) => setPlans(data));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Organization Membership"
        description="View your active tier privileges, discount percentages, and renewal terms."
        action={
          <Link
            to="/app/membership/plans"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
          >
            <span>Browse All Plans</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        }
      />

      {membership ? (
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <StatusBadge status={membership.status} />
                <StatusBadge status={membership.tier} />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {membership.planName}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Membership Code: {membership.id}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/app/membership/renew"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Renew Membership</span>
              </Link>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 py-6 border-b border-border">
            <div>
              <span className="text-xs text-muted-foreground block font-medium">
                Member Discount
              </span>
              <span className="text-2xl font-extrabold text-teal-700">
                {membership.memberDiscountPercent}% OFF
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Applied automatically at checkout
              </span>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block font-medium">
                Expiration Date
              </span>
              <span className="text-lg font-bold text-foreground">
                {membership.expiryDate}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">
                Current term in good standing
              </span>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block font-medium">
                Auto-Renewal
              </span>
              <span className="text-lg font-bold text-foreground">
                {membership.autoRenew ? "Enabled" : "Disabled"}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Manage payment source
              </span>
            </div>
          </div>

          <div className="pt-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground">
              Included Tier Privileges
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>20% member pricing discount on all campus event tickets</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>20% discount on official merchandise & kits</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Priority registration 24 hours before general student public</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Voting rights in student executive council elections</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            No Active Membership Found
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-5">
            You are currently registered as a standard student. Upgrade to access subsidized ticket pricing and priority workshop access.
          </p>
          <Link
            to="/app/membership/plans"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs"
          >
            <span>Choose a Membership Plan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
