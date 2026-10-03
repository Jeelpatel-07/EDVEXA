import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { claimApi } from "../../api";
import { FileSpreadsheet, Plus, ArrowRight, DollarSign } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";

export default function MyClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    claimApi
      .getMyClaims()
      .then((data) => setClaims(data))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      header: "Claim #",
      accessor: "claimNumber",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-teal-700">
          {row.claimNumber || row.id}
        </span>
      ),
    },
    {
      header: "Purpose / Description",
      accessor: "purpose",
      render: (row) => (
        <span className="text-xs text-foreground font-medium truncate max-w-[240px] block">
          {row.purpose}
        </span>
      ),
    },
    {
      header: "Category",
      accessor: "category",
      render: (row) => (
        <span className="text-xs text-muted-foreground">{row.category}</span>
      ),
    },
    {
      header: "Amount",
      accessor: "amount",
      render: (row) => (
        <span className="font-bold text-xs text-foreground">
          ${row.amount.toFixed(2)}
        </span>
      ),
    },
    {
      header: "Submitted",
      accessor: "submittedAt",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.submittedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: "Action",
      render: (row) => (
        <Link
          to={`/app/claims/${row.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
        >
          <span>View</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Expense Claims"
        description="Volunteer and organizer expense reimbursement requests with receipt verification."
        action={
          <Link
            to="/app/claims/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Submit New Claim</span>
          </Link>
        }
      />

      {loading ? (
        <LoadingState message="Fetching reimbursement claims..." />
      ) : claims.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No claims filed yet"
          description="Have you incurred out-of-pocket expenses for organization events? Submit a claim with your receipt."
          actionLabel="Submit Claim"
          actionLink="/app/claims/new"
        />
      ) : (
        <DataTable columns={columns} data={claims} pageSize={8} />
      )}
    </div>
  );
}
