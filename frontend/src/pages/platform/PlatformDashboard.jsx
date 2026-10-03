import { useState } from "react";
import { Link } from "react-router-dom";
import { MOCK_ORGANIZATIONS } from "../../api/mockData";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Shield,
  ArrowRight,
  Plus,
  Activity,
  FileText,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";

export default function PlatformDashboard() {
  const [orgs, setOrgs] = useState(MOCK_ORGANIZATIONS);

  const activeCount = orgs.filter((o) => o.status === "ACTIVE").length;
  const suspendedCount = orgs.filter((o) => o.status === "SUSPENDED").length;
  const totalMembers = orgs.reduce((acc, o) => acc + (o.memberCount || 0), 0);

  const auditEvents = [
    {
      id: "ev_1",
      action: "ORGANIZATION_REGISTERED",
      details: "Fine Arts & Media Guild onboarded to platform",
      timestamp: "2026-10-02 14:22:10",
      actor: "platform.admin@edvexa.com",
    },
    {
      id: "ev_2",
      action: "TENANT_STATUS_MODIFIED",
      details: "Fine Arts & Media Guild set to SUSPENDED due to annual renewal",
      timestamp: "2026-10-02 16:05:42",
      actor: "platform.admin@edvexa.com",
    },
    {
      id: "ev_3",
      action: "SECURITY_AUDIT_VERIFIED",
      details: "FastAPI tenant isolation boundary verified across all PostgreSQL schemas",
      timestamp: "2026-10-03 09:12:00",
      actor: "SYSTEM",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Administration Dashboard"
        description="Master multi-tenant governance, organization lifecycle management, and platform audit trail."
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/platform/organizations"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Organizations</span>
            </Link>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Organizations"
          value={orgs.length}
          subtext="Onboarded student councils"
          icon={Building2}
        />
        <StatCard
          title="Active Organizations"
          value={activeCount}
          subtext="Fully operational workspaces"
          icon={CheckCircle2}
        />
        <StatCard
          title="Suspended Organizations"
          value={suspendedCount}
          subtext="Workspace access blocked"
          icon={AlertTriangle}
        />
        <StatCard
          title="Total Enrolled Students"
          value={totalMembers}
          subtext="Across all university tenants"
          icon={Users}
        />
      </div>

      {/* Multi-Tenant Governance Notice */}
      <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-start gap-3">
        <Shield className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Section 11 Architecture Boundary Notice</span>
          <span className="text-purple-800 leading-relaxed">
            PLATFORM_ADMIN operates EDVEXA itself and manages platform tenants. Platform administrators do NOT directly mutate organization operational data (such as event tickets, merchandise stock, or local ledger entries) unless explicitly delegated.
          </span>
        </div>
      </div>

      {/* Organizations Overview & Recent Audits */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Organizations Table Shortcut */}
        <div className="lg:col-span-7 bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-600" />
                <span>Managed University Organizations</span>
              </h3>
              <Link
                to="/platform/organizations"
                className="text-xs text-purple-600 hover:underline font-semibold flex items-center gap-1"
              >
                <span>View all tenants</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {orgs.map((org) => (
                <div
                  key={org.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-border flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-foreground">{org.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Code: <span className="font-mono">{org.code}</span> • Admin: {org.adminEmail}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        org.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {org.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Audit Logs Shortcut */}
        <div className="lg:col-span-5 bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <span>Recent Platform Activity</span>
              </h3>
              <Link
                to="/platform/audit-logs"
                className="text-xs text-purple-600 hover:underline font-semibold"
              >
                Full logs
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {auditEvents.map((ev) => (
                <div key={ev.id} className="p-3 rounded-xl bg-slate-50 border border-border text-xs">
                  <div className="flex items-center justify-between font-mono text-[10px] text-purple-700 font-bold">
                    <span>{ev.action}</span>
                    <span className="text-muted-foreground font-normal">{ev.timestamp.split(" ")[1]}</span>
                  </div>
                  <p className="text-foreground text-[11px] mt-1 font-medium leading-snug">
                    {ev.details}
                  </p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    By: {ev.actor}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
