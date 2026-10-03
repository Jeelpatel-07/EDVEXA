import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { financeApi } from "../../api";
import { DollarSign, ArrowLeft, CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";

export default function NewLedgerEntry() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    type: "INCOME",
    source: "Manual income",
    description: "",
    amount: "",
    ref: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);

  const sources = [
    "Manual income",
    "Memberships",
    "Tickets",
    "Merchandise",
    "Fundraiser income",
    "Vendor",
    "Equipment & Supplies",
    "Event Refreshments",
    "Other expenses",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await financeApi.createEntry(formData);
      navigate("/app/manage/finance");
    } catch (err) {
      alert("Failed to record entry: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Finance & Treasury", to: "/app/manage/finance" },
          { label: "New Ledger Entry" },
        ]}
      />

      <PageHeader
        title="Record Accounting Entry"
        description="Manually record student senate appropriations, external sponsorship grants, or vendor payments."
      />

      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-5"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Transaction Classification
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl font-bold"
            >
              <option value="INCOME">INCOME (Credits Treasury +)</option>
              <option value="EXPENSE">EXPENSE (Debits Treasury -)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Account Source / Category
            </label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl"
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Transaction Narrative / Description
          </label>
          <input
            type="text"
            required
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="e.g. Dean of Students hackathon sponsorship grant"
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Amount ($ USD)
            </label>
            <div className="relative">
              <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="250.00"
                className="w-full pl-7 pr-3 py-2 text-xs bg-card border border-border rounded-xl font-bold text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Reference / Invoice Number
            </label>
            <input
              type="text"
              value={formData.ref}
              onChange={(e) => setFormData({ ...formData, ref: e.target.value })}
              placeholder="e.g. GRANT-2026-04"
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl font-mono text-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Posting Date
          </label>
          <input
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl text-slate-700"
          />
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Link
            to="/app/manage/finance"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel</span>
          </Link>

          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-6 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            {loading ? "Recording..." : "Post to Organization Ledger"}
          </button>
        </div>
      </form>
    </div>
  );
}
