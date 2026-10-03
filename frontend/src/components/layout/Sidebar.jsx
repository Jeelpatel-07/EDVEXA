import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { PERMISSIONS, ROLES, ROLE_METADATA } from "../../constants/permissions";
import {
  LayoutDashboard,
  CreditCard,
  Calendar,
  Ticket,
  ShoppingBag,
  ShoppingCart,
  Receipt,
  CheckSquare,
  FileSpreadsheet,
  Megaphone,
  Bell,
  User,
  Shield,
  QrCode,
  Package,
  Boxes,
  HandHeart,
  DollarSign,
  BarChart3,
  Users,
  ExternalLink,
  Building2,
} from "lucide-react";

export default function Sidebar({ onCloseMobile }) {
  const location = useLocation();
  const {
    user,
    roles,
    permissions,
    hasPermission,
    hasStaffAccess,
    isPlatformAdmin,
    isMember,
    isGuest,
  } = useAuth();
  const { cartCount } = useCart();

  const isStaffRoute = location.pathname.startsWith("/app/manage");

  // Personal Workspace items (Section 24: Available to every authenticated organization user)
  const personalItems = [
    { label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard },
    { label: "Membership", to: "/app/membership", icon: CreditCard },
    { label: "Events", to: "/events", icon: Calendar },
    { label: "My Tickets", to: "/app/tickets", icon: Ticket },
    { label: "Shop", to: "/app/shop", icon: ShoppingBag },
    {
      label: "Cart",
      to: "/app/cart",
      icon: ShoppingCart,
      badge: cartCount > 0 ? cartCount : null,
    },
    { label: "My Orders", to: "/app/orders", icon: Receipt },
    // Show tasks only if user has tasks.update_own (Volunteers, Leads)
    ...(hasPermission(PERMISSIONS.TASKS_UPDATE_OWN)
      ? [{ label: "My Tasks", to: "/app/tasks", icon: CheckSquare }]
      : []),
    // Show claims submission if user has expenses.submit
    ...(hasPermission(PERMISSIONS.EXPENSES_SUBMIT)
      ? [{ label: "My Claims", to: "/app/claims", icon: FileSpreadsheet }]
      : []),
    { label: "Announcements", to: "/app/announcements", icon: Megaphone },
    { label: "Notifications", to: "/app/notifications", icon: Bell },
    { label: "Profile", to: "/app/profile", icon: User },
  ];

  // Staff Workspace items strictly filtered by the Absolute Permission Matrix (Section 23)
  const staffConfig = [
    {
      label: "Overview",
      to: "/app/manage",
      icon: LayoutDashboard,
      allowed: hasStaffAccess,
    },
    {
      label: "Users & Roles",
      to: "/app/manage/users",
      icon: Shield,
      allowed: hasPermission(PERMISSIONS.USERS_ASSIGN_ROLE) || hasPermission(PERMISSIONS.USERS_VIEW),
    },
    {
      label: "Members",
      to: "/app/manage/members",
      icon: Users,
      allowed: hasPermission(PERMISSIONS.MEMBERS_VIEW),
    },
    {
      label: "Membership Plans",
      to: "/app/manage/membership-plans",
      icon: CreditCard,
      allowed: hasPermission(PERMISSIONS.MEMBERSHIP_PLANS_MANAGE),
    },
    {
      label: "Events",
      to: "/app/manage/events",
      icon: Calendar,
      allowed: hasPermission(PERMISSIONS.EVENTS_CREATE) || hasPermission(PERMISSIONS.EVENTS_UPDATE),
    },
    {
      label: "Gate Check-in",
      to: "/app/manage/check-in",
      icon: QrCode,
      allowed: hasPermission(PERMISSIONS.TICKETS_SCAN),
    },
    {
      label: "Products",
      to: "/app/manage/products",
      icon: Package,
      allowed: hasPermission(PERMISSIONS.PRODUCTS_MANAGE),
    },
    {
      label: "Inventory",
      to: "/app/manage/inventory",
      icon: Boxes,
      allowed: hasPermission(PERMISSIONS.PRODUCTS_MANAGE_STOCK),
    },
    {
      label: "Orders",
      to: "/app/manage/orders",
      icon: Receipt,
      allowed: hasPermission(PERMISSIONS.ORDERS_VIEW_ALL),
    },
    {
      label: "Announcements",
      to: "/app/manage/announcements",
      icon: Megaphone,
      allowed: hasPermission(PERMISSIONS.ANNOUNCEMENTS_CREATE),
    },
    {
      label: "Fundraisers",
      to: "/app/manage/fundraisers",
      icon: HandHeart,
      allowed: hasPermission(PERMISSIONS.FUNDRAISERS_MANAGE),
    },
    {
      label: "Expense Claims",
      to: "/app/manage/claims",
      icon: FileSpreadsheet,
      allowed: hasPermission(PERMISSIONS.EXPENSES_APPROVE),
    },
    {
      label: "Finance & Ledger",
      to: "/app/manage/finance",
      icon: DollarSign,
      allowed: hasPermission(PERMISSIONS.FINANCE_VIEW) || hasPermission(PERMISSIONS.FINANCE_VIEW_SUMMARY),
    },
    {
      label: "Reports",
      to: "/app/manage/reports",
      icon: BarChart3,
      allowed: hasPermission(PERMISSIONS.FINANCE_REPORT) || hasPermission(PERMISSIONS.FINANCE_VIEW),
    },
  ];

  const isPureGateStaff = roles.length === 1 && roles.includes(ROLES.GATE_STAFF);
  const isPureVolunteer = roles.length === 1 && roles.includes(ROLES.VOLUNTEER);

  let currentItems = isStaffRoute
    ? staffConfig.filter((i) => i.allowed)
    : personalItems;

  if (isPureGateStaff) {
    currentItems = [
      { label: "Gate Scanner", to: "/app/manage/check-in", icon: QrCode },
      { label: "Profile", to: "/app/profile", icon: User },
    ];
  } else if (isPureVolunteer) {
    currentItems = [
      { label: "My Tasks", to: "/app/tasks", icon: CheckSquare },
      { label: "My Expenses", to: "/app/claims", icon: FileSpreadsheet },
      { label: "Profile", to: "/app/profile", icon: User },
    ];
  }

  const showStaffSwitcher = hasStaffAccess && !isPureGateStaff && !isPureVolunteer;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-border flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 font-bold text-lg text-foreground hover:opacity-90"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-black text-base shadow-xs">
            E
          </div>
          <div className="flex flex-col">
            <span className="leading-tight tracking-tight text-foreground font-extrabold text-base">
              EDVEXA
            </span>
            <span className="text-[10px] tracking-wider uppercase text-teal-700 font-semibold">
              Student Org
            </span>
          </div>
        </Link>
      </div>

      {/* Platform Admin Banner if user is Platform Admin (Section 11) */}
      {isPlatformAdmin() && (
        <div className="p-3 border-b border-purple-200 bg-purple-50/70">
          <Link
            to="/platform/dashboard"
            onClick={onCloseMobile}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>Platform Control</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </Link>
        </div>
      )}

      {/* Workspace Switcher Pill (Personal vs Staff) */}
      {showStaffSwitcher && (
        <div className="p-3 border-b border-border bg-slate-50/60">
          <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-lg text-xs font-medium">
            <Link
              to="/app/dashboard"
              onClick={onCloseMobile}
              className={`py-1.5 px-2 text-center rounded-md transition-all ${
                !isStaffRoute
                  ? "bg-white text-teal-800 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Personal
            </Link>
            <Link
              to="/app/manage"
              onClick={onCloseMobile}
              className={`py-1.5 px-2 text-center rounded-md transition-all flex items-center justify-center gap-1 ${
                isStaffRoute
                  ? "bg-teal-600 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Shield className="w-3 h-3" />
              Staff
            </Link>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>{isStaffRoute ? "Staff Management" : "Personal Workspace"}</span>
          <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
            {isMember() ? "Member" : "Guest"}
          </span>
        </div>

        {currentItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.to ||
            (item.to !== "/app/dashboard" &&
              item.to !== "/app/manage" &&
              location.pathname.startsWith(item.to));

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-teal-50 text-teal-800 font-semibold border-r-2 border-teal-600"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? "text-teal-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-teal-600 text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer link to public portal */}
      <div className="p-3 border-t border-border bg-slate-50/40 text-xs">
        <Link
          to="/"
          className="flex items-center justify-between p-2 rounded-lg text-slate-600 hover:bg-white hover:text-teal-700 transition-colors"
        >
          <span className="font-medium">Public Portal</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
}
