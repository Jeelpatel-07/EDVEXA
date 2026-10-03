export default function StatusBadge({ status, className = "" }) {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  const configs = {
    // Orders / Payments / Tickets
    PAID: { text: "Paid", bg: "bg-emerald-50", textCol: "text-emerald-700", border: "border-emerald-200" },
    ISSUED: { text: "Active / Issued", bg: "bg-teal-50", textCol: "text-teal-700", border: "border-teal-200" },
    CHECKED_IN: { text: "Checked In", bg: "bg-emerald-50", textCol: "text-emerald-700", border: "border-emerald-200" },
    PENDING: { text: "Pending", bg: "bg-amber-50", textCol: "text-amber-700", border: "border-amber-200" },
    PENDING_PAYMENT: { text: "Awaiting Payment", bg: "bg-amber-50", textCol: "text-amber-700", border: "border-amber-200" },
    PROCESSING: { text: "Processing", bg: "bg-blue-50", textCol: "text-blue-700", border: "border-blue-200" },
    FAILED: { text: "Failed", bg: "bg-rose-50", textCol: "text-rose-700", border: "border-rose-200" },
    EXPIRED: { text: "Expired", bg: "bg-slate-100", textCol: "text-slate-600", border: "border-slate-200" },
    CANCELLED: { text: "Cancelled", bg: "bg-rose-50", textCol: "text-rose-700", border: "border-rose-200" },
    REFUNDED: { text: "Refunded", bg: "bg-purple-50", textCol: "text-purple-700", border: "border-purple-200" },
    
    // Merchandise Pickups
    READY_FOR_PICKUP: { text: "Ready for Pickup", bg: "bg-teal-50", textCol: "text-teal-700", border: "border-teal-200" },
    PICKED_UP: { text: "Picked Up", bg: "bg-slate-100", textCol: "text-slate-700", border: "border-slate-200" },
    
    // Claims
    UNDER_REVIEW: { text: "Under Review", bg: "bg-amber-50", textCol: "text-amber-700", border: "border-amber-200" },
    APPROVED: { text: "Approved", bg: "bg-emerald-50", textCol: "text-emerald-700", border: "border-emerald-200" },
    REJECTED: { text: "Rejected", bg: "bg-rose-50", textCol: "text-rose-700", border: "border-rose-200" },
    REIMBURSED: { text: "Reimbursed", bg: "bg-emerald-50", textCol: "text-emerald-700", border: "border-emerald-200" },

    // Memberships
    ACTIVE: { text: "Active", bg: "bg-emerald-50", textCol: "text-emerald-700", border: "border-emerald-200" },
    GOLD: { text: "Gold Tier", bg: "bg-amber-50", textCol: "text-amber-800", border: "border-amber-300" },
    SILVER: { text: "Silver Tier", bg: "bg-slate-100", textCol: "text-slate-700", border: "border-slate-300" },
    BRONZE: { text: "Bronze Tier", bg: "bg-orange-50", textCol: "text-orange-800", border: "border-orange-200" },

    // Tasks / Events
    UPCOMING: { text: "Upcoming", bg: "bg-teal-50", textCol: "text-teal-700", border: "border-teal-200" },
    IN_PROGRESS: { text: "In Progress", bg: "bg-sky-50", textCol: "text-sky-700", border: "border-sky-200" },
    COMPLETED: { text: "Completed", bg: "bg-emerald-50", textCol: "text-emerald-700", border: "border-emerald-200" },
    HIGH: { text: "High Priority", bg: "bg-rose-50", textCol: "text-rose-700", border: "border-rose-200" },
    NORMAL: { text: "Normal Priority", bg: "bg-slate-100", textCol: "text-slate-700", border: "border-slate-200" },
  };

  const config = configs[normalized] || {
    text: status,
    bg: "bg-slate-100",
    textCol: "text-slate-700",
    border: "border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.textCol} ${config.border} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {config.text}
    </span>
  );
}
