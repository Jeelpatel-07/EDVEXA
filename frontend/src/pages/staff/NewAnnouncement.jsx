import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { announcementApi } from "../../api";
import { Megaphone, ArrowLeft } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";

export default function NewAnnouncement() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    category: "Events",
    priority: "NORMAL",
    pinned: false,
    content: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await announcementApi.createAnnouncement(formData);
      navigate("/app/manage/announcements");
    } catch (err) {
      alert("Failed to publish: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Announcements", to: "/app/manage/announcements" },
          { label: "New Bulletin" },
        ]}
      />

      <PageHeader
        title="Publish Campus Announcement"
        description="Broadcast notices directly to students across the web and workspace apps."
      />

      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-5"
      >
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Announcement Headline
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Hackathon Team Registrations Now Open"
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
              <option value="Events">Events</option>
              <option value="General">General</option>
              <option value="Volunteers">Volunteers</option>
              <option value="Elections">Elections</option>
              <option value="Treasury">Treasury</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Broadcast Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl"
            >
              <option value="NORMAL">Normal Priority</option>
              <option value="HIGH">High Priority (Urgent Alert)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Bulletin Body Content
          </label>
          <textarea
            rows={5}
            required
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Full narrative, instructions, links, or council meeting agenda."
            className="w-full px-3.5 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={formData.pinned}
              onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
              className="rounded accent-teal-600"
            />
            <span>Pin bulletin to top of public announcements feed</span>
          </label>
        </div>

        <div className="pt-4 border-t border-border flex items-center justify-between">
          <Link
            to="/app/manage/announcements"
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
            {loading ? "Publishing..." : "Broadcast Announcement"}
          </button>
        </div>
      </form>
    </div>
  );
}
