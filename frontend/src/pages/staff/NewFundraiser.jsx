import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fundraiserApi } from "../../api";
import { HandHeart, ArrowLeft } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";

export default function NewFundraiser() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    category: "Lab Equipment",
    goalAmount: 2500.00,
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fundraiserApi.createFundraiser({
        ...formData,
        goalAmount: parseFloat(formData.goalAmount),
      });
      navigate("/app/manage/fundraisers");
    } catch (err) {
      alert("Failed to create campaign: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Fundraisers", to: "/app/manage/fundraisers" },
          { label: "New Campaign" },
        ]}
      />

      <PageHeader
        title="Launch Student Organization Drive"
        description="Establish a fundraising goal for lab hardware, competition travel grants, or community initiatives."
      />

      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-5"
      >
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Drive Title
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Open Lab Electronics Soldering Stations Drive"
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30"
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
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl"
            >
              <option value="Lab Equipment">Lab Equipment</option>
              <option value="Travel Grant">Travel Grant</option>
              <option value="Hackathon Prizes">Hackathon Prizes</option>
              <option value="Charity & Community">Charity & Community</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Fundraising Target Goal ($ USD)
            </label>
            <input
              type="number"
              step="50"
              min="100"
              required
              value={formData.goalAmount}
              onChange={(e) => setFormData({ ...formData, goalAmount: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl font-bold"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Campaign Narrative / Purpose
          </label>
          <textarea
            rows={4}
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Explain how funds will benefit student members and collegiate projects."
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Banner Image URL
          </label>
          <input
            type="url"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl font-mono text-slate-600"
          />
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Link
            to="/app/manage/fundraisers"
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
            {loading ? "Launching..." : "Launch Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}
