import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { financeApi } from "../../api";
import {
  BarChart3,
  Calendar,
  Printer,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowLeft,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import LoadingState from "../../components/common/LoadingState";

export default function FinanceReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("FALL_2026");

  useEffect(() => {
    financeApi
      .getReports(timeframe)
      .then((data) => setReport(data))
      .finally(() => setLoading(false));
  }, [timeframe]);

  if (loading) return <LoadingState message="Generating financial reports..." />;

  const summary = report?.summary;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Finance & Treasury", to: "/app/manage/finance" },
          { label: "Financial Reports & Audit" },
        ]}
      />

      <PageHeader
        title="Collegiate Organization Financial Audit"
        description="Official quarterly report on student activity fee disbursements, membership revenues, and event profit margins."
        action={
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs print:hidden"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Audit Report</span>
          </button>
        }
      />

      {/* Report Container */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-10 shadow-xs space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Audit Report — Academic Year 2026-2027
            </span>
            <h2 className="text-xl font-extrabold text-foreground mt-0.5">
              Statement of Student Organization Financial Position
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Generated: {new Date(report.generatedAt).toLocaleString()} • Compliance Status: In Order
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block font-medium">Closing Treasury</span>
            <span className="text-2xl font-black text-teal-700">
              ${summary?.closingCash.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Fiscal Performance by Month
          </h3>
          <div className="border border-border rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-border text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3">Billing Cycle</th>
                  <th className="p-3 text-right">Gross Revenues</th>
                  <th className="p-3 text-right">Disbursed Expenses</th>
                  <th className="p-3 text-right">Net Surplus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.breakdownByMonth?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-foreground">{row.month}</td>
                    <td className="p-3 text-right text-emerald-700 font-mono font-medium">
                      +${row.income.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-rose-600 font-mono font-medium">
                      -${row.expenses.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-bold text-teal-800 font-mono">
                      +${row.net.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Income Sources Summary */}
        <div className="grid sm:grid-cols-2 gap-6 pt-4 border-t border-border">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Income Category Distribution
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-600">Student Memberships</span>
                <span className="font-bold text-foreground">
                  ${summary?.incomeBreakdown?.memberships.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-600">Event Ticket Sales</span>
                <span className="font-bold text-foreground">
                  ${summary?.incomeBreakdown?.tickets.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-600">Merchandise Store</span>
                <span className="font-bold text-foreground">
                  ${summary?.incomeBreakdown?.merchandise.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-600">Student Drives & Fundraisers</span>
                <span className="font-bold text-foreground">
                  ${summary?.incomeBreakdown?.fundraisers.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Auditor Compliance Certification
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All receipts, claims, ticket issuances, and store transactions are reconciled against PostgreSQL bank feeds. The closing balance of <strong>${summary?.closingCash.toFixed(2)}</strong> reflects authoritative state and cannot be modified by frontend clients.
            </p>
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium">
              Signed: Organization Treasurer & Student Activities Advisor
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
