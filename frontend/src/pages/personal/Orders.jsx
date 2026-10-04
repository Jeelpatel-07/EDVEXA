import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { orderApi } from "../../api";
import { Receipt, Calendar, ArrowRight, Package } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi
      .getMyOrders()
      .then((data) => setOrders(data))
      .finally(() => setLoading(false));
  }, []);

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
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
          {row.type}
        </span>
      ),
    },
    {
      header: "Date",
      accessor: "createdAt",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString()}
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
          ₹{Number(row.totalAmount ?? row.total ?? 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      header: "Payment",
      accessor: "status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Pickup",
      accessor: "pickupStatus",
      render: (row) =>
        row.pickupStatus !== "NOT_APPLICABLE" ? (
          <StatusBadge status={row.pickupStatus} />
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      header: "Action",
      render: (row) => (
        <Link
          to={`/app/orders/${row.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
        >
          <span>Receipt</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order History & Receipts"
        description="Records of all ticket reservations, merchandise purchases, and membership transactions."
      />

      {loading ? (
        <LoadingState message="Loading your transaction history..." />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No orders yet."
          description="Your merchandise purchases will appear here."
          actionLabel="Browse Merchandise"
          actionLink="/app/shop"
        />
      ) : (
        <DataTable columns={columns} data={orders} pageSize={8} />
      )}
    </div>
  );
}
