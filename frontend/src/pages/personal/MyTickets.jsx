import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ticketApi } from "../../api";
import { Ticket, Calendar, MapPin, QrCode, ArrowRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketApi
      .getMyTickets()
      .then((data) => setTickets(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Event Passes & Tickets"
        description="All digital tickets issued to your student account with QR gate check-in codes."
        action={
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
          >
            <span>Book New Tickets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {loading ? (
        <LoadingState message="Fetching your tickets..." />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No tickets found"
          description="You have not booked any event passes yet. Browse upcoming campus events to get started."
          actionLabel="Browse Events"
          actionLink="/events"
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="bg-card rounded-2xl border border-border p-6 shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="font-mono text-xs text-muted-foreground">
                    {t.ticketNumber}
                  </span>
                  <StatusBadge status={t.status} />
                </div>

                <div className="mt-4">
                  <h3 className="text-base font-bold text-foreground">
                    {t.eventTitle}
                  </h3>
                  <div className="mt-1 text-xs font-semibold text-teal-700">
                    {t.ticketTypeName} • ${t.pricePaid.toFixed(2)}
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>{new Date(t.eventDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{t.venue}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  Attendee: {t.holderName}
                </span>
                <Link
                  to={`/app/tickets/${t.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-50 text-teal-800 text-xs font-semibold hover:bg-teal-100 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>View QR Pass</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
