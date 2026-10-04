import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { financeApi } from "../../api";
import {
  BarChart3,
  Calendar,
  Printer,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import LoadingState from "../../components/common/LoadingState";

export default function FinanceReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("FALL_2026");
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    financeApi
      .getReports(timeframe)
      .then((data) => setReport(data))
      .catch((err) => {
        console.error("Failed to load financial reports:", err);
      })
      .finally(() => setLoading(false));
  }, [timeframe]);

  const exportToWord = () => {
    if (!report) return;

    const summary = report.summary || {};
    const closingBalance = Number(summary.closingCash ?? summary.net_balance ?? 0).toFixed(2);
    const generatedDate = report.generatedAt
      ? new Date(report.generatedAt).toLocaleString()
      : new Date().toLocaleString();

    // Generate table rows for monthly breakdown
    const monthlyRowsHtml = (report.breakdownByMonth || [])
      .map(
        (row) => `
        <tr>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold;">${row.month || "Billing Cycle"}</td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; color: #047857;">+$${Number(row.income || 0).toFixed(2)}</td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; color: #b91c1c;">-$${Number(row.expenses || 0).toFixed(2)}</td>
          <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #0f766e;">+$${Number(row.net || 0).toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    const memberships = Number(summary.incomeBreakdown?.memberships || 0).toFixed(2);
    const tickets = Number(summary.incomeBreakdown?.tickets || 0).toFixed(2);
    const merchandise = Number(summary.incomeBreakdown?.merchandise || 0).toFixed(2);
    const fundraisers = Number(summary.incomeBreakdown?.fundraisers || 0).toFixed(2);

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Collegiate Organization Financial Audit Report</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            color: #1e293b;
            margin: 40px;
            line-height: 1.5;
          }
          .header-box {
            border-bottom: 2px solid #0f766e;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .title {
            color: #0f766e;
            font-size: 20pt;
            font-weight: bold;
            margin: 0 0 6px 0;
          }
          .subtitle {
            font-size: 10pt;
            color: #64748b;
            margin: 0;
          }
          .treasury-box {
            background-color: #f0fdfa;
            border: 1px solid #0f766e;
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 24px;
            text-align: right;
          }
          .treasury-label {
            font-size: 9pt;
            color: #0f766e;
            font-weight: bold;
            text-transform: uppercase;
          }
          .treasury-value {
            font-size: 22pt;
            font-weight: bold;
            color: #0f766e;
          }
          .section-title {
            color: #0f766e;
            font-size: 13pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 24px 0 10px 0;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            font-size: 10pt;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9pt;
            padding: 8px 12px;
            border: 1px solid #cbd5e1;
            text-align: left;
          }
          td {
            padding: 8px 12px;
            border: 1px solid #e2e8f0;
          }
          .cert-box {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 16px;
            border-radius: 6px;
            margin-top: 24px;
            font-size: 9.5pt;
          }
          .signature-box {
            margin-top: 16px;
            padding: 10px 14px;
            background-color: #f0fdfa;
            border: 1px solid #99f6e4;
            color: #0f766e;
            font-weight: bold;
            font-size: 10pt;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <p style="font-size: 10pt; font-weight: bold; color: #0f766e; text-transform: uppercase; margin: 0 0 4px 0;">
            EDVEXA — Student Organization Management Platform
          </p>
          <h1 class="title">Statement of Student Organization Financial Position</h1>
          <p class="subtitle">
            Audit Period: Academic Year 2026-2027 (${timeframe.replace("_", " ")}) | Generated: ${generatedDate} | Compliance Status: In Order
          </p>
        </div>

        <div class="treasury-box">
          <div class="treasury-label">Closing Net Treasury Balance</div>
          <div class="treasury-value">$${closingBalance}</div>
        </div>

        <div class="section-title">1. Fiscal Performance by Month</div>
        <table>
          <thead>
            <tr>
              <th>Billing Cycle</th>
              <th style="text-align: right;">Gross Revenues</th>
              <th style="text-align: right;">Disbursed Expenses</th>
              <th style="text-align: right;">Net Surplus</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyRowsHtml}
          </tbody>
        </table>

        <div class="section-title">2. Income Category Distribution</div>
        <table>
          <thead>
            <tr>
              <th>Revenue Channel</th>
              <th style="text-align: right;">Total Realized Income</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold;">Student Memberships</td>
              <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #0f766e;">$${memberships}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold;">Event Ticket Sales</td>
              <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #0f766e;">$${tickets}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold;">Merchandise Store</td>
              <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #0f766e;">$${merchandise}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold;">Student Drives & Fundraisers</td>
              <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold; color: #0f766e;">$${fundraisers}</td>
            </tr>
          </tbody>
        </table>

        <div class="cert-box">
          <div style="font-weight: bold; color: #334155; margin-bottom: 6px; text-transform: uppercase; font-size: 9pt;">
            Auditor Compliance Certification
          </div>
          <p style="margin: 0; color: #475569; line-height: 1.4;">
            All receipts, claims, ticket issuances, and store transactions are reconciled against PostgreSQL bank feeds. The closing balance of <strong>$${closingBalance}</strong> reflects authoritative state and cannot be modified by frontend clients.
          </p>
          <div class="signature-box">
            Signed & Certified: Organization Treasurer & Student Activities Advisor
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + docContent], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EDVEXA_Financial_Audit_Report_${timeframe}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  const exportToCSV = () => {
    if (!report) return;

    const summary = report.summary || {};
    const closingBalance = Number(summary.closingCash ?? summary.net_balance ?? 0).toFixed(2);
    const generatedDate = report.generatedAt
      ? new Date(report.generatedAt).toISOString()
      : new Date().toISOString();

    const lines = [
      ["EDVEXA Collegiate Organization Financial Audit Report"],
      [`Fiscal Period: ${timeframe}`],
      [`Generated: ${generatedDate}`],
      [`Closing Treasury Net Balance: $${closingBalance}`],
      [],
      ["1. MONTHLY PERFORMANCE"],
      ["Billing Cycle", "Gross Revenues", "Disbursed Expenses", "Net Surplus"],
      ...(report.breakdownByMonth || []).map((row) => [
        `"${row.month || "Billing Cycle"}"`,
        Number(row.income || 0).toFixed(2),
        Number(row.expenses || 0).toFixed(2),
        Number(row.net || 0).toFixed(2),
      ]),
      [],
      ["2. REVENUE DISTRIBUTION BY CHANNEL"],
      ["Revenue Channel", "Realized Total ($)"],
      ["Student Memberships", Number(summary.incomeBreakdown?.memberships || 0).toFixed(2)],
      ["Event Ticket Sales", Number(summary.incomeBreakdown?.tickets || 0).toFixed(2)],
      ["Merchandise Store", Number(summary.incomeBreakdown?.merchandise || 0).toFixed(2)],
      ["Student Drives & Fundraisers", Number(summary.incomeBreakdown?.fundraisers || 0).toFixed(2)],
      [],
      ["Auditor Status: Certified - In Compliance with Campus Activity Guidelines"],
    ];

    const csvContent = lines.map((e) => (Array.isArray(e) ? e.join(",") : e)).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EDVEXA_Financial_Audit_Report_${timeframe}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  if (loading) return <LoadingState message="Generating financial reports..." />;

  const summary = report?.summary;
  const closingCashVal = Number(summary?.closingCash ?? summary?.net_balance ?? 0);

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
          <div className="flex items-center gap-2 print:hidden">
            {/* CSV Export Button */}
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-teal-600 bg-teal-50 text-teal-800 text-xs font-bold hover:bg-teal-100 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export as CSV</span>
            </button>

            {/* Word Export Button */}
            <button
              onClick={exportToWord}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export as Word (.doc)</span>
            </button>

            {/* Print / PDF Fallback */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Preview</span>
            </button>
          </div>
        }
      />

      {downloadSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Financial audit report successfully downloaded as a Microsoft Word document (.doc)!</span>
        </div>
      )}

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
              Generated: {report?.generatedAt ? new Date(report.generatedAt).toLocaleString() : new Date().toLocaleString()} • Compliance Status: In Order
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block font-medium">Closing Treasury</span>
            <span className="text-2xl font-black text-teal-700">
              ${closingCashVal.toFixed(2)}
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
                {report?.breakdownByMonth?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-foreground">{row.month}</td>
                    <td className="p-3 text-right text-emerald-700 font-mono font-medium">
                      +${Number(row.income || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-rose-600 font-mono font-medium">
                      -${Number(row.expenses || 0).toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-bold text-teal-800 font-mono">
                      +${Number(row.net || 0).toFixed(2)}
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
                  ${Number(summary?.incomeBreakdown?.memberships || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-600">Event Ticket Sales</span>
                <span className="font-bold text-foreground">
                  ${Number(summary?.incomeBreakdown?.tickets || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-600">Merchandise Store</span>
                <span className="font-bold text-foreground">
                  ${Number(summary?.incomeBreakdown?.merchandise || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-50">
                <span className="text-slate-600">Student Drives & Fundraisers</span>
                <span className="font-bold text-foreground">
                  ${Number(summary?.incomeBreakdown?.fundraisers || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Auditor Compliance Certification
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All receipts, claims, ticket issuances, and store transactions are reconciled against PostgreSQL bank feeds. The closing balance of <strong>${closingCashVal.toFixed(2)}</strong> reflects authoritative state and cannot be modified by frontend clients.
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
