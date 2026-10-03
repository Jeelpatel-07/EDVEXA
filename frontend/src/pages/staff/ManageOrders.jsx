import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { orderApi } from "../../api";
import { Package, CheckCircle2, ArrowRight, Filter, Search } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";

export default function ManageOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = () => {
    orderApi
      .getAllOrders()
      .then((data) => setOrders(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleMarkPickedUp = async (orderId) => {
    setUpdatingId(orderId);
    try {
      await orderApi.updatePickupStatus(orderId, "PICKED_UP");
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, pickupStatus: "PICKED_UP" } : o
        )
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    if (filterStatus === "ALL") return true;
    if (filterStatus === "READY_FOR_PICKUP") return o.pickupStatus === "READY_FOR_PICKUP";
    if (filterStatus === "PICKED_UP") return o.pickupStatus === "PICKED_UP";
    return o.type === filterStatus;
  });

  const columns = [
    {
      header: "Order #",
      accessor: "orderNumber",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-teal-700">
          {row.orderNumber || row.id}
        </span>
      ),
    },
    {
      header: "Type",
      accessor: "type",
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
          {row.type}
        </span>
      ),
    },
    {
      header: "Items",
      render: (row) => (
        <span className="text-xs text-foreground font-medium truncate max-w-[220px] block">
          {row.items?.map((i) => `${i.quantity}× ${i.title}`).join(", ")}
        </span>
      ),
    },
    {
      header: "Amount",
      accessor: "totalAmount",
      render: (row) => (
        <span className="font-bold text-xs text-foreground">
          ${row.totalAmount.toFixed(2)}
        </span>
      ),
    },
    {
      header: "Payment",
      accessor: "status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Pickup Status",
      accessor: "pickupStatus",
      render: (row) =>
        row.pickupStatus !== "NOT_APPLICABLE" ? (
          <StatusBadge status={row.pickupStatus} />
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      header: "Desk Action",
      render: (row) => {
        if (row.pickupStatus === "READY_FOR_PICKUP") {
          return (
            <button
              onClick={() => handleMarkPickedUp(row.id)}
              disabled={updatingId === row.id}
              className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-2xs flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Mark Picked Up</span>
            </button>
          );
        }
        if (row.pickupStatus === "PICKED_UP") {
          return (
            <span className="text-[11px] font-medium text-slate-500">
              Collected ✓
            </span>
          );
        }
        return (
          <Link
            to={`/app/orders/${row.id}`}
            className="text-xs text-teal-600 hover:underline font-semibold"
          >
            Details
          </Link>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Organization Orders & Fulfillment"
        description="Merchandise collection desk operations. Pickups update fulfillment state without double-deducting stock."
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 text-xs overflow-x-auto">
        {[
          { id: "ALL", label: "All Orders" },
          { id: "READY_FOR_PICKUP", label: "Awaiting Desk Pickup" },
          { id: "PICKED_UP", label: "Completed Pickups" },
          { id: "MERCHANDISE", label: "Merchandise Only" },
          { id: "TICKET", label: "Tickets Only" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filterStatus === tab.id
                ? "bg-teal-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading fulfillment records..." />
      ) : (
        <DataTable columns={columns} data={filtered} pageSize={10} />
      )}
    </div>
  );
}
