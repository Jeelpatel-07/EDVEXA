import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  User,
  Mail,
  IdCard,
  GraduationCap,
  Shield,
  CreditCard,
  CheckCircle2,
  Lock,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";

export default function Profile() {
  const { user, roles, activeRole, membership } = useAuth();
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Student Profile & Roles"
        description="Your collegiate account details, assigned staff roles, and digital organization credentials."
      />

      {/* Profile Card */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-border">
          <img
            src={
              user?.avatar ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            }
            alt={user?.name || "Student"}
            className="w-20 h-20 rounded-full object-cover border-2 border-teal-600/30 p-0.5"
          />
          <div>
            <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.email} • {user?.studentId}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                {user?.department}
              </span>
              {membership && <StatusBadge status={membership.tier} />}
            </div>
          </div>
        </div>

        {/* Roles Assigned to User */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600" />
            <span>Assigned Organization Roles (Multi-Role Support)</span>
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            In EDVEXA, users can hold multiple responsibilities simultaneously. Your active permissions reflect your chosen role.
          </p>
          <div className="flex flex-wrap gap-2">
            {roles?.map((r) => (
              <span
                key={r}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  activeRole === r
                    ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                    : "bg-slate-50 text-slate-700 border-border"
                }`}
              >
                {r} {activeRole === r && "(Active Context)"}
              </span>
            ))}
          </div>
        </div>

        {/* Academic Details Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Academic Information
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Full Name
              </label>
              <input
                type="text"
                defaultValue={user?.name}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-border rounded-xl"
                readOnly
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Student ID
              </label>
              <input
                type="text"
                defaultValue={user?.studentId}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-border rounded-xl font-mono"
                readOnly
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                College Email
              </label>
              <input
                type="email"
                defaultValue={user?.email}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-border rounded-xl"
                readOnly
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Academic Department
              </label>
              <input
                type="text"
                defaultValue={user?.department}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-border rounded-xl"
                readOnly
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Official university directory synchronized
            </span>
            {saved && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Settings Saved
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
