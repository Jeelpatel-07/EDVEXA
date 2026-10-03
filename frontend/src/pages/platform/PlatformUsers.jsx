import { useState, useEffect } from "react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import { platformApi } from "../../api";
import { ROLE_METADATA } from "../../constants/permissions";
import { Search } from "lucide-react";

export default function PlatformUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await platformApi.getUsers({ search: search.trim() || undefined });
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load platform users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search]);

  const columns = [
    {
      header: "User",
      accessor: "full_name",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center border border-border">
            {(row.full_name || row.email || "U").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-foreground text-xs">{row.full_name || "User"}</div>
            <div className="text-[11px] text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Account Status",
      accessor: "status",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            row.status === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Associated Roles",
      accessor: "roles",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles && row.roles.length > 0 ? (
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
            <span className="text-[10px] text-muted-foreground italic">Student (No staff role)</span>
          )}
        </div>
      ),
    },
    {
      header: "Registered At",
      accessor: "created_at",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Directory"
        description="Global registry of platform administrators and student users across organizations."
      />

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found matching query."
      />
    </div>
  );
}
