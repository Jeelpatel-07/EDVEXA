import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { eventApi } from "../../api";
import { Calendar, Plus, Trash2, ArrowLeft, Image as ImageIcon } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";

export default function NewEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    category: "Hackathon",
    description: "",
    venue: "",
    startDate: "2026-11-05T09:00",
    endDate: "2026-11-06T18:00",
    capacity: 150,
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80",
    ticketTypes: [
      { id: "tt_new_1", name: "General Admission", price: 10.00, memberPrice: 0.00, available: 100, maxPerOrder: 2 },
    ],
  });
  const [loading, setLoading] = useState(false);

  const handleAddTicketType = () => {
    setFormData({
      ...formData,
      ticketTypes: [
        ...formData.ticketTypes,
        {
          id: "tt_new_" + Date.now(),
          name: "VIP / Fast Pass",
          price: 25.00,
          memberPrice: 15.00,
          available: 30,
          maxPerOrder: 2,
        },
      ],
    });
  };

  const handleRemoveTicketType = (idx) => {
    setFormData({
      ...formData,
      ticketTypes: formData.ticketTypes.filter((_, i) => i !== idx),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await eventApi.createEvent(formData);
      navigate("/app/manage/events");
    } catch (err) {
      alert("Failed to create event: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Manage Events", to: "/app/manage/events" },
          { label: "New Event" },
        ]}
      />

      <PageHeader
        title="Create Campus Event"
        description="Publish a new student organization workshop, symposium, or hackathon with ticketing tiers."
      />

      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-5"
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Event Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. AI & Robotics Campus Showcase 2026"
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl"
            >
              <option value="Hackathon">Hackathon</option>
              <option value="Workshop">Workshop</option>
              <option value="Social">Social</option>
              <option value="Keynote">Keynote</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Description
          </label>
          <textarea
            rows={3}
            required
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Outline agenda, rules, prerequisite knowledge, and speaker lineup."
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Campus Venue / Building
            </label>
            <input
              type="text"
              required
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              placeholder="e.g. Engineering Atrium, Hall B"
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Total Venue Capacity
            </label>
            <input
              type="number"
              min="10"
              required
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: parseInt(e.target.value) })
              }
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl"
            />
          </div>
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

        {/* Ticket Types Definition */}
        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Ticket Passes & Member Subsidies
            </h3>
            <button
              type="button"
              onClick={handleAddTicketType}
              className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Pass Tier</span>
            </button>
          </div>

          {formData.ticketTypes.map((tier, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-50 border border-border grid sm:grid-cols-5 gap-3 items-center text-xs"
            >
              <div className="sm:col-span-2">
                <label className="text-[10px] text-muted-foreground block">Tier Name</label>
                <input
                  type="text"
                  required
                  value={tier.name}
                  onChange={(e) => {
                    const next = [...formData.ticketTypes];
                    next[idx].name = e.target.value;
                    setFormData({ ...formData, ticketTypes: next });
                  }}
                  className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground block">Public Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={tier.price}
                  onChange={(e) => {
                    const next = [...formData.ticketTypes];
                    next[idx].price = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, ticketTypes: next });
                  }}
                  className="w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-teal-700 font-semibold block">Member Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={tier.memberPrice}
                  onChange={(e) => {
                    const next = [...formData.ticketTypes];
                    next[idx].memberPrice = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, ticketTypes: next });
                  }}
                  className="w-full px-2.5 py-1.5 bg-teal-50 border border-teal-200 rounded-lg text-xs font-bold text-teal-900"
                />
              </div>

              <div className="flex items-center justify-end pt-3 sm:pt-0">
                {formData.ticketTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTicketType(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Link
            to="/app/manage/events"
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
            {loading ? "Publishing..." : "Publish Event & Open Registration"}
          </button>
        </div>
      </form>
    </div>
  );
}
