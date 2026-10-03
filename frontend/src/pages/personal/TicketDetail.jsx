import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ticketApi } from "../../api";
import {
  Calendar,
  MapPin,
  User,
  ShieldCheck,
  CheckCircle2,
  Printer,
  ArrowLeft,
  Share2,
} from "lucide-react";
import QRCode from "../../components/common/QRCode";
import StatusBadge from "../../components/common/StatusBadge";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";

export default function TicketDetail() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    ticketApi
      .getTicketById(ticketId)
      .then((data) => setTicket(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) return <LoadingState message="Retrieving digital QR ticket..." />;
  if (error || !ticket) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState
          title="Ticket Not Found"
          message="Could not locate the requested pass in the organization database."
        />
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "My Tickets", to: "/app/tickets" },
          { label: ticket.ticketNumber },
        ]}
      />

      {/* Ticket Pass Container */}
      <div className="bg-card rounded-3xl border border-border shadow-md overflow-hidden relative print:border-none print:shadow-none">
        {/* Pass Header Banner */}
        <div className="bg-teal-700 text-white p-6 sm:p-8 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest font-extrabold text-teal-200">
              Collegiate Student Council Pass
            </span>
            <span className="bg-white/20 backdrop-blur-xs text-white text-xs px-2.5 py-0.5 rounded-full font-mono">
              {ticket.ticketNumber}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black mt-3 leading-tight text-white">
            {ticket.eventTitle}
          </h2>
          <div className="mt-2 text-xs text-teal-100 font-medium">
            Tier: {ticket.ticketTypeName} • Paid: ${ticket.pricePaid.toFixed(2)}
          </div>
        </div>

        {/* Notched perforated divider */}
        <div className="relative h-6 bg-card flex items-center justify-between">
          <div className="w-5 h-5 rounded-full bg-background -ml-2.5 border border-border" />
          <div className="flex-1 border-b border-dashed border-slate-300 mx-2" />
          <div className="w-5 h-5 rounded-full bg-background -mr-2.5 border border-border" />
        </div>

        {/* QR Code and Attendee Details */}
        <div className="p-6 sm:p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <QRCode value={ticket.qrCode} size={190} />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Authorized Pass Holder
            </div>
            <div className="text-base font-bold text-foreground">
              {ticket.holderName}
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              {ticket.holderStudentId} • {ticket.holderEmail}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left p-4 rounded-xl bg-slate-50 border border-border text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Event Date</span>
              <span className="font-semibold text-foreground">
                {new Date(ticket.eventDate).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Status</span>
              <StatusBadge status={ticket.status} />
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground block text-[11px]">Venue</span>
              <span className="font-semibold text-foreground truncate block">
                {ticket.venue}
              </span>
            </div>
          </div>

          {ticket.status === "CHECKED_IN" && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Checked in at {new Date(ticket.checkedInAt).toLocaleTimeString()}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-border text-[11px] text-muted-foreground flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Cryptographically sealed & verifiable by Gate Staff scanner</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-border flex items-center justify-between print:hidden">
          <Link
            to="/app/tickets"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Tickets</span>
          </Link>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Pass</span>
          </button>
        </div>
      </div>
    </div>
  );
}
