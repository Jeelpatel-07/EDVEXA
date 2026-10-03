import { useState, useEffect } from "react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import { platformApi } from "../../api";
import { ShieldCheck, Search } from "lucide-react";

export default function PlatformAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await platformApi.getAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load platform audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      (l.action || "").toLowerCase().includes(q) ||
      (l.entity_type || "").toLowerCase().includes(q) ||
      (l.actor_email || "").toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      header: "Timestamp",
      accessor: "created_at",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Action",
      accessor: "action",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
          {row.action}
        </span>
      ),
    },
    {
      header: "Actor",
      accessor: "actor_email",
      render: (row) => (
        <span className="text-xs font-semibold text-slate-800">
          {row.actor_email || "System"}
        </span>
      ),
    },
    {
      header: "Target Entity",
      accessor: "entity_type",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.entity_type} {row.entity_id ? `(${row.entity_id.slice(0, 8)}...)` : ""}
        </span>
      ),
    },
    {
      header: "Details",
      accessor: "details",
      render: (row) => (
        <span className="text-xs text-foreground">
          {typeof row.details === "object" ? JSON.stringify(row.details) : String(row.details || "")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Audit Trail"
        description="Immutable record of platform-level events, organization state transitions, and administrative operations."
      />

      {/* Notice */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
        <span>
          <strong>Append-Only Security:</strong> Audit logs are strictly immutable and protected by PostgreSQL triggers. Modification and deletion of audit records is permanently denied.
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredLogs}
        loading={loading}
        emptyMessage="No audit log events found matching query."
      />
    </div>
  );
}
