import { useState } from "react";
import { MOCK_ORGANIZATIONS } from "../../api/mockData";
import {
  Building2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import DataTable from "../../components/common/DataTable";

export default function PlatformOrganizations() {
  const [orgs, setOrgs] = useState(MOCK_ORGANIZATIONS);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Organization Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    adminEmail: "",
    category: "Student Council",
  });

  const handleToggleStatus = (orgId) => {
    setOrgs((prev) =>
      prev.map((o) => {
        if (o.id === orgId) {
          const newStatus = o.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
          return { ...o, status: newStatus };
        }
        return o;
      })
    );
  };

  const handleCreateOrg = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.adminEmail) return;

    const newOrg = {
      id: "org-" + formData.code.toLowerCase(),
      name: formData.name,
      code: formData.code.toUpperCase(),
      status: "ACTIVE",
      adminEmail: formData.adminEmail,
      createdAt: new Date().toISOString().split("T")[0],
      memberCount: 0,
      currency: "USD",
      category: formData.category,
    };

    setOrgs([newOrg, ...orgs]);
    setIsModalOpen(false);
    setFormData({ name: "", code: "", adminEmail: "", category: "Student Council" });
    alert(`Organization "${newOrg.name}" successfully created and provisioned!`);
  };

  const filteredOrgs = orgs.filter((o) => {
    const matchesFilter = filter === "ALL" || o.status === filter;
    const matchesSearch =
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.code.toLowerCase().includes(search.toLowerCase()) ||
      o.adminEmail.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const columns = [
    {
      header: "Organization Name",
      accessor: "name",
      render: (row) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.name}</div>
          <div className="text-[11px] text-muted-foreground">{row.category}</div>
        </div>
      ),
    },
    {
      header: "Org Code",
      accessor: "code",
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
          {row.code}
        </span>
      ),
    },
    {
      header: "Lead Administrator",
      accessor: "adminEmail",
      render: (row) => <span className="text-xs text-slate-700">{row.adminEmail}</span>,
    },
    {
      header: "Enrolled Members",
      accessor: "memberCount",
      render: (row) => (
        <span className="text-xs font-semibold text-foreground">
          {row.memberCount || 0} students
        </span>
      ),
    },
    {
      header: "Created Date",
      accessor: "createdAt",
      render: (row) => <span className="text-xs text-muted-foreground">{row.createdAt}</span>,
    },
    {
      header: "Tenant Status",
      accessor: "status",
      render: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
            row.status === "ACTIVE"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Platform Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleStatus(row.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              row.status === "ACTIVE"
                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            {row.status === "ACTIVE" ? "Suspend Workspace" : "Activate Workspace"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations & Multi-Tenant Isolation"
        description="Provision new university student associations, configure security policies, and manage operational lifecycles."
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

      {/* Filter and Search Bar */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["ALL", "ACTIVE", "SUSPENDED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                filter === st
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30"
          />
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
        <DataTable columns={columns} data={filteredOrgs} emptyMessage="No organizations matching filter criteria." />
      </div>

      {/* Create Organization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground">
                Provision New Organization
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Organization Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graduate Robotics Society"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Org Code (3-4 chars)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="e.g. GRS"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-purple-600/30"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30"
                  >
                    <option value="Student Council">Student Council</option>
                    <option value="Academic Society">Academic Society</option>
                    <option value="Sports & Athletics">Sports & Athletics</option>
                    <option value="Arts & Media">Arts & Media</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Lead Administrator Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="lead.admin@college.edu"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/30"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-[11px] leading-relaxed">
                Creating this organization will provision an isolated tenant ID, assign default role structures, and emit an invitation link to the lead administrator.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-border text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-xs"
                >
                  Provision Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
