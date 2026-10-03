import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { announcementApi } from "../../api";
import { Megaphone, Search, Pin, Calendar, User, ArrowRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";
import StatusBadge from "../../components/common/StatusBadge";

export default function PublicAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    announcementApi
      .getAnnouncements()
      .then((data) => setAnnouncements(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = announcements.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Organization Announcements"
        description="Official updates, senate executive briefings, meeting notices, and community dispatches."
      />

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search announcements..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-card border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
        />
      </div>

      {loading ? (
        <LoadingState message="Fetching bulletins..." />
      ) : filtered.length === 0 ? (
        <EmptyState title="No announcements found" />
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-6 rounded-2xl bg-card border transition-all hover:border-teal-300 shadow-2xs ${
                item.pinned ? "border-teal-200 bg-teal-50/20" : "border-border"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  {item.pinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                      <Pin className="w-3 h-3 fill-current" />
                      Pinned Bulletin
                    </span>
                  )}
                  <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {item.category}
                  </span>
                  <StatusBadge status={item.priority} />
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.author}</span>
                  </div>
                </div>
              </div>

              <h2 className="text-lg font-bold text-foreground">
                <Link
                  to={`/announcements/${item.id}`}
                  className="hover:text-teal-700 transition-colors"
                >
                  {item.title}
                </Link>
              </h2>

              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {item.content}
              </p>

              <div className="mt-4 pt-3 border-t border-border flex justify-end">
                <Link
                  to={`/announcements/${item.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  <span>Read Full Notice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
