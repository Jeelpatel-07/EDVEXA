import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Building2,
  Users,
  Shield,
  FileText,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  LayoutDashboard,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

export default function PlatformShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { label: "Platform Overview", to: "/platform/dashboard", icon: LayoutDashboard },
    { label: "Organizations & Tenants", to: "/platform/organizations", icon: Building2 },
    { label: "Platform Users", to: "/platform/users", icon: Users },
    { label: "Platform Audit Logs", to: "/platform/audit-logs", icon: FileText },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Platform Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-0 max-lg:-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <Link to="/platform/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-black text-base shadow-xs">
              E
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block leading-none">
                EDVEXA
              </span>
              <span className="text-[10px] tracking-wider uppercase text-purple-400 font-bold">
                Platform Admin
              </span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Indicator */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/40">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
            Governance Scope
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
            <Shield className="w-3.5 h-3.5" />
            <span>Multi-Tenant Master Node</span>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <Link
            to="/app/dashboard"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <span>Open Student App</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/30 text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
              Platform Administration Workspace
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PLATFORM_ADMIN</span>
            </div>
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-foreground leading-none">
                {user?.name || "Sarah Vance"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {user?.email || "platform.admin@edvexa.com"}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
