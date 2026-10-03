import { useState } from "react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import { MOCK_USERS } from "../../api/mockData";
import { ROLES, ROLE_METADATA } from "../../constants/permissions";
import { Search } from "lucide-react";

export default function PlatformUsers() {
  const [search, setSearch] = useState("");

  const columns = [
    {
      header: "User",
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
      header: "Organization / Scope",
      render: (row) => (
        <span className="text-xs text-foreground font-medium">
          {row.organization?.name || "Platform Governance"}
        </span>
      ),
    },
    {
      header: "Explicit Roles",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.length > 0 ? (
            row.roles.map((r) => {
              const meta = ROLE_METADATA[r];
              return (
                <span
                  key={r}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    meta?.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {r}
                </span>
              );
            })
          ) : (
            <span className="text-[10px] text-muted-foreground italic">Guest (Student)</span>
          )}
        </div>
      ),
    },
    {
      header: "Membership Status",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
            row.membership?.status === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}
        >
          {row.membership?.status === "ACTIVE" ? `Active (${row.membership.tier})` : "Non-Member"}
        </span>
      ),
    },
  ];

  const filtered = MOCK_USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Directory & System Users"
        description="Inspect registered platform actors, organization executives, and membership enrollments across all connected college tenants."
      />

      <div className="bg-card rounded-2xl border border-border p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search system directory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30"
          />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
        <DataTable columns={columns} data={filtered} />
      </div>
    </div>
  );
}
