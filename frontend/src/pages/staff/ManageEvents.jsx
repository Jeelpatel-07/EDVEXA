import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventApi } from "../../api";
import { Calendar, Plus, QrCode, ArrowRight, MapPin, Users } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";

export default function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventApi
      .getEvents()
      .then((data) => setEvents(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Event Operations & Capacity Management"
        description="Configure ticket tiers, member pricing rules, gate scanners, and venue capacities."
        action={
          <Link
            to="/app/manage/events/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        }
      />

      {loading ? (
        <LoadingState message="Loading events..." />
      ) : (
        <div className="space-y-4">
          {events.map((e) => {
            const percent = Math.min(100, Math.round((e.registeredCount / e.capacity) * 100));

            return (
              <div
                key={e.id}
                className="bg-card rounded-2xl border border-border p-6 shadow-xs hover:border-teal-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={e.image}
                    alt={e.title}
                    className="w-20 h-20 rounded-xl object-cover border border-border shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {e.category}
                      </span>
                      <StatusBadge status={e.status} />
                    </div>
                    <h3 className="font-bold text-base text-foreground">
                      {e.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(e.startDate).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{e.venue}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
                  <div className="w-44 text-right">
                    <span className="text-xs font-bold text-foreground">
                      {e.registeredCount} / {e.capacity} Spots
                    </span>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                      <div
                        className="bg-teal-600 h-2 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 block">
                      {percent}% Capacity Booked
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/app/manage/check-in?eventId=${e.id}`}
                      className="px-3 py-1.5 rounded-lg border border-teal-600 text-teal-700 bg-teal-50 text-xs font-bold hover:bg-teal-100 flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Gate Scan</span>
                    </Link>
                    <Link
                      to={`/app/manage/events/${e.id}`}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-2xs flex items-center gap-1"
                    >
                      <span>Configure</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
