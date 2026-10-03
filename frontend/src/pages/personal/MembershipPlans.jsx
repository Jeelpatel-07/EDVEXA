import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { membershipApi } from "../../api";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import LoadingState from "../../components/common/LoadingState";

export default function MembershipPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    membershipApi
      .getPlans()
      .then((data) => setPlans(data))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPlan = async (planId) => {
    setJoiningId(planId);
    try {
      // Backend creates membership purchase order
      const result = await membershipApi.joinPlan(planId);
      // Route through shared checkout flow
      navigate(`/app/checkout/${result.orderId || "ord_mem_" + planId}`);
    } catch (err) {
      alert("Failed to initiate membership order: " + err.message);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Membership", to: "/app/membership" },
          { label: "Plans & Tiers" },
        ]}
      />

      <PageHeader
        title="Student Membership Plans"
        description="Choose a membership tier that matches your academic goals and collegiate involvement."
      />

      {loading ? (
        <LoadingState message="Loading membership tiers..." />
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 bg-card border flex flex-col justify-between transition-all ${
                plan.isPopular
                  ? "border-teal-500 shadow-md ring-2 ring-teal-500/20"
                  : "border-border shadow-xs hover:border-teal-200"
              }`}
            >
              <div>
                {plan.isPopular && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wider mb-3">
                    <Sparkles className="w-3 h-3" />
                    Recommended by Senate
                  </div>
                )}

                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">
                    ${plan.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {plan.durationMonths} months
                  </span>
                </div>

                <div className="mt-2 text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded inline-block">
                  {plan.discountPercent}% Discount on Event Tickets & Merch
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={joiningId === plan.id}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    plan.isPopular
                      ? "bg-teal-600 text-white hover:bg-teal-700 shadow-xs"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                >
                  <span>
                    {joiningId === plan.id ? "Creating Order..." : `Select ${plan.name}`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
