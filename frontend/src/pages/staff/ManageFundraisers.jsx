import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fundraiserApi } from "../../api";
import { HandHeart, Plus, Users, DollarSign, ArrowRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";

export default function ManageFundraisers() {
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fundraiserApi
      .getFundraisers()
      .then((data) => setFundraisers(data))
      .finally(() => setLoading(false));
  }, []);

  const handleSimulateDonation = async (id) => {
    await fundraiserApi.donate(id, { amount: 50.00 });
    setFundraisers((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, raisedAmount: f.raisedAmount + 50, donorsCount: f.donorsCount + 1 }
          : f
      )
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Fundraisers & Lab Campaigns"
        description="Community equipment drives and competition travel grant funds."
        action={
          <Link
            to="/app/manage/fundraisers/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Launch Campaign</span>
          </Link>
        }
      />

      {loading ? (
        <LoadingState message="Loading fundraiser drives..." />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {fundraisers.map((f) => {
            const percent = Math.min(100, Math.round((f.raisedAmount / f.goalAmount) * 100));

            return (
              <div
                key={f.id}
                className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img
                      src={f.image}
                      alt={f.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/95 text-foreground text-xs font-bold px-2.5 py-1 rounded-md shadow-2xs">
                        {f.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {f.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {f.description}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-teal-700 text-sm">
                          ${f.raisedAmount.toFixed(2)}{" "}
                          <span className="text-[11px] text-muted-foreground font-normal">
                            raised of ${f.goalAmount.toFixed(2)}
                          </span>
                        </span>
                        <span className="font-bold text-foreground">{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-teal-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                        <span>{f.donorsCount} student contributors</span>
                        <span className="text-emerald-700 font-semibold">Active Campaign</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">
                    ID: {f.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSimulateDonation(f.id)}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-2xs"
                  >
                    Simulate +$50 Contribution
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
