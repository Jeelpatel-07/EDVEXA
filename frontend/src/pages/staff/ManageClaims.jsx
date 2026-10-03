import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { claimApi } from "../../api";
import { FileSpreadsheet, ArrowRight, DollarSign, Filter } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";

export default function ManageClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    claimApi
      .getAllClaims()
      .then((data) => setClaims(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = claims.filter((c) => {
    if (filter === "ALL") return true;
    return c.status === filter;
  });

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
      header: "Claimant",
      accessor: "claimantName",
      render: (row) => (
        <span className="font-semibold text-xs text-foreground">
          {row.claimantName}
        </span>
      ),
    },
    {
      header: "Purpose",
      accessor: "purpose",
      render: (row) => (
        <span className="text-xs text-foreground truncate max-w-[200px] block">
          {row.purpose}
        </span>
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
          to={`/app/manage/claims/${row.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
        >
          <span>Review Claim</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treasurer Claims Audit & Approval"
        description="Verify volunteer receipts, approve reimbursements, and dispatch payouts directly to the organization ledger."
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 text-xs">
        {["ALL", "UNDER_REVIEW", "APPROVED", "REIMBURSED", "REJECTED"].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filter === st
                ? "bg-teal-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {st.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Fetching all reimbursement claims..." />
      ) : (
        <DataTable columns={columns} data={filtered} pageSize={10} />
      )}
    </div>
  );
}
