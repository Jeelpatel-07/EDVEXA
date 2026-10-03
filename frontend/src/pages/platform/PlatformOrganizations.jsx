import { useState, useEffect } from "react";
import { platformApi } from "../../api";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Mail,
  UserPlus,
  Check,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";

export default function PlatformOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [inviteUrl, setInviteUrl] = useState(null);

  // New Organization Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    join_code: "",
    member_number_prefix: "EDV",
    admin_email: "",
  });

  const [adminEmailInput, setAdminEmailInput] = useState("");

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const data = await platformApi.getOrganizations();
      setOrgs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  const handleToggleStatus = async (org) => {
    try {
      if (org.status === "ACTIVE") {
        await platformApi.suspendOrganization(org.id, "Suspended by platform administrator");
      } else {
        await platformApi.activateOrganization(org.id, "Reactivated by platform administrator");
      }
      await loadOrgs();
    } catch (err) {
      alert(err.message || "Failed to update organization status");
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    try {
      const res = await platformApi.createOrganization({
        name: formData.name,
        slug: formData.slug.toLowerCase().trim(),
        join_code: formData.join_code.toUpperCase().trim(),
        member_number_prefix: formData.member_number_prefix.toUpperCase().trim(),
        admin_email: formData.admin_email.trim(),
      });
      setIsModalOpen(false);
      setFormData({
        name: "",
        slug: "",
        join_code: "",
        member_number_prefix: "EDV",
        admin_email: "",
      });
      if (res?.admin_invite_url) {
        setInviteUrl(res.admin_invite_url);
      }
      await loadOrgs();
    } catch (err) {
      alert(err.message || "Failed to create organization");
    }
  };

  const handleAddOrgAdmin = async (e) => {
    e.preventDefault();
    if (!selectedOrg || !adminEmailInput) return;
    try {
      const res = await platformApi.inviteOrgAdmin({
        organization_id: selectedOrg.id,
        email: adminEmailInput.trim(),
      });
      setIsAdminModalOpen(false);
      setAdminEmailInput("");
      if (res?.invite_url) {
        setInviteUrl(res.invite_url);
      }
      alert("Invitation link created. Share it with the intended recipient.");
    } catch (err) {
      alert(err.message || "Failed to invite organization admin");
    }
  };

  const filteredOrgs = orgs.filter((o) => {
    const matchesFilter = filter === "ALL" || o.status === filter;
    const matchesSearch =
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.join_code || "").toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const columns = [
    {
      header: "Organization Name",
      accessor: "name",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.name}</div>
          <div className="text-[11px] text-muted-foreground">slug: {row.slug}</div>
        </div>
      ),
    },
    {
      header: "Join Code",
      accessor: "join_code",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
          {row.join_code || "N/A"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            row.status === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {row.status === "ACTIVE" ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-rose-600" />
          )}
          <span>{row.status}</span>
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleStatus(row)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              row.status === "ACTIVE"
                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            {row.status === "ACTIVE" ? "Suspend" : "Activate"}
          </button>
          <button
            onClick={() => {
              setSelectedOrg(row);
              setIsAdminModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 inline-flex items-center gap-1"
          >
            <UserPlus className="w-3 h-3" />
            <span>Add Admin</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Management"
        description="Provision organizations, assign initial organization administrators, and manage lifecycle status."
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Organization</span>
          </button>
        }
      />

      {inviteUrl && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-emerald-800">
            <Check className="w-4 h-4" />
            <span>Admin Invitation Link Generated:</span>
          </div>
          <div className="font-mono bg-white p-2 rounded border border-emerald-200 break-all select-all text-emerald-800">
            {inviteUrl}
          </div>
          <p className="text-[11px] text-emerald-700">
            Share this link with the organization administrator to complete their setup.
          </p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {["ALL", "ACTIVE", "SUSPENDED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === st
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-card text-muted-foreground hover:bg-slate-100 border border-border"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredOrgs}
        loading={loading}
        emptyMessage="No organizations found matching criteria."
      />

      {/* Create Organization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border max-w-md w-full p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-foreground">Create New Organization</h2>
            <form onSubmit={handleCreateOrg} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Robotics Society"
                  className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="robotics"
                  className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Join Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.join_code}
                    onChange={(e) => setFormData({ ...formData, join_code: e.target.value })}
                    placeholder="ROBO26"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Member Prefix
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.member_number_prefix}
                    onChange={(e) => setFormData({ ...formData, member_number_prefix: e.target.value })}
                    placeholder="ROBO"
                    className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Org Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  placeholder="lead@college.edu"
                  className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700"
                >
                  Create Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Org Admin Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border max-w-sm w-full p-6 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-foreground">
              Add Org Admin for {selectedOrg?.name}
            </h2>
            <form onSubmit={handleAddOrgAdmin} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="newadmin@college.edu"
                  className="w-full px-3 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700"
                >
                  Send Admin Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
