import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { financeApi } from "../../api";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  ArrowRight,
  Plus,
  BarChart3,
  Calendar,
  CreditCard,
  Ticket,
  ShoppingBag,
  HandHeart,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import DataTable from "../../components/common/DataTable";
import LoadingState from "../../components/common/LoadingState";
import { useAuth } from "../../context/AuthContext";
import { PERMISSIONS } from "../../constants/permissions";

export default function FinanceDashboard() {
  const { hasPermission } = useAuth();
  const canManageFinance = hasPermission(PERMISSIONS.FINANCE_MANAGE);
  const isReadOnly = !canManageFinance;

  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    financeApi
      .getSummary()
      .then((data) => setFinance(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Fetching organization treasury summary..." />;

  const ledgerColumns = [
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
      header: "Source / Category",
      accessor: "source",
      render: (row) => <span className="text-xs font-semibold text-slate-700">{row.source}</span>,
    },
    {
      header: "Description",
      accessor: "description",
      render: (row) => (
        <span className="text-xs text-foreground truncate max-w-[260px] block">
          {row.description}
        </span>
      ),
    },
    {
      header: "Ref Code",
      accessor: "ref",
      render: (row) => (
        <span className="font-mono text-[11px] text-muted-foreground">{row.ref}</span>
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
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <span>Student Organization Treasury & Ledger</span>
            {isReadOnly && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                READ ONLY
              </span>
            )}
          </div>
        }
        description={
          isReadOnly
            ? "Read-only inspection mode: You can review live financial records, cash flow, and reports, but ledger entries and payout authorizations are restricted to Treasury officers."
            : "Authoritative backend financial governance and income disbursement records."
        }
        action={
          <div className="flex items-center gap-2">
            {canManageFinance && (
              <Link
                to="/app/manage/finance/entries/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Ledger Entry</span>
              </Link>
            )}
            <Link
              to="/app/manage/reports"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
            >
              <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
              <span>Financial Reports</span>
            </Link>
          </div>
        }
      />

      {/* Authoritative Financial Balances Grid (Per Prompt Rules) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Closing Cash Balance"
          value={`$${Number(finance?.closingCash ?? finance?.net_balance ?? 0).toFixed(2)}`}
          subtext="Net available treasury"
          icon={DollarSign}
        />
        <StatCard
          title="Money Received"
          value={`$${Number(finance?.moneyReceived ?? finance?.total_revenue ?? 0).toFixed(2)}`}
          subtext="Memberships, tickets & merch"
          icon={TrendingUp}
        />
        <StatCard
          title="Reimbursements Paid"
          value={`$${Number(finance?.reimbursements ?? 0).toFixed(2)}`}
          subtext="Approved volunteer payouts"
          icon={FileSpreadsheet}
        />
        <StatCard
          title="Approved Claims Pending"
          value={`$${Number(finance?.approvedClaimsAwaitingPayment ?? finance?.pending_claims_amount ?? 0).toFixed(2)}`}
          subtext="Awaiting disbursement batch"
          icon={TrendingDown}
        />
      </div>

      {/* Detailed Balance Sheet Bar */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Authoritative Cash Flow Breakdown
        </h3>
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-border">
            <span className="text-muted-foreground block text-[11px]">Opening Balance</span>
            <span className="font-bold text-foreground text-sm mt-0.5 block">
              ${Number(finance?.openingBalance || 0).toFixed(2)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-emerald-800 block text-[11px]">Money Received (+)</span>
            <span className="font-bold text-emerald-800 text-sm mt-0.5 block">
              ${Number(finance?.moneyReceived ?? finance?.total_revenue ?? 0).toFixed(2)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
            <span className="text-rose-800 block text-[11px]">Refunds (-)</span>
            <span className="font-bold text-rose-800 text-sm mt-0.5 block">
              ${Number(finance?.refunds || 0).toFixed(2)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
            <span className="text-rose-800 block text-[11px]">Reimbursements (-)</span>
            <span className="font-bold text-rose-800 text-sm mt-0.5 block">
              ${Number(finance?.reimbursements || 0).toFixed(2)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200">
            <span className="text-rose-800 block text-[11px]">Other Expenses (-)</span>
            <span className="font-bold text-rose-800 text-sm mt-0.5 block">
              ${Number(finance?.otherExpenses || 0).toFixed(2)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
            <span className="text-teal-900 block text-[11px] font-bold">Closing Cash (=)</span>
            <span className="font-black text-teal-800 text-sm mt-0.5 block">
              ${Number(finance?.closingCash ?? finance?.net_balance ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Income Sources & Recent Ledger */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Income Sources Summary */}
        <div className="lg:col-span-4 bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-foreground">Income by Channel</h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-border">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-foreground">Memberships</span>
              </div>
              <span className="font-bold text-teal-700">
                ${Number(finance?.incomeBreakdown?.memberships || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-border">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-foreground">Event Tickets</span>
              </div>
              <span className="font-bold text-teal-700">
                ${Number(finance?.incomeBreakdown?.tickets || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-border">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-foreground">Merchandise</span>
              </div>
              <span className="font-bold text-teal-700">
                ${Number(finance?.incomeBreakdown?.merchandise || 0).toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-border">
              <div className="flex items-center gap-2">
                <HandHeart className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-foreground">Fundraisers</span>
              </div>
              <span className="font-bold text-teal-700">
                ${Number(finance?.incomeBreakdown?.fundraisers || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Live Ledger Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Recent General Ledger Entries
            </h3>
            <Link
              to="/app/manage/finance/entries"
              className="text-xs text-teal-600 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <DataTable columns={ledgerColumns} data={finance.ledger || []} pageSize={5} />
        </div>
      </div>
    </div>
  );
}
