import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  Menu,
  Bell,
  ShoppingCart,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  CreditCard,
  Building2,
  Users,
  Check,
} from "lucide-react";
import { ROLE_METADATA, ROLES } from "../../constants/permissions";
import { MOCK_ORGANIZATIONS } from "../../api/mockData";

export default function Topbar({ onOpenMobile }) {
  const {
    user,
    organization,
    roles,
    membership,
    isMember,
    isGuest,
    isPlatformAdmin,
    personaKey,
    loginAsPersona,
    switchOrganization,
    logout,
  } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const [personaMenuOpen, setPersonaMenuOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const personaMenuRef = useRef(null);
  const orgMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (personaMenuRef.current && !personaMenuRef.current.contains(e.target)) {
        setPersonaMenuOpen(false);
      }
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target)) {
        setOrgMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSelectPersona = async (key) => {
    setPersonaMenuOpen(false);
    await loginAsPersona(key);
    // If switching to platform admin, navigate to /platform/dashboard, else /app/dashboard
    if (key === "DEMO_PLATFORM_ADMIN") {
      navigate("/platform/dashboard");
    } else {
      navigate("/app/dashboard");
    }
  };

  const handleSwitchOrg = async (orgId) => {
    setOrgMenuOpen(false);
    await switchOrganization(orgId);
    navigate("/app/dashboard");
  };

  // Demo personas catalog for judges & evaluators (Section 21 & 45)
  const demoPersonas = [
    {
      key: "DEMO_PLATFORM_ADMIN",
      title: "Platform Admin",
      subtitle: "EDVEXA platform management",
      badge: "PLATFORM",
      color: "text-purple-700 bg-purple-50 border-purple-200",
    },
    {
      key: "DEMO_ORG_ADMIN",
      title: "Org Admin",
      subtitle: "All org operations & user roles",
      badge: "ORG ADMIN",
      color: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      key: "DEMO_TREASURER",
      title: "Treasurer",
      subtitle: "Finance, claims approval, payouts",
      badge: "TREASURER",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      key: "DEMO_EVENT_MANAGER",
      title: "Event Manager",
      subtitle: "Events, tickets, products, Read-Only Finance",
      badge: "EVENT MGR",
      color: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      key: "DEMO_GATE_STAFF",
      title: "Gate Staff",
      subtitle: "Rapid ticket scanning & door check-in",
      badge: "GATE STAFF",
      color: "text-indigo-700 bg-indigo-50 border-indigo-200",
    },
    {
      key: "DEMO_VOLUNTEER",
      title: "Volunteer",
      subtitle: "Own tasks & expense submissions",
      badge: "VOLUNTEER",
      color: "text-teal-700 bg-teal-50 border-teal-200",
    },
    {
      key: "DEMO_MEMBER",
      title: "Active Member",
      subtitle: "Active Gold pass & member pricing",
      badge: "MEMBER",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      key: "DEMO_GUEST",
      title: "Guest Student",
      subtitle: "Registered non-member student",
      badge: "GUEST",
      color: "text-slate-700 bg-slate-100 border-slate-200",
    },
    {
      key: "DEMO_ORG_ADMIN_TREASURER_MEMBER",
      title: "Admin + Treasurer",
      subtitle: "Multi-Role: Org Admin + Treasurer + Member",
      badge: "MULTI-ROLE",
      color: "text-violet-700 bg-violet-50 border-violet-200",
    },
    {
      key: "DEMO_EVENT_MANAGER_VOLUNTEER_MEMBER",
      title: "Event Mgr + Volunteer",
      subtitle: "Multi-Role: Event Manager + Volunteer + Member",
      badge: "MULTI-ROLE",
      color: "text-cyan-700 bg-cyan-50 border-cyan-200",
    },
  ];

  return (
    <header className="h-16 bg-card border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile hamburger & Organization context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          type="button"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Tenant Organization Context & Switcher (Section 29) */}
        <div className="relative" ref={orgMenuRef}>
          <button
            onClick={() => setOrgMenuOpen(!orgMenuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
            title="Current Organization Workspace"
          >
            <div className="w-6 h-6 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-teal-700" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-foreground leading-tight flex items-center gap-1.5">
                <span>{organization?.name || (isPlatformAdmin() ? "EDVEXA Platform" : "No Organization")}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="text-[10px] text-muted-foreground">
                {organization?.code ? `Org Code: ${organization.code}` : "Platform Governance"}
              </div>
            </div>
          </button>

          {/* Org Switcher Menu */}
          {orgMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-card rounded-xl border border-border shadow-lg py-1.5 z-40 text-xs">
              <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                Switch Organization Workspace
              </div>
              {MOCK_ORGANIZATIONS.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrg(org.id)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
                    organization?.id === org.id
                      ? "text-teal-700 font-bold bg-teal-50/50"
                      : "text-slate-700 font-medium"
                  }`}
                >
                  <div>
                    <div className="font-semibold">{org.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Status: <span className={org.status === "ACTIVE" ? "text-emerald-600" : "text-rose-600"}>{org.status}</span>
                    </div>
                  </div>
                  {organization?.id === org.id && (
                    <Check className="w-4 h-4 text-teal-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Membership Badge (Section 8: Derived status) */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-slate-300">•</span>
          {isMember() ? (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-xs">
              <CreditCard className="w-3 h-3" />
              <span>{membership?.planName || "Active Member"}</span>
            </span>
          ) : (
            <Link
              to="/app/membership/plans"
              className="inline-flex items-center gap-1 font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-xs hover:bg-amber-100"
            >
              <span>Guest (Get Membership)</span>
            </Link>
          )}
        </div>
      </div>

      {/* Right: Explicit Role Badges, Demo Personas Switcher & User Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Section 42: UI Role Indicators (Displaying combined actual roles) */}
        <div className="hidden xl:flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1">
            Access:
          </span>
          {roles.map((r) => {
            const meta = ROLE_METADATA[r];
            return (
              <span
                key={r}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  meta?.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {meta?.name ? meta.name.replace(" Administrator", " Admin") : r}
              </span>
            );
          })}
        </div>

        {/* Demo Personas Switcher (Section 21 & 45: Authenticates actual demo sessions) */}
        <div className="relative" ref={personaMenuRef}>
          <button
            onClick={() => setPersonaMenuOpen(!personaMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-100/70 text-xs font-semibold text-teal-800 transition-colors shadow-2xs"
            title="Switch Demo Persona for evaluation"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline text-teal-700 text-[11px] font-medium">Demo Persona:</span>
            <span className="font-bold text-foreground">
              {personaKey
                ? demoPersonas.find((p) => p.key === personaKey)?.badge || "Custom"
                : roles[0] || (isMember() ? "Member" : "Guest")}
            </span>
            <ChevronDown className="w-3 h-3 text-teal-600" />
          </button>

          {personaMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-72 bg-card rounded-xl border border-border shadow-xl py-2 z-50 text-xs max-h-[85vh] overflow-y-auto">
              <div className="px-3 py-1.5 border-b border-border">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block">
                  Select Demo Persona
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Logs into preconfigured demo accounts with authoritative RBAC sessions.
                </p>
              </div>

              <div className="py-1">
                {demoPersonas.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handleSelectPersona(p.key)}
                    className={`w-full text-left px-3 py-2 flex items-start justify-between gap-2 hover:bg-slate-50 transition-colors ${
                      personaKey === p.key ? "bg-teal-50/70" : ""
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">{p.title}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${p.color}`}>
                          {p.badge}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        {p.subtitle}
                      </div>
                    </div>
                    {personaKey === p.key && (
                      <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0 mt-1.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <Link
          to="/app/notifications"
          className="p-2 rounded-lg text-slate-600 hover:text-foreground hover:bg-slate-100 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-600 rounded-full" />
        </Link>

        {/* Cart Icon (Personal shopping cart) */}
        <Link
          to="/app/cart"
          className="p-2 rounded-lg text-slate-600 hover:text-foreground hover:bg-slate-100 transition-colors relative"
          title="Merchandise Cart"
        >
          <ShoppingCart className="w-4 h-4" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-teal-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-slate-100 transition-colors text-left"
          >
            <div className="hidden md:block text-right">
              <div className="text-xs font-semibold text-foreground leading-none">
                {user?.name || "Student"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {user?.studentId || "Student Member"}
              </div>
            </div>
            <img
              src={
                user?.avatar ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              }
              alt={user?.name || "Avatar"}
              className="w-8 h-8 rounded-full object-cover border border-border"
            />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-60 bg-card rounded-xl border border-border shadow-lg py-2 z-40 text-xs">
              <div className="px-4 py-2 border-b border-border">
                <div className="font-semibold text-foreground text-sm">
                  {user?.name}
                </div>
                <div className="text-muted-foreground text-xs">{user?.email}</div>
                <div className="text-[11px] text-teal-700 font-medium mt-1">
                  {user?.department}
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/app/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  My Profile
                </Link>
                <Link
                  to="/app/membership"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  Membership & Benefits
                </Link>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
