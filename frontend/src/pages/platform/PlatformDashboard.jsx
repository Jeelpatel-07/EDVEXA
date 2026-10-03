import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { platformApi } from "../../api";
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
  const [stats, setStats] = useState({
    total_organizations: 0,
    active_organizations: 0,
    suspended_organizations: 0,
    total_users: 0,
  });
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, orgsData] = await Promise.all([
          platformApi.getStats().catch(() => null),
          platformApi.getOrganizations().catch(() => []),
        ]);
        if (statsData) setStats(statsData);
        if (Array.isArray(orgsData)) setOrgs(orgsData);
      } catch (err) {
        console.error("Platform dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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
          value={stats.total_organizations || orgs.length}
          subtext="Onboarded student councils"
          icon={Building2}
        />
        <StatCard
          title="Active Organizations"
          value={stats.active_organizations}
          subtext="Fully operational workspaces"
          icon={CheckCircle2}
        />
        <StatCard
          title="Suspended Organizations"
          value={stats.suspended_organizations}
          subtext="Workspace access blocked"
          icon={AlertTriangle}
        />
        <StatCard
          title="Total Platform Users"
          value={stats.total_users}
          subtext="Across all university tenants"
          icon={Users}
        />
      </div>

      {/* Multi-Tenant Governance Notice */}
      <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex items-start gap-3">
        <Shield className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">EDVEXA Multi-Tenant Governance</span>
          <span className="text-purple-800 leading-relaxed">
            Platform administrators maintain tenant isolation boundaries across all PostgreSQL database views and services. Platform admins have no access to club internal finances, ticket registries, or merch orders.
          </span>
        </div>
      </div>

      {/* Organizations Overview Table */}
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Registered Organizations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live status and student enrolment across organizations
            </p>
          </div>
          <Link
            to="/platform/organizations"
            className="text-xs text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Loading organizations...</div>
          ) : orgs.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No organizations registered yet.</div>
          ) : (
            orgs.slice(0, 5).map((org) => (
              <div
                key={org.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    {org.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground">{org.name}</span>
                    <span className="text-[11px] text-muted-foreground block">
                      Code: {org.join_code || org.code || "N/A"} • Slug: {org.slug}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      org.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {org.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
