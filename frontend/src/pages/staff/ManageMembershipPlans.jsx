import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { membershipApi } from "../../api";
import { CreditCard, CheckCircle2, Plus, ArrowLeft } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import LoadingState from "../../components/common/LoadingState";

export default function ManageMembershipPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    membershipApi
      .getPlans()
      .then((data) => setPlans(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Members", to: "/app/manage/members" },
          { label: "Membership Plans" },
        ]}
      />

      <PageHeader
        title="Membership Plan Configuration"
        description="Configure duration terms, student pricing, and discount rules across membership tiers."
      />

      {loading ? (
        <LoadingState message="Loading plan tiers..." />
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className="bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                    Tier: {p.tier}
                  </span>
                  {p.isPopular && (
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                      Featured
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-foreground mt-3">{p.name}</h3>

                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">
                    ${p.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {p.durationMonths} months
                  </span>
                </div>

                <div className="mt-3 text-xs font-semibold text-teal-800 bg-teal-50 p-2 rounded-lg border border-teal-100">
                  {p.discountPercent}% Subsidized Discount on All Passes & Merch
                </div>

                <ul className="mt-4 space-y-2 text-xs text-slate-700">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>Plan ID: {p.id}</span>
                <span className="text-emerald-700 font-semibold">Active Tier</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
