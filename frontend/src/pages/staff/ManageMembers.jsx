import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { membershipApi } from "../../api";
import { Users, Search, CreditCard, Shield, ArrowRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";

export default function ManageMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    membershipApi
      .getMembersList()
      .then((data) => setMembers(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.studentId.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: "Student",
      accessor: "name",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <img
            src={
              row.avatar ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
            }
            alt={row.name}
            className="w-8 h-8 rounded-full object-cover border border-border"
          />
          <div>
            <div className="font-semibold text-foreground text-xs">{row.name}</div>
            <div className="text-[11px] text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Student ID",
      accessor: "studentId",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.studentId}
        </span>
      ),
    },
    {
      header: "Department",
      accessor: "department",
      render: (row) => <span className="text-xs text-slate-700">{row.department}</span>,
    },
    {
      header: "Membership Tier",
      render: (row) => (
        <div>
          {row.membership ? (
            <div className="flex items-center gap-1.5">
              <StatusBadge status={row.membership.tier} />
              <span className="text-[11px] font-medium text-foreground">
                {row.membership.planName}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Non-Member (Standard)</span>
          )}
        </div>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <StatusBadge status={row.membership ? row.membership.status : "INACTIVE"} />
      ),
    },
    {
      header: "Assigned Roles",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.map((r) => (
            <span
              key={r}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700"
            >
              {r}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Organization Member Registry"
        description="Official roster of active students, membership tiers, and academic departments."
        action={
          <Link
            to="/app/manage/membership-plans"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs"
          >
            <CreditCard className="w-4 h-4" />
            <span>Manage Membership Plans</span>
          </Link>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, student ID, or college email..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/30"
        />
      </div>

      {loading ? (
        <LoadingState message="Loading membership roster..." />
      ) : (
        <DataTable columns={columns} data={filtered} pageSize={10} />
      )}
    </div>
  );
}
