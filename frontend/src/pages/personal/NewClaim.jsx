import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { claimApi } from "../../api";
import {
  FileSpreadsheet,
  DollarSign,
  UploadCloud,
  ArrowLeft,
  CheckCircle2,
  Info,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";

export default function NewClaim() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    purpose: "",
    category: "Event Refreshments",
    amount: "",
    receiptUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=80",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const categories = [
    "Event Refreshments",
    "Marketing & Print",
    "Lab & Hardware",
    "Logistics & Transport",
    "Office & Stationary",
    "Other",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await claimApi.submitClaim(formData);
      navigate("/app/claims");
    } catch (err) {
      alert("Failed to submit claim: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "My Claims", to: "/app/claims" },
          { label: "New Expense Claim" },
        ]}
      />

      <PageHeader
        title="Submit Reimbursement Claim"
        description="Attach itemized invoices or store receipts for out-of-pocket expenses incurred on official student org duties."
      />

      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-5"
      >
        <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <span>
            The Organization Treasurer reviews claims every Friday. Approved amounts are reimbursed via campus direct deposit and recorded into the public ledger.
          </span>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Expense Purpose / Description
          </label>
          <input
            type="text"
            required
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            placeholder="e.g. Bottled water and snacks for HackEDVEXA volunteer booth"
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Amount Incurred ($ USD)
            </label>
            <div className="relative">
              <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.50"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="45.50"
                className="w-full pl-7 pr-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 font-medium"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Receipt Image or Invoice Link
          </label>
          <input
            type="url"
            required
            value={formData.receiptUrl}
            onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
            placeholder="https://..."
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 font-mono text-slate-600"
          />
          <div className="mt-2 p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-teal-600" />
              <span>Receipt Proof Sample Attached</span>
            </div>
            <a
              href={formData.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="text-teal-600 underline font-medium"
            >
              Preview Receipt
            </a>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Additional Notes for Treasurer (Optional)
          </label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Include any relevant context, store name, or event committee approval."
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
          />
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Link
            to="/app/claims"
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
            {loading ? "Submitting..." : "Submit Claim for Review"}
          </button>
        </div>
      </form>
    </div>
  );
}
