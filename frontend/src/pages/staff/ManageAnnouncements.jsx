import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { announcementApi } from "../../api";
import { Megaphone, Plus, Pin, Calendar, Trash2, ArrowRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";

export default function ManageAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = () => {
    announcementApi
      .getAnnouncements()
      .then((data) => setAnnouncements(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleDelete = async (id) => {
    if (confirm("Delete this announcement notice?")) {
      await announcementApi.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Broadcasts & Bulletins"
        description="Publish announcements to student portal and public website feeds."
        action={
          <Link
            to="/app/manage/announcements/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Announcement</span>
          </Link>
        }
      />

      {loading ? (
        <LoadingState message="Fetching bulletins..." />
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {item.pinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                      <Pin className="w-3 h-3 fill-current" />
                      Pinned
                    </span>
                  )}
                  <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {item.category}
                  </span>
                  <StatusBadge status={item.priority} />
                </div>
                <h3 className="font-bold text-sm text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {item.content}
                </p>
                <div className="mt-2 text-[11px] text-slate-400">
                  By {item.author} • {new Date(item.publishedAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/announcements/${item.id}`}
                  className="px-3 py-1.5 rounded-lg border border-border bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Preview
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  title="Delete notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
