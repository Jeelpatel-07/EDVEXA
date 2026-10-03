import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { orderApi } from "../../api";
import {
  CreditCard,
  Building,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Ticket,
  Package,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import ReservationTimer from "../../components/common/ReservationTimer";
import PaymentStatus from "../../components/common/PaymentStatus";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("CAMPUS_PAY");
  const [processing, setProcessing] = useState(false);

  // Authoritative fetch from backend
  const fetchOrder = async () => {
    try {
      const data = await orderApi.getOrderById(orderId);
      setOrder(data);
      if (data?.totalAmount === 0) {
        setPaymentMethod("MEMBER_BENEFIT");
      }
    } catch (err) {
      setError(err.message || "Failed to load order reservation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handlePay = async () => {
    setProcessing(true);
    try {
      // Send payment confirmation request to backend
      await orderApi.confirmPayment(order.id, {
        method: paymentMethod,
      });

      // Reload backend-authoritative state
      await fetchOrder();
    } catch (err) {
      alert("Payment processing failed: " + (err.message || "Please check credentials"));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <LoadingState message="Loading reservation details..." />;
  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState
          title="Order Not Found"
          message="Could not find the requested order or reservation has expired."
        />
      </div>
    );
  }

  const isPaid = order.status === "PAID";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Orders", to: "/app/orders" },
          { label: `Checkout ${order.orderNumber || order.id}` },
        ]}
      />

      <PageHeader
        title={isPaid ? "Order Confirmed" : "Unified Checkout"}
        description={
          isPaid
            ? "Your payment has been authorized and confirmed by the backend."
            : "Review items and select payment method to finalize order."
        }
      />

      {/* Reservation Timer for Pending Orders */}
      {!isPaid && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
          <ReservationTimer
            initialSeconds={900}
            onExpire={() => {
              alert("Reservation expired. Please re-initiate booking.");
              navigate("/app/dashboard");
            }}
          />
          <span className="text-amber-800 font-medium hidden sm:inline">
            Stock / seat temporarily held by server
          </span>
        </div>
      )}

      {/* Authoritative Payment Status Banner */}
      <PaymentStatus
        status={order.status}
        orderNumber={order.orderNumber || order.id}
      />

      {/* Order Items Review */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Itemized Receipt</h3>
          <span className="text-xs text-muted-foreground">
            Type: <strong className="text-foreground">{order.type}</strong>
          </span>
        </div>

        <div className="divide-y divide-border text-xs">
          {order.items?.map((item, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between">
              <div>
                <span className="font-semibold text-foreground">{item.title}</span>
                {item.variant && (
                  <span className="text-muted-foreground block text-[11px]">
                    Size: {item.variant.size} • Color: {item.variant.color}
                  </span>
                )}
                <span className="text-muted-foreground block text-[11px]">
                  Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}
                </span>
              </div>
              <span className="font-bold text-foreground">
                ${item.subtotal.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-border space-y-1.5 text-xs">
          {order.discountAmount > 0 && (
            <div className="flex items-center justify-between text-teal-700 font-semibold">
              <span>Member Discount Subsidized</span>
              <span>-${order.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm font-extrabold text-foreground pt-2 border-t border-border">
            <span>Total Authoritative Amount</span>
            <span className="text-lg text-teal-700">
              {order.totalAmount === 0 ? "FREE ($0.00)" : `$${order.totalAmount.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Selection and Action (If Not Paid) */}
      {!isPaid ? (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-foreground">
            Select Payment Method
          </h3>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            {order.totalAmount === 0 ? (
              <label
                className={`col-span-2 p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  paymentMethod === "MEMBER_BENEFIT"
                    ? "border-teal-600 bg-teal-50/50 ring-1 ring-teal-600"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "MEMBER_BENEFIT"}
                    onChange={() => setPaymentMethod("MEMBER_BENEFIT")}
                    className="accent-teal-600"
                  />
                  <div>
                    <span className="font-bold text-foreground block">
                      Member Privilege Pass ($0.00)
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Complimentary benefit from student membership tier
                    </span>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
              </label>
            ) : (
              <>
                <label
                  className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    paymentMethod === "CAMPUS_PAY"
                      ? "border-teal-600 bg-teal-50/50 ring-1 ring-teal-600"
                      : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "CAMPUS_PAY"}
                    onChange={() => setPaymentMethod("CAMPUS_PAY")}
                    className="mt-0.5 accent-teal-600"
                  />
                  <div>
                    <span className="font-bold text-foreground block">
                      Campus Student Card
                    </span>
                    <span className="text-muted-foreground text-[11px] block mt-0.5">
                      Deduct from student campus balance (STU-2024-0891)
                    </span>
                  </div>
                </label>

                <label
                  className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    paymentMethod === "STRIPE_CARD"
                      ? "border-teal-600 bg-teal-50/50 ring-1 ring-teal-600"
                      : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "STRIPE_CARD"}
                    onChange={() => setPaymentMethod("STRIPE_CARD")}
                    className="mt-0.5 accent-teal-600"
                  />
                  <div>
                    <span className="font-bold text-foreground block">
                      Debit / Credit Card
                    </span>
                    <span className="text-muted-foreground text-[11px] block mt-0.5">
                      Secure checkout gateway (Visa, Mastercard)
                    </span>
                  </div>
                </label>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>TLS 256-bit Encrypted Transaction</span>
            </span>

            <button
              onClick={handlePay}
              disabled={processing}
              className="py-2.5 px-6 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {processing
                ? "Authorizing..."
                : order.totalAmount === 0
                ? "Claim Free Pass"
                : `Authorize & Pay $${order.totalAmount.toFixed(2)}`}
            </button>
          </div>
        </div>
      ) : (
        /* Confirmed Next Steps */
        <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-foreground">Next Steps</h3>

          {order.type === "TICKET" && (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-teal-900">
                <Ticket className="w-5 h-5 text-teal-700 shrink-0" />
                <span>
                  Your digital gate check-in pass has been issued and stored in your wallet.
                </span>
              </div>
              <Link
                to="/app/tickets"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 text-white font-bold text-xs hover:bg-teal-800 shadow-2xs shrink-0"
              >
                <span>View My Passes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {order.type === "MERCHANDISE" && (
            <div className="p-4 rounded-xl bg-slate-50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Package className="w-5 h-5 text-teal-600 shrink-0" />
                <span>
                  Items reserved! Collect at Student Organization Desk (Room 204).
                </span>
              </div>
              <Link
                to={`/app/orders/${order.id}`}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-2xs shrink-0"
              >
                <span>View Pickup Slip</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {order.type === "MEMBERSHIP" && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>
                  Membership tier unlocked! 20% discounts are active on your account.
                </span>
              </div>
              <Link
                to="/app/membership"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-teal-700 text-white font-bold text-xs hover:bg-teal-800 shadow-2xs shrink-0"
              >
                <span>Go to Membership</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
