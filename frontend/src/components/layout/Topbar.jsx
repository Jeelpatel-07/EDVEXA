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
} from "lucide-react";

export default function Topbar({ onOpenMobile }) {
  const { user, activeRole, roles, switchActiveRole, logout, membership } =
    useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const roleMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target)) {
        setRoleMenuOpen(false);
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

  return (
    <header className="h-16 bg-card border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile hamburger & Organization info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          type="button"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="font-semibold text-foreground">
            Collegiate Student Council
          </span>
          <span className="text-slate-300">•</span>
          {membership ? (
            <span className="inline-flex items-center gap-1 font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              <CreditCard className="w-3 h-3" />
              {membership.planName}
            </span>
          ) : (
            <Link
              to="/app/membership/plans"
              className="text-teal-600 hover:underline font-medium"
            >
              Get Membership
            </Link>
          )}
        </div>
      </div>

      {/* Right: Role Switcher & User Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Multi-Role Switcher (Evaluator & Multi-Role Support) */}
        <div className="relative" ref={roleMenuRef}>
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
            title="Switch active role context"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden md:inline text-muted-foreground">Role:</span>
            <span className="font-semibold text-foreground">{activeRole}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-card rounded-xl border border-border shadow-lg py-1.5 z-40 text-xs">
              <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                Switch Role Context
              </div>
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    switchActiveRole(role);
                    setRoleMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
                    activeRole === role
                      ? "text-teal-700 font-bold bg-teal-50/50"
                      : "text-slate-700 font-medium"
                  }`}
                >
                  <span>{role}</span>
                  {activeRole === role && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                  )}
                </button>
              ))}
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

        {/* User Dropdown */}
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
                {user?.studentId || "EDVEXA Member"}
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
            <div className="absolute right-0 mt-1.5 w-56 bg-card rounded-xl border border-border shadow-lg py-2 z-40 text-xs">
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
                  Membership Details
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
