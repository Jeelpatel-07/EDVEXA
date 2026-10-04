import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { orderApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import {
  CreditCard,
  Building,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Ticket,
  Package,
  Wallet,
  Receipt,
  RotateCcw,
  Check,
  QrCode,
  User,
  Mail,
  Hash,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import ReservationTimer from "../../components/common/ReservationTimer";
import PaymentStatus from "../../components/common/PaymentStatus";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import QRCode from "../../components/common/QRCode";

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, membership } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payment states: IDLE | PROCESSING | SUCCESS | FAILED
  const [paymentState, setPaymentState] = useState("IDLE");
  const [paymentMethod, setPaymentMethod] = useState("CAMPUS_PAY");
  const [simulationResult, setSimulationResult] = useState("SUCCESS"); // SUCCESS | FAILED
  const [paymentErrorMessage, setPaymentErrorMessage] = useState("");

  // Authoritative fetch from backend
  const fetchOrder = async () => {
    try {
      const data = await orderApi.getOrderById(orderId);
      setOrder(data);
      if (data?.totalAmount === 0 || data?.total === 0) {
        setPaymentMethod("MEMBER_BENEFIT");
      }
      if (data?.status === "PAID") {
        setPaymentState("SUCCESS");
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
    setPaymentState("PROCESSING");
    setPaymentErrorMessage("");

    // If simulating failure in Sandbox mode
    if (paymentMethod === "DEMO_PAY" && simulationResult === "FAILED") {
      setTimeout(() => {
        setPaymentState("FAILED");
        setPaymentErrorMessage("Transaction declined: Simulated bank authorization rejection (Demo Mode).");
      }, 900);
      return;
    }

    try {
      // Authoritative payment call to backend
      const resolvedMethod = paymentMethod === "CAMPUS_PAY" ? "CAMPUS_CARD" : paymentMethod;
      await orderApi.confirmPayment(order.id, {
        method: resolvedMethod,
      });

      // Reload verified backend-authoritative state
      await fetchOrder();
      setPaymentState("SUCCESS");
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Payment authorization failed.";
      setPaymentState("FAILED");
      setPaymentErrorMessage(msg);
    }
  };

  if (loading) return <LoadingState message="Loading reservation details..." />;

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-4">
        <ErrorState
          title="Order Not Found"
          message="Could not find the requested order or reservation has expired."
        />
        <div className="text-center">
          <Link
            to="/app/shop"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Merchandise</span>
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.status === "PAID" || paymentState === "SUCCESS";
  const isMerch = order.type === "MERCH" || order.type === "MERCHANDISE" || order.order_type === "MERCH";
  const orderTotal = Number(order.totalAmount ?? order.total ?? 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Orders", to: "/app/orders" },
          { label: `Checkout ${order.orderNumber || order.id}` },
        ]}
      />

      <PageHeader
        title={isPaid ? "Order Confirmed" : "Secure Campus Checkout"}
        description={
          isPaid
            ? "Your payment has been authorized and verified by the backend."
            : "Review customer information, items, and select payment method to finalize order."
        }
      />

      {/* Reservation Timer for Pending Orders */}
      {!isPaid && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs shadow-2xs">
          <ReservationTimer
            initialSeconds={900}
            onExpire={() => {
              alert("Reservation expired. Please re-select items.");
              navigate("/app/shop");
            }}
          />
          <span className="text-amber-800 font-medium hidden sm:inline">
            Inventory temporarily locked by server
          </span>
        </div>
      )}

      {/* Payment State Banners */}
      {paymentState === "FAILED" && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2 animate-shake">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-rose-950">Payment Failed</h4>
              <p>
                {paymentErrorMessage || "Your account was not charged. You can retry with another method or try again."}
              </p>
            </div>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => {
                setPaymentState("IDLE");
                setPaymentErrorMessage("");
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <Link
              to="/app/cart"
              className="text-slate-600 hover:text-slate-900 font-medium underline"
            >
              Return to Cart
            </Link>
          </div>
        </div>
      )}

      {isPaid && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black">
              ✓
            </div>
            <div>
              <h3 className="font-extrabold text-base text-emerald-900">
                Payment Successful!
              </h3>
              <p className="text-emerald-800 font-mono">
                Order #{order.orderNumber || order.id}
              </p>
            </div>
          </div>
          <p className="text-emerald-900 pl-12">
            Your merchandise reservation is officially confirmed. Present the pickup QR code below at Student Organization Desk (Room 204) to collect your items.
          </p>
        </div>
      )}

      {/* Customer Information (Pre-filled from Profile) */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-teal-600" />
          <span>Customer & Student Details</span>
        </h3>
        <div className="grid sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-border">
            <span className="text-[10px] text-muted-foreground block font-semibold">Student Name</span>
            <span className="font-bold text-foreground mt-0.5 block truncate">
              {user?.full_name || user?.name || "Campus Student"}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-border">
            <span className="text-[10px] text-muted-foreground block font-semibold">Registered Email</span>
            <span className="font-bold text-foreground mt-0.5 block truncate">
              {user?.email || "student@edvexa.edu"}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-border">
            <span className="text-[10px] text-muted-foreground block font-semibold">Student Account ID</span>
            <span className="font-bold text-foreground font-mono mt-0.5 block">
              {user?.student_id || `STU-${String(user?.id || "2026").slice(0, 8).toUpperCase()}`}
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Order Receipt */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-600" />
            <span>Itemized Order Summary</span>
          </h3>
          <span className="text-xs text-muted-foreground">
            Type: <strong className="text-foreground">{isMerch ? "Campus Merchandise" : order.type}</strong>
          </span>
        </div>

        <div className="divide-y divide-border text-xs">
          {order.items?.map((item, idx) => {
            const unitPrice = Number(item.unitPrice || item.unit_price || 0);
            const qty = Number(item.quantity || 1);
            const lineTotal = Number(item.subtotal || item.totalPrice || unitPrice * qty);

            return (
              <div key={idx} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-foreground">{item.title || item.name}</span>
                  {(item.size || item.color || item.variant) && (
                    <span className="text-muted-foreground block text-[11px]">
                      Variant: {item.size || item.variant?.size || "Standard"} • {item.color || item.variant?.color || "Standard"}
                    </span>
                  )}
                  <span className="text-muted-foreground block text-[11px]">
                    Qty: {qty} × ₹{unitPrice.toLocaleString("en-IN")}
                  </span>
                </div>
                <span className="font-bold text-foreground">
                  ₹{lineTotal.toLocaleString("en-IN")}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-border space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Campus Pickup Service</span>
            <span className="text-emerald-700 font-semibold">FREE (Room 204)</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex items-center justify-between text-teal-700 font-semibold">
              <span>Member Discount Subsidized</span>
              <span>-₹{Number(order.discountAmount).toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm font-extrabold text-foreground pt-2 border-t border-border">
            <span>Total Authoritative Amount</span>
            <span className="text-xl text-teal-700">
              ₹{orderTotal.toLocaleString("en-IN")}
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
            {orderTotal === 0 ? (
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
                      Member Privilege Pass (₹0.00)
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
                {/* Campus Student Card Option */}
                <label
                  className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    paymentMethod === "CAMPUS_PAY"
                      ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-600"
                      : "border-border hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    id="payment-campus-card"
                    checked={paymentMethod === "CAMPUS_PAY"}
                    onChange={() => setPaymentMethod("CAMPUS_PAY")}
                    className="mt-0.5 accent-teal-600"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-teal-700" />
                      <span className="font-bold text-foreground">
                        Campus Student Card
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[11px] block mt-1">
                      Available Balance: <strong>₹5,000.00</strong>
                    </span>
                    <span className="text-[10px] text-teal-700 block mt-0.5 font-medium">
                      Instant contactless deduction
                    </span>
                  </div>
                </label>

                {/* Demo / Sandbox Payment Gateway Option */}
                <label
                  className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    paymentMethod === "DEMO_PAY"
                      ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-600"
                      : "border-border hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    id="payment-demo-gateway"
                    checked={paymentMethod === "DEMO_PAY"}
                    onChange={() => setPaymentMethod("DEMO_PAY")}
                    className="mt-0.5 accent-teal-600"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-teal-700" />
                      <span className="font-bold text-foreground">
                        Demo / Sandbox Gateway
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[11px] block mt-1">
                      Simulate online checkout gateway
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Hackathon verified sandbox testing
                    </span>
                  </div>
                </label>
              </>
            )}
          </div>

          {/* Sandbox Simulation Options */}
          {paymentMethod === "DEMO_PAY" && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-border space-y-2 text-xs">
              <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider">
                Demo Payment Simulation Target:
              </span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="radio"
                    name="simulation"
                    id="sim-success"
                    checked={simulationResult === "SUCCESS"}
                    onChange={() => setSimulationResult("SUCCESS")}
                    className="accent-teal-600"
                  />
                  <span>Simulate Successful Payment</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-rose-700">
                  <input
                    type="radio"
                    name="simulation"
                    id="sim-failure"
                    checked={simulationResult === "FAILED"}
                    onChange={() => setSimulationResult("FAILED")}
                    className="accent-rose-600"
                  />
                  <span>Simulate Payment Failure</span>
                </label>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>TLS 256-bit Encrypted Transaction</span>
            </span>

            <button
              onClick={handlePay}
              id="pay-confirm-btn"
              disabled={paymentState === "PROCESSING"}
              className="py-3 px-8 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              {paymentState === "PROCESSING" ? (
                <span>Authorizing & Posting Transaction...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>
                    {orderTotal === 0
                      ? "Claim Free Pass"
                      : `Authorize & Pay ₹${orderTotal.toLocaleString("en-IN")}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Confirmed Order & QR Code Card */
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Official Campus Verification
              </span>
              <h2 className="text-xl font-bold text-foreground font-mono mt-0.5">
                {order.orderNumber || order.id}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                PAID & VERIFIED
              </span>
            </div>
          </div>

          {/* Pickup Slip with QR Code */}
          <div className="p-6 rounded-2xl bg-teal-50/70 border border-teal-200 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-200/80 text-teal-900 font-bold text-[11px]">
                <Package className="w-4 h-4" />
                <span>Ready for Campus Pickup</span>
              </div>
              <h4 className="font-extrabold text-base text-teal-950">
                Student Organization Desk (Room 204)
              </h4>
              <p className="text-xs text-teal-900 max-w-sm">
                Show this scannable QR verification code to the merchandise manager upon collecting your items.
              </p>
              <p className="text-[11px] text-teal-800 font-mono">
                Order Ref: {order.orderNumber || order.id}
              </p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-teal-200 shadow-xs flex flex-col items-center shrink-0">
              <QRCode value={`EDVEXA-PICKUP-${order.id}`} size={120} />
              <span className="text-[9px] font-mono text-muted-foreground mt-1.5 uppercase tracking-wider">
                Scan to Verify
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <Link
              to="/app/orders"
              id="view-my-orders-btn"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors shadow-2xs"
            >
              <span>View in My Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/app/shop"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              <span>Browse More Merchandise</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
