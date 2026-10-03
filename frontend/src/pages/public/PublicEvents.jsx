import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { eventApi } from "../../api";
import { Search, MapPin, Calendar, Clock, Ticket } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";

export default function PublicEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

  useEffect(() => {
    eventApi
      .getEvents()
      .then((data) => setEvents(data))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["ALL", "Hackathon", "Workshop", "Social"];

  const filtered = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === "ALL" || e.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Campus Events & Masterclasses"
        description="Browse upcoming college hackathons, technical workshops, and club orientations. Reserve your seat and check in with your QR pass."
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                category === cat
                  ? "bg-teal-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "ALL" ? "All Events" : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events or venues..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-border rounded-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600"
          />
        </div>
      </div>

      {/* Event Cards Grid */}
      {loading ? (
        <LoadingState message="Fetching campus events..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No events match your criteria"
          description="Try adjusting your keyword search or category filter to discover more campus happenings."
        />
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {filtered.map((event) => {
            const minMemberPrice = Math.min(...(event.ticketTypes?.map((t) => t.memberPrice ?? t.price) || [0]));
            const minStdPrice = Math.min(...(event.ticketTypes?.map((t) => t.price) || [0]));

            return (
              <div
                key={event.id}
                className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs hover:border-teal-300 hover:shadow-md transition-all flex flex-col group"
              >
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/95 backdrop-blur-xs text-foreground text-xs font-bold px-2.5 py-1 rounded-md shadow-2xs">
                      {event.category}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="bg-teal-900/80 text-white text-[11px] font-medium px-2 py-0.5 rounded backdrop-blur-xs">
                      {event.registeredCount}/{event.capacity} Registered
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-foreground group-hover:text-teal-700 transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {event.description}
                    </p>

                    <div className="mt-4 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                        <span>
                          {new Date(event.startDate).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {new Date(event.startDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {new Date(event.endDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-muted-foreground block font-medium">
                        Tickets
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-teal-700">
                          {minMemberPrice === 0 ? "FREE" : `$${minMemberPrice.toFixed(2)}`}
                        </span>
                        {minStdPrice > minMemberPrice && (
                          <span className="text-xs text-slate-400 line-through">
                            ${minStdPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/events/${event.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-2xs"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Book Pass</span>
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
