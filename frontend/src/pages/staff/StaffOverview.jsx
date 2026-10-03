import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  financeApi,
  eventApi,
  claimApi,
  orderApi,
} from "../../api";
import {
  Shield,
  QrCode,
  DollarSign,
  Calendar,
  Package,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Plus,
  Boxes,
  HandHeart,
} from "lucide-react";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import { PERMISSIONS, ROLE_METADATA } from "../../constants/permissions";

export default function StaffOverview() {
  const { roles, hasPermission, organization } = useAuth();

  const [finance, setFinance] = useState(null);
  const [events, setEvents] = useState([]);
  const [claims, setClaims] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const canViewFinance = hasPermission(PERMISSIONS.FINANCE_VIEW);
  const canManageEvents = hasPermission(PERMISSIONS.EVENTS_MANAGE);
  const canCheckIn = hasPermission(PERMISSIONS.TICKETS_CHECKIN);
  const canApproveClaims = hasPermission(PERMISSIONS.EXPENSES_APPROVE);
  const canManageProducts = hasPermission(PERMISSIONS.PRODUCTS_MANAGE);
  const canManageUsers = hasPermission(PERMISSIONS.USERS_MANAGE);

  useEffect(() => {
    const promises = [];
    if (canViewFinance) promises.push(financeApi.getSummary().then(setFinance));
    if (canManageEvents || canCheckIn) promises.push(eventApi.getEvents().then(setEvents));
    if (canApproveClaims) promises.push(claimApi.getAllClaims().then(setClaims));
    if (canManageProducts) promises.push(orderApi.getAllOrders().then(setOrders));

    Promise.allSettled(promises).finally(() => setLoading(false));
  }, [canViewFinance, canManageEvents, canCheckIn, canApproveClaims, canManageProducts]);

  if (loading) return <LoadingState message="Loading staff control center..." />;

  const pendingClaims = claims.filter((c) => c.status === "UNDER_REVIEW" || c.status === "PENDING");
  const pendingPickups = orders.filter((o) => o.pickupStatus === "READY_FOR_PICKUP");

  return (
    <div className="space-y-6">
      {/* Staff Header */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                Staff Operations Center
              </span>
              {roles.map((r) => {
                const meta = ROLE_METADATA[r];
                return (
                  <span
                    key={r}
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                      meta?.badgeColor || "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    {meta?.name ? meta.name.replace(" Administrator", " Admin") : r}
                  </span>
                );
              })}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {organization?.name || "Organization Operations"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Permission-aware executive governance hub. Actions and metrics match your designated committee roles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canCheckIn && (
              <Link
                to="/app/manage/check-in"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>Launch Gate Scanner</span>
              </Link>
            )}
            {canManageEvents && (
              <Link
                to="/app/manage/events/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>New Event</span>
              </Link>
            )}
            {canViewFinance && (
              <Link
                to="/app/manage/finance"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <DollarSign className="w-4 h-4 text-teal-600" />
                <span>Treasury Ledger</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Permission-Aware Metrics Row (Section 43 & 44) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canViewFinance && (
          <StatCard
            title="Closing Cash Balance"
            value={`$${Number(finance?.closingCash ?? finance?.net_balance ?? finance?.closing_cash ?? 0).toFixed(2)}`}
            subtext="Verified Organization Treasury"
            icon={DollarSign}
          />
        )}

        {(canManageEvents || canCheckIn) && (
          <StatCard
            title="Active Events"
            value={events.length}
            subtext={`${events.reduce((acc, e) => acc + (e.registeredCount || 0), 0)} registered students`}
            icon={Calendar}
          />
        )}

        {canApproveClaims && (
          <StatCard
            title="Claims Needing Review"
            value={pendingClaims.length}
            subtext={finance ? `$${Number(finance?.approvedClaimsAwaitingPayment ?? finance?.pending_claims_amount ?? 0).toFixed(2)} awaiting payment` : "Pending audit"}
            icon={FileSpreadsheet}
          />
        )}

        {canManageProducts && (
          <StatCard
            title="Merch Pickups"
            value={pendingPickups.length}
            subtext="Orders awaiting student desk pickup"
            icon={Package}
          />
        )}
      </div>

      {/* Operational Grids strictly filtered by permission */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Events & Check-in section (Visible to Event Manager, Gate Staff, Org Admin) */}
        {(canManageEvents || canCheckIn) && (
          <div className={`${canApproveClaims || canViewFinance ? "lg:col-span-7" : "lg:col-span-12"} bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Active Event Capacities & Door Check-in</span>
                </h3>
                {canManageEvents && (
                  <Link
                    to="/app/manage/events"
                    className="text-xs text-teal-600 hover:underline font-semibold"
                  >
                    Manage all events
                  </Link>
                )}
              </div>

              <div className="mt-4 space-y-4">
                {events.map((e) => {
                  const percent = Math.min(100, Math.round(((e.registeredCount || 0) / (e.capacity || 1)) * 100));
                  return (
                    <div
                      key={e.id}
                      className="p-4 rounded-xl bg-slate-50 border border-border space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-foreground text-sm truncate max-w-[260px]">
                          {e.title}
                        </h4>
                        <span className="font-semibold text-teal-700">
                          {e.registeredCount} / {e.capacity} seats ({percent}%)
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-teal-600 h-2 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground pt-1">
                        <span>{e.venue}</span>
                        {canCheckIn && (
                          <Link
                            to={`/app/manage/check-in?eventId=${e.id}`}
                            className="inline-flex items-center gap-1 font-bold text-teal-700 hover:underline"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Scan Attendees</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Action Items: Claims to Review & Permitted Shortcuts */}
        <div className={`${canManageEvents || canCheckIn ? "lg:col-span-5" : "lg:col-span-12"} space-y-6`}>
          {/* Claims Needing Treasurer Review (Section 26 & 44: ONLY for Org Admin & Treasurer) */}
          {canApproveClaims && (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                  <span>Claims Awaiting Review</span>
                </h3>
                <Link
                  to="/app/manage/claims"
                  className="text-xs text-teal-600 hover:underline font-semibold"
                >
                  Review ({pendingClaims.length})
                </Link>
              </div>

              <div className="space-y-2.5">
                {pendingClaims.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No pending expense claims to audit.</p>
                ) : (
                  pendingClaims.slice(0, 3).map((claim) => (
                    <Link
                      key={claim.id}
                      to={`/app/manage/claims/${claim.id}`}
                      className="block p-3 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-border hover:border-teal-200 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-foreground">
                        <span className="truncate max-w-[180px]">{claim.purpose}</span>
                        <span className="text-teal-700 font-bold">${claim.amount.toFixed(2)}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>By {claim.claimantName}</span>
                        <StatusBadge status={claim.status} />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Permitted Staff Navigation Shortcuts (Section 44: Do not show unauthorized sections) */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xs">
            <h3 className="text-sm font-bold text-foreground mb-3">
              Permitted Staff Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {canCheckIn && (
                <Link
                  to="/app/manage/check-in"
                  className="p-2.5 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
                >
                  <QrCode className="w-4 h-4 text-teal-600" />
                  <span>Door Check-in</span>
                </Link>
              )}
              {canManageEvents && (
                <Link
                  to="/app/manage/events"
                  className="p-2.5 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
                >
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>Events Control</span>
                </Link>
              )}
              {canManageProducts && (
                <Link
                  to="/app/manage/products"
                  className="p-2.5 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
                >
                  <Package className="w-4 h-4 text-teal-600" />
                  <span>Products</span>
                </Link>
              )}
              {canViewFinance && (
                <Link
                  to="/app/manage/finance"
                  className="p-2.5 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
                >
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  <span>Finance & Ledger</span>
                </Link>
              )}
              {canManageUsers && (
                <Link
                  to="/app/manage/users"
                  className="p-2.5 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
                >
                  <Shield className="w-4 h-4 text-teal-600" />
                  <span>Users & Roles</span>
                </Link>
              )}
              {canApproveClaims && (
                <Link
                  to="/app/manage/claims"
                  className="p-2.5 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
                >
                  <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                  <span>Audit Claims</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
