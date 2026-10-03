import { CheckCircle2, AlertCircle, Clock, XCircle, RotateCcw } from "lucide-react";

export default function PaymentStatus({ status, orderNumber, message }) {
  const normalized = String(status || "").toUpperCase();

  const configs = {
    PAID: {
      icon: CheckCircle2,
      title: "Payment Confirmed & Verified",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      desc: "Your transaction has been authorized by the backend server. Your order and passes are active.",
    },
    PROCESSING: {
      icon: Clock,
      title: "Processing Transaction",
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      desc: "Payment is currently awaiting gateway settlement. Please do not refresh the page.",
    },
    PENDING: {
      icon: Clock,
      title: "Payment Pending",
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      desc: "Order has been created. Complete your payment within the reservation window.",
    },
    FAILED: {
      icon: AlertCircle,
      title: "Payment Unsuccessful",
      color: "text-rose-700",
      bg: "bg-rose-50",
      border: "border-rose-200",
      desc: "The transaction could not be processed by the bank. No charges were made.",
    },
    EXPIRED: {
      icon: XCircle,
      title: "Reservation Expired",
      color: "text-slate-700",
      bg: "bg-slate-100",
      border: "border-slate-300",
      desc: "The 15-minute reservation window elapsed. Reserved tickets or stock were released.",
    },
    CANCELLED: {
      icon: XCircle,
      title: "Order Cancelled",
      color: "text-slate-700",
      bg: "bg-slate-100",
      border: "border-slate-300",
      desc: "This order was cancelled.",
    },
    REFUNDED: {
      icon: RotateCcw,
      title: "Payment Refunded",
      color: "text-purple-700",
      bg: "bg-purple-50",
      border: "border-purple-200",
      desc: "The amount has been returned to the original payment source.",
    },
  };

  const config = configs[normalized] || configs.PENDING;
  const Icon = config.icon;

  return (
    <div
      className={`p-5 rounded-xl border ${config.bg} ${config.border} ${config.color}`}
    >
      <div className="flex items-start gap-3.5">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold">{config.title}</h4>
          <p className="text-xs mt-1 opacity-90">{message || config.desc}</p>
          {orderNumber && (
            <p className="text-xs font-mono mt-2 font-medium">
              Order Reference: {orderNumber}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
