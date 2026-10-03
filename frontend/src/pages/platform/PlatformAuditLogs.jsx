import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import { ShieldCheck, Search, Filter } from "lucide-react";

export default function PlatformAuditLogs() {
  const [search, setSearch] = useState("");

  const logs = [
    {
      id: "log_01",
      timestamp: "2026-10-03 13:42:15",
      eventType: "ORGANIZATION_STATUS_UPDATE",
      actor: "platform.admin@edvexa.com",
      target: "org-arts (Fine Arts & Media Guild)",
      details: "Tenant status modified to SUSPENDED. Enforcement: blocked route access.",
      severity: "WARNING",
    },
    {
      id: "log_02",
      timestamp: "2026-10-03 11:20:04",
      eventType: "PLATFORM_ADMIN_LOGIN",
      actor: "platform.admin@edvexa.com",
      target: "AUTH_GATEWAY",
      details: "Two-factor authenticated session verified for Master Node actor.",
      severity: "INFO",
    },
    {
      id: "log_03",
      timestamp: "2026-10-02 18:30:00",
      eventType: "TENANT_PROVISIONED",
      actor: "platform.admin@edvexa.com",
      target: "org-tech (Engineering Student Council)",
      details: "New tenant workspace initialized with schema isolation.",
      severity: "INFO",
    },
    {
      id: "log_04",
      timestamp: "2026-10-01 09:15:22",
      eventType: "CROSS_TENANT_BLOCK",
      actor: "usr_2 (Priya Sharma)",
      target: "org-skyline / org-tech",
      details: "Rejected cross-tenant data access attempt by resource organization ID check.",
      severity: "SECURITY_INTERCEPT",
    },
  ];

  const columns = [
    {
      header: "Timestamp",
      accessor: "timestamp",
      render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.timestamp}</span>,
    },
    {
      header: "Event Type",
      accessor: "eventType",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
          {row.eventType}
        </span>
      ),
    },
    {
      header: "Actor",
      accessor: "actor",
      render: (row) => <span className="font-semibold text-xs text-foreground">{row.actor}</span>,
    },
    {
      header: "Target Resource",
      accessor: "target",
      render: (row) => <span className="text-xs text-slate-700">{row.target}</span>,
    },
    {
      header: "Audit Details",
      accessor: "details",
      render: (row) => <span className="text-xs text-muted-foreground">{row.details}</span>,
    },
    {
      header: "Severity",
      accessor: "severity",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            row.severity === "SECURITY_INTERCEPT"
              ? "bg-rose-50 text-rose-700 border-rose-200"
              : row.severity === "WARNING"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-blue-50 text-blue-700 border-blue-200"
          }`}
        >
          {row.severity}
        </span>
      ),
    },
  ];

  const filteredLogs = logs.filter(
    (l) =>
      l.eventType.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Security & Audit Logs"
        description="Immutable system-level audit records capturing cross-tenant queries, organization status modifications, and master actor events."
      />

      <div className="bg-card rounded-2xl border border-border p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search platform audit logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30"
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
        <DataTable columns={columns} data={filteredLogs} emptyMessage="No audit logs recorded." />
      </div>
    </div>
  );
}
