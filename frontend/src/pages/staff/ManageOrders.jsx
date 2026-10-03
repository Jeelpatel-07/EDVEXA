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
      .then((data) => {
        const orderList = Array.isArray(data) ? data : (data?.items || []);
        setOrders(orderList);
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleMarkPickedUp = async (orderId) => {
    setUpdatingId(orderId);
    try {
      if (typeof orderApi.updatePickupStatus === "function") {
        await orderApi.updatePickupStatus(orderId, "PICKED_UP");
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, pickupStatus: "PICKED_UP", pickup_status: "PICKED_UP" } : o
        )
      );
    } catch (err) {
      console.error("Failed to update pickup status:", err);
      alert("Failed to mark picked up: " + (err.message || "Unknown error"));
    } finally {
      setUpdatingId(null);
    }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];
  const filtered = safeOrders.filter((o) => {
    const pickupSt = o.pickupStatus || o.pickup_status || "NOT_APPLICABLE";
    const ordType = o.type || o.order_type || "UNKNOWN";
    if (filterStatus === "ALL") return true;
    if (filterStatus === "READY_FOR_PICKUP") return pickupSt === "READY_FOR_PICKUP";
    if (filterStatus === "PICKED_UP") return pickupSt === "PICKED_UP";
    if (filterStatus === "MERCHANDISE") return ordType === "MERCHANDISE" || ordType === "MERCH";
    if (filterStatus === "TICKET") return ordType === "TICKET" || ordType === "TICKETS";
    return ordType === filterStatus;
  });

  const columns = [
    {
      header: "Order #",
      accessor: "orderNumber",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-teal-700">
          {row.orderNumber || row.order_number || row.id}
        </span>
      ),
    },
    {
      header: "Type",
      accessor: "type",
      render: (row) => {
        const ordType = row.type || row.order_type || "GENERAL";
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
            {ordType}
          </span>
        );
      },
    },
    {
      header: "Items",
      render: (row) => (
        <span className="text-xs text-foreground font-medium truncate max-w-[220px] block">
          {row.items && row.items.length > 0
            ? row.items.map((i) => `${i.quantity || 1}× ${i.title || i.product_name || i.ticket_name || i.plan_name || "Item"}`).join(", ")
            : "1× Standard Order"}
        </span>
      ),
    },
    {
      header: "Amount",
      accessor: "totalAmount",
      render: (row) => {
        const amt = row.totalAmount != null ? Number(row.totalAmount) : Number(row.total || 0);
        return (
          <span className="font-bold text-xs text-foreground">
            ${isNaN(amt) ? "0.00" : amt.toFixed(2)}
          </span>
        );
      },
    },
    {
      header: "Payment",
      accessor: "status",
      render: (row) => <StatusBadge status={row.status || "PAID"} />,
    },
    {
      header: "Pickup Status",
      accessor: "pickupStatus",
      render: (row) => {
        const pickupSt = row.pickupStatus || row.pickup_status || "NOT_APPLICABLE";
        return pickupSt !== "NOT_APPLICABLE" ? (
          <StatusBadge status={pickupSt} />
        ) : (
          <span className="text-xs text-slate-400">—</span>
        );
      },
    },
    {
      header: "Desk Action",
      render: (row) => {
        const pickupSt = row.pickupStatus || row.pickup_status || "NOT_APPLICABLE";
        if (pickupSt === "READY_FOR_PICKUP") {
          return (
            <button
              onClick={() => handleMarkPickedUp(row.id)}
              disabled={updatingId === row.id}
              className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Mark Picked Up</span>
            </button>
          );
        }
        if (pickupSt === "PICKED_UP") {
          return (
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
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
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
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
