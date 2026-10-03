import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
  Menu,
  Bell,
  ShoppingCart,
  ChevronDown,
  User,
  LogOut,
  Building2,
  Shield,
  CreditCard,
} from "lucide-react";
import { ROLE_METADATA } from "../../constants/permissions";

export default function Topbar({ onOpenMobile }) {
  const {
    user,
    organization,
    roles,
    membership,
    isMember,
    isPlatformAdmin,
    logout,
  } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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

        {/* Tenant Organization Context */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left">
          <div className="w-7 h-7 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-teal-700" />
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-bold text-foreground leading-tight">
              {organization?.name || (isPlatformAdmin() ? "EDVEXA Platform" : "EDVEXA Student Association")}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {organization?.code ? `Org Code: ${organization.code}` : "Platform Operations"}
            </div>
          </div>
        </div>

        {/* Membership Badge */}
        {!isPlatformAdmin() && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-slate-300">•</span>
            {isMember() ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-xs">
                <CreditCard className="w-3 h-3" />
                <span>{membership?.plan_name || membership?.planName || "Active Member"}</span>
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
        )}
      </div>

      {/* Right: Explicit Role Badges & User Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Role Badges */}
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

        {/* Notifications Icon */}
        <Link
          to="/app/notifications"
          className="p-2 rounded-lg text-slate-600 hover:text-foreground hover:bg-slate-100 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-teal-600 rounded-full" />
        </Link>

        {/* Cart Icon */}
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
            title="User Account Menu"
          >
            <div className="hidden md:block text-right">
              <div className="text-xs font-bold text-foreground leading-tight">
                {user?.full_name || user?.name || "Student User"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {user?.email || "user@edvexa.edu"}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {getInitials(user?.full_name || user?.name)}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-card rounded-xl border border-border shadow-lg py-1.5 z-50 text-xs">
              <div className="px-3 py-2 border-b border-border">
                <div className="font-bold text-foreground">
                  {user?.full_name || user?.name}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {user?.email}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {roles.map((r) => (
                    <span
                      key={r}
                      className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/app/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-slate-700 font-medium"
                >
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>My Profile</span>
                </Link>
                {isPlatformAdmin() && (
                  <Link
                    to="/platform/dashboard"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-purple-700 font-semibold"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    <span>Platform Admin</span>
                  </Link>
                )}
              </div>

              <div className="border-t border-border pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 font-medium text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
