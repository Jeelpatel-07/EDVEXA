import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { orderApi } from "../../api";
import {
  Receipt,
  Calendar,
  CreditCard,
  MapPin,
  Package,
  Printer,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import StatusBadge from "../../components/common/StatusBadge";
import QRCode from "../../components/common/QRCode";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";

export default function OrderDetail() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    orderApi
      .getOrderById(orderId)
      .then((data) => setOrder(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <LoadingState message="Loading order receipt..." />;
  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState
          title="Order Not Found"
          message="Could not locate this order in the organization database."
        />
      </div>
    );
  }

  const isMerch = order.type === "MERCHANDISE" || order.type === "MERCH" || order.order_type === "MERCH";
  const totalAmount = Number(order.totalAmount ?? order.total ?? 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Orders", to: "/app/orders" },
          { label: order.orderNumber || order.id },
        ]}
      />

      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
              Official Tax Invoice & Receipt
            </span>
            <h1 className="text-xl font-bold text-foreground font-mono mt-0.5">
              {order.orderNumber || order.id}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} />
            {order.pickupStatus && order.pickupStatus !== "NOT_APPLICABLE" && (
              <StatusBadge status={order.pickupStatus} />
            )}
          </div>
        </div>

        {/* Pickup Verification Bar for Merch */}
        {isMerch && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-teal-950">
                  Campus Pickup Slip
                </h4>
                <p className="text-xs text-teal-900 mt-0.5">
                  Location: {order.pickupLocation || "Student Organization Desk (Room 204)"}
                </p>
                <p className="text-[11px] text-teal-800 mt-1">
                  Present this verified QR token to the merchandise manager to claim.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex justify-center bg-white p-2 rounded-lg border border-teal-200">
              <QRCode value={`EDVEXA-PICKUP-${order.id}`} size={90} />
            </div>
          </div>
        )}

        {/* Itemized Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Purchased Line Items
          </h3>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border text-xs">
            {order.items?.map((item, idx) => {
              const uPrice = Number(item.unitPrice || item.unit_price || 0);
              const qty = Number(item.quantity || 1);
              const sub = Number(item.subtotal || item.totalPrice || uPrice * qty);

              return (
                <div
                  key={idx}
                  className="p-3.5 flex items-center justify-between bg-slate-50/40"
                >
                  <div>
                    <span className="font-semibold text-foreground">{item.title || item.name}</span>
                    {(item.size || item.color || item.variant) && (
                      <span className="text-muted-foreground block text-[11px]">
                        Variant: {item.size || item.variant?.size || "Standard"} • {item.color || item.variant?.color || "Standard"}
                      </span>
                    )}
                    <span className="text-muted-foreground block text-[11px]">
                      Qty: {qty} × ₹{uPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <span className="font-bold text-foreground">
                    ₹{sub.toLocaleString("en-IN")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Breakdown */}
        <div className="p-4 rounded-xl bg-slate-50 border border-border space-y-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Payment Method</span>
            <span className="font-mono text-foreground font-semibold">
              {order.payments?.[0]?.method || order.paymentMethod || "CAMPUS_CARD"}
            </span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Date & Timestamp</span>
            <span>{new Date(order.createdAt || order.created_at).toLocaleString()}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex items-center justify-between text-teal-700 font-semibold">
              <span>Member Discount Subsidized</span>
              <span>-₹{Number(order.discountAmount).toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm font-bold text-foreground pt-2 border-t border-border">
            <span>Authoritative Paid Amount</span>
            <span className="text-base text-teal-700 font-extrabold">
              ₹{totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <Link
            to="/app/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Orders</span>
          </Link>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
