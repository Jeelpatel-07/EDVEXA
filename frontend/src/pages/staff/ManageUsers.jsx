import { useState, useEffect } from "react";
import { userApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import {
  Shield,
  Check,
  Search,
  Users,
  AlertCircle,
  CreditCard,
  Building2,
  Info,
  CheckCircle2,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";
import LoadingState from "../../components/common/LoadingState";
import {
  ROLES,
  ASSIGNABLE_STAFF_ROLES,
  ROLE_METADATA,
  isMembershipActive,
} from "../../constants/permissions";

export default function ManageUsers() {
  const { user: currentUser, organization, refreshSession } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRoles, setPendingRoles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userApi
      .getUsers()
      .then((data) => setUsers(data))
      .finally(() => setLoading(false));
  }, []);

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    // Filter to retain any existing non-assignable roles (like ORG_ADMIN if user already has it)
    setPendingRoles(user.roles || []);
    setShowConfirm(false);
  };

  const handleToggleRole = (role) => {
    const exists = pendingRoles.includes(role);
    const next = exists
      ? pendingRoles.filter((r) => r !== role)
      : [...pendingRoles, role];
    setPendingRoles(next);
  };

  const handlePromptSave = () => {
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await userApi.updateRoles(selectedUser.id, pendingRoles);
      const updatedUser = { ...selectedUser, roles: pendingRoles };
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? updatedUser : u))
      );
      if (currentUser?.id === selectedUser.id) {
        await refreshSession();
      }
      setShowConfirm(false);
      setSelectedUser(null);
      alert(`Staff roles successfully updated for ${selectedUser.name}!`);
    } catch (err) {
      alert("Failed to update staff roles: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.studentId?.toLowerCase().includes(search.toLowerCase())
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
          {row.studentId || "N/A"}
        </span>
      ),
    },
    {
      header: "Membership (Derived)",
      render: (row) => {
        const isUserMember = isMembershipActive(row.membership);
        return isUserMember ? (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>MEMBER ({row.membership.tier})</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 text-[10px]">
            <span>GUEST (Student)</span>
          </span>
        );
      },
    },
    {
      header: "Explicit Staff Roles",
      render: (row) => (
        <div className="flex flex-wrap gap-1 max-w-[280px]">
          {row.roles && row.roles.length > 0 ? (
            row.roles.map((r) => {
              const meta = ROLE_METADATA[r];
              return (
                <span
                  key={r}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    meta?.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {meta?.name ? meta.name.replace(" Administrator", " Admin") : r}
                </span>
              );
            })
          ) : (
            <span className="text-[10px] text-muted-foreground italic">None (Member/Guest only)</span>
          )}
        </div>
      ),
    },
    {
      header: "Action",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenEdit(row)}
          className="px-3 py-1.5 rounded-lg border border-border bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-teal-300 transition-colors"
        >
          Assign Roles
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Users & Staff Role Delegation"
        description="Delegate operational staff duties to students. Roles combine permissions; active membership status is independently derived."
      />

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter students by name, email, or student ID..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600/30"
        />
      </div>

      {loading ? (
        <LoadingState message="Fetching organization directory..." />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
          <DataTable columns={columns} data={filtered} pageSize={10} />
        </div>
      )}

      {/* Role Assignment UI (Sections 31, 32, 33) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border p-6 shadow-xl space-y-5">
            {/* Header with User Info & Organization */}
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  Staff Role Assignment
                </span>
                <h3 className="text-base font-bold text-foreground mt-0.5">
                  {selectedUser.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedUser.studentId} • {selectedUser.email}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>{organization?.name || "EDVEXA Student Association"}</span>
                </div>
              </div>
              <Shield className="w-6 h-6 text-teal-600" />
            </div>

            {/* Derived Membership Banner (Section 32) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-border text-xs space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Derived Access State
              </span>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">
                  {isMembershipActive(selectedUser.membership)
                    ? "Active Paid Membership"
                    : "Non-Member (Guest)"}
                </span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {isMembershipActive(selectedUser.membership)
                    ? `MEMBER (${selectedUser.membership.tier})`
                    : "GUEST"}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                {isMembershipActive(selectedUser.membership)
                  ? "✓ MEMBER derived automatically from active paid dues. Cannot be manually checked or unchecked."
                  : "✓ GUEST status derived automatically from registered account without active pass."}
              </p>
            </div>

            {/* Explicit Staff Roles (Multi-Role Enabled) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Available Explicit Staff Roles
                </span>
                <span className="text-[10px] text-muted-foreground">Multi-role enabled</span>
              </div>

              {ASSIGNABLE_STAFF_ROLES.map((role) => {
                const isAssigned = pendingRoles.includes(role);
                const meta = ROLE_METADATA[role];

                return (
                  <label
                    key={role}
                    className={`p-3 rounded-xl border flex items-start justify-between cursor-pointer transition-all ${
                      isAssigned
                        ? "border-teal-600 bg-teal-50/50 ring-1 ring-teal-600"
                        : "border-border hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => handleToggleRole(role)}
                        className="rounded accent-teal-600 mt-0.5"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {meta?.name || role}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${meta?.badgeColor}`}
                          >
                            {role}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {meta?.description}
                        </p>
                      </div>
                    </div>
                    {isAssigned && <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />}
                  </label>
                );
              })}
            </div>

            {/* Confirmation Dialog (Section 33) */}
            {showConfirm && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Confirm Role Delegation Changes?</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  You are assigning {pendingRoles.length > 0 ? pendingRoles.join(", ") : "no staff roles"} to{" "}
                  <strong>{selectedUser.name}</strong>. Their permitted actions will take effect immediately upon backend confirmation.
                </p>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              {showConfirm ? (
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 shadow-xs"
                >
                  {saving ? "Saving..." : "Confirm & Save"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePromptSave}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 shadow-xs"
                >
                  Save Roles
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
