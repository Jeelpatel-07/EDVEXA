import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { financeApi } from "../../api";
import { Plus, Filter, ArrowLeft, DollarSign } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import DataTable from "../../components/common/DataTable";
import LoadingState from "../../components/common/LoadingState";

export default function LedgerEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    financeApi
      .getLedgerEntries()
      .then((data) => setEntries(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter((e) => {
    if (filterType === "ALL") return true;
    return e.type === filterType;
  });

  const columns = [
    {
      header: "Date",
      accessor: "date",
      render: (row) => <span className="text-xs text-muted-foreground">{row.date}</span>,
    },
    {
      header: "Type",
      accessor: "type",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            row.type === "INCOME"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {row.type}
        </span>
      ),
    },
    {
      header: "Source",
      accessor: "source",
      render: (row) => <span className="text-xs font-semibold text-slate-700">{row.source}</span>,
    },
    {
      header: "Description",
      accessor: "description",
      render: (row) => (
        <span className="text-xs text-foreground truncate max-w-[280px] block">
          {row.description}
        </span>
      ),
    },
    {
      header: "Reference",
      accessor: "ref",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.ref}</span>
      ),
    },
    {
      header: "Amount",
      accessor: "amount",
      render: (row) => (
        <span
          className={`font-mono text-xs font-bold ${
            row.amount >= 0 ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {row.amount >= 0 ? `+$${row.amount.toFixed(2)}` : `-$${Math.abs(row.amount).toFixed(2)}`}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Finance & Treasury", to: "/app/manage/finance" },
          { label: "Ledger Entries" },
        ]}
      />

      <PageHeader
        title="General Ledger Transactions"
        description="Complete chronological double-entry accounting records for student organization accounts."
        action={
          <Link
            to="/app/manage/finance/entries/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Ledger Entry</span>
          </Link>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 text-xs">
        {["ALL", "INCOME", "EXPENSE"].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterType === type
                ? "bg-teal-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {type === "ALL" ? "All Transactions" : type === "INCOME" ? "Income (+)" : "Expenses (-)"}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Fetching ledger records..." />
      ) : (
        <DataTable columns={columns} data={filtered} pageSize={12} />
      )}
    </div>
  );
}
