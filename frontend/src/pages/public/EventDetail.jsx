import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { eventApi, ticketApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  Ticket,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";

export default function EventDetail() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, membership } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    eventApi
      .getEventById(eventId)
      .then((data) => {
        setEvent(data);
        if (data?.ticketTypes?.length > 0) {
          setSelectedTicketId(data.ticketTypes[0].id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <LoadingState message="Loading event details..." />;
  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <ErrorState
          title="Event Not Found"
          message="Could not find the requested event or it has been archived."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const selectedTicket = event.ticketTypes?.find((t) => t.id === selectedTicketId);
  const isMember = !!membership && membership.status === "ACTIVE";
  const unitPrice = selectedTicket
    ? isMember && selectedTicket.memberPrice !== undefined
      ? selectedTicket.memberPrice
      : selectedTicket.price
    : 0;
  const totalPrice = unitPrice * quantity;

  const handleBookTicket = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/events/${eventId}` } });
      return;
    }

    setBookingLoading(true);
    try {
      // Backend calculates price, creates reservation, and issues order
      const order = await ticketApi.bookTicket({
        eventId: event.id,
        ticketTypeId: selectedTicketId,
        quantity,
      });

      // Navigate to shared checkout with newly created order
      navigate(`/app/checkout/${order.id}`);
    } catch (err) {
      alert("Failed to reserve ticket: " + (err.message || "Please try again"));
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs
        items={[
          { label: "Campus Events", to: "/events" },
          { label: event.title },
        ]}
      />

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Event details */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-xs">
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-72 sm:h-96 object-cover"
            />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold px-3 py-1 rounded-full">
                  {event.category}
                </span>
                <span className="text-xs text-muted-foreground">
                  {event.registeredCount} of {event.capacity} seats reserved
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {event.title}
              </h1>

              <div className="grid sm:grid-cols-2 gap-4 my-6 p-4 rounded-xl bg-slate-50 border border-border text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                  <div>
                    <span className="font-semibold block text-foreground">Date</span>
                    <span>
                      {new Date(event.startDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                  <div>
                    <span className="font-semibold block text-foreground">Time</span>
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
                </div>

                <div className="flex items-center gap-2.5 sm:col-span-2">
                  <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                  <div>
                    <span className="font-semibold block text-foreground">Venue</span>
                    <span>{event.venue}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-foreground">About This Event</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {event.description}
                </p>
                <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-teal-900">
                    <strong className="font-semibold">Gate Check-in Requirement:</strong> All attendees must present their digital QR pass inside the EDVEXA mobile app or web portal at the door. Passes are non-transferable once scanned.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Reservation Card */}
        <div className="lg:col-span-4">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm sticky top-24 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Reserve Pass</h3>
                <Ticket className="w-5 h-5 text-teal-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Instant digital QR issuance upon payment confirmation
              </p>
            </div>

            {/* Member discount reminder */}
            {isMember ? (
              <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Gold Member Benefit: Special pricing applied automatically.</span>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <span>Want free passes and 20% discounts?</span>
                <Link to="/app/membership/plans" className="font-bold underline text-amber-950">
                  Join Member
                </Link>
              </div>
            )}

            {/* Ticket Types Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Select Ticket Tier
              </label>
              {event.ticketTypes?.map((ticket) => {
                const isSelected = selectedTicketId === ticket.id;
                const effectivePrice = isMember && ticket.memberPrice !== undefined
                  ? ticket.memberPrice
                  : ticket.price;

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? "border-teal-600 bg-teal-50/40 ring-1 ring-teal-600"
                        : "border-border hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>{ticket.name}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-teal-700">
                          {effectivePrice === 0 ? "FREE" : `$${effectivePrice.toFixed(2)}`}
                        </span>
                        {ticket.price > effectivePrice && (
                          <span className="text-[10px] text-slate-400 line-through ml-1.5">
                            ${ticket.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{ticket.available} spots left</span>
                      <span>Max {ticket.maxPerOrder} per student</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quantity Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                Quantity
              </label>
              <div className="flex items-center border border-border rounded-lg bg-slate-50 w-32">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-9 flex items-center justify-center text-foreground hover:bg-slate-200 rounded-l-lg font-bold"
                >
                  -
                </button>
                <div className="flex-1 text-center font-bold text-sm text-foreground">
                  {quantity}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) =>
                      Math.min(selectedTicket?.maxPerOrder || 4, q + 1)
                    )
                  }
                  className="w-10 h-9 flex items-center justify-center text-foreground hover:bg-slate-200 rounded-r-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total breakdown */}
            <div className="pt-4 border-t border-border space-y-2 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal ({quantity} tickets)</span>
                <span>${(selectedTicket?.price * quantity).toFixed(2)}</span>
              </div>
              {isMember && selectedTicket?.price > unitPrice && (
                <div className="flex items-center justify-between text-teal-700 font-semibold">
                  <span>Member Benefit Savings</span>
                  <span>-${((selectedTicket.price - unitPrice) * quantity).toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
                <span>Total Due</span>
                <span className="text-lg text-teal-700">
                  {totalPrice === 0 ? "FREE" : `$${totalPrice.toFixed(2)}`}
                </span>
              </div>
            </div>

            <button
              onClick={handleBookTicket}
              disabled={bookingLoading || !selectedTicket || selectedTicket.available <= 0}
              className="w-full py-3 px-4 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {bookingLoading
                ? "Reserving Seat..."
                : totalPrice === 0
                ? "Claim Free Ticket"
                : "Reserve & Proceed to Checkout"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
