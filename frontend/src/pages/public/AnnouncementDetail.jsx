import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { announcementApi } from "../../api";
import { Calendar, User, ArrowLeft, Pin, Share2 } from "lucide-react";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";

export default function AnnouncementDetail() {
  const { announcementId } = useParams();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    announcementApi
      .getAnnouncementById(announcementId)
      .then((data) => setAnnouncement(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [announcementId]);

  if (loading) return <LoadingState message="Loading announcement..." />;
  if (error || !announcement) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <ErrorState
          title="Announcement Not Found"
          message="The requested announcement may have been archived or removed."
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs
        items={[
          { label: "Announcements", to: "/announcements" },
          { label: announcement.title },
        ]}
      />

      <article className="bg-card rounded-2xl border border-border p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {announcement.pinned && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-100 px-2.5 py-1 rounded">
              <Pin className="w-3.5 h-3.5 fill-current" />
              Pinned Notice
            </span>
          )}
          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
            {announcement.category}
          </span>
          <StatusBadge status={announcement.priority} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          {announcement.title}
        </h1>

        <div className="flex flex-wrap items-center gap-6 py-3 border-y border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" />
            <span className="font-semibold text-foreground">{announcement.author}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>
              Published on{" "}
              {new Date(announcement.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed text-slate-700 space-y-4">
          <p>{announcement.content}</p>
        </div>

        <div className="pt-6 border-t border-border flex items-center justify-between">
          <Link
            to="/announcements"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Announcements</span>
          </Link>
        </div>
      </article>
    </div>
  );
}
