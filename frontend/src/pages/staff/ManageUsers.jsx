import { useState, useEffect } from "react";
import { userApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Shield, Check, Search, Users, AlertCircle } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";

export default function ManageUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const availableRoles = [
    "Student",
    "Volunteer",
    "Gate Staff",
    "Event Manager",
    "Treasurer",
    "Administrator",
  ];

  useEffect(() => {
    userApi
      .getUsers()
      .then((data) => setUsers(data))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleRole = (role) => {
    if (!selectedUser) return;
    const currentRoles = selectedUser.roles || ["Student"];
    const exists = currentRoles.includes(role);

    // Prevent removing Student base role or removing admin from oneself
    if (role === "Student" && exists) return;

    const nextRoles = exists
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    setSelectedUser({ ...selectedUser, roles: nextRoles });
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await userApi.updateRoles(selectedUser.id, selectedUser.roles);
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? selectedUser : u))
      );
      alert(`Roles updated for ${selectedUser.name}!`);
      setSelectedUser(null);
    } catch (err) {
      alert("Failed to update roles: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.studentId.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      header: "User Profile",
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
      header: "Assigned Roles (Multi-Role)",
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[280px]">
          {row.roles?.map((r) => (
            <span
              key={r}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                r === "Administrator"
                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                  : r === "Treasurer"
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : r === "Gate Staff"
                  ? "bg-teal-50 text-teal-800 border border-teal-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {r}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: "Action",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedUser(row)}
          className="px-3 py-1.5 rounded-lg border border-border bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-teal-300"
        >
          Edit Roles
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Control & Role Delegation"
        description="Assign staff and committee responsibilities. A user can hold multiple roles simultaneously."
      />

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter students or staff..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/30"
        />
      </div>

      {loading ? (
        <LoadingState message="Fetching users and role assignments..." />
      ) : (
        <DataTable columns={columns} data={filtered} pageSize={10} />
      )}

      {/* Role Editor Modal / Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Edit Roles for {selectedUser.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedUser.studentId} • {selectedUser.email}
                </p>
              </div>
              <Shield className="w-5 h-5 text-teal-600" />
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Select Roles (Multi-Role Enabled)
              </span>

              {availableRoles.map((role) => {
                const isAssigned = selectedUser.roles?.includes(role);
                return (
                  <label
                    key={role}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isAssigned
                        ? "border-teal-600 bg-teal-50/50 ring-1 ring-teal-600 font-bold"
                        : "border-border hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleToggleRole(role)}
                        className="rounded accent-teal-600"
                      />
                      <span className="text-xs">{role}</span>
                    </div>
                    {isAssigned && <Check className="w-4 h-4 text-teal-600" />}
                  </label>
                );
              })}
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRoles}
                disabled={saving}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 shadow-xs"
              >
                {saving ? "Saving..." : "Save Role Permissions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
