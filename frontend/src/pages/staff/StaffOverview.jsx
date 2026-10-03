import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  financeApi,
  eventApi,
  claimApi,
  orderApi,
  ticketApi,
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
} from "lucide-react";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";

export default function StaffOverview() {
  const { activeRole, permissions } = useAuth();

  const [finance, setFinance] = useState(null);
  const [events, setEvents] = useState([]);
  const [claims, setClaims] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      financeApi.getSummary(),
      eventApi.getEvents(),
      claimApi.getAllClaims(),
      orderApi.getAllOrders(),
    ])
      .then(([finData, evData, clmData, ordData]) => {
        setFinance(finData);
        setEvents(evData);
        setClaims(clmData);
        setOrders(ordData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading staff control center..." />;

  const pendingClaims = claims.filter((c) => c.status === "UNDER_REVIEW" || c.status === "PENDING");
  const pendingPickups = orders.filter((o) => o.pickupStatus === "READY_FOR_PICKUP");

  return (
    <div className="space-y-6">
      {/* Staff Header */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                Staff Operations Center
              </span>
              <span className="text-xs text-slate-600 font-semibold bg-slate-100 px-2.5 py-0.5 rounded">
                Role: {activeRole}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Executive Organization Governance
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Connected gate check-in, event capacities, merchandise pickups, and financial controls.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {permissions.canCheckIn && (
              <Link
                to="/app/manage/check-in"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs transition-colors"
              >
                <QrCode className="w-4 h-4" />
                <span>Launch Gate Scanner</span>
              </Link>
            )}
            {permissions.canManageEvents && (
              <Link
                to="/app/manage/events/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-border bg-white text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>New Event</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Closing Cash Balance"
          value={finance ? `$${finance.closingCash.toFixed(2)}` : "$0.00"}
          subtext="Verified Organization Treasury"
          icon={DollarSign}
        />
        <StatCard
          title="Active Events"
          value={events.length}
          subtext={`${events.reduce((acc, e) => acc + e.registeredCount, 0)} registered students`}
          icon={Calendar}
        />
        <StatCard
          title="Pending Claims"
          value={pendingClaims.length}
          subtext={finance ? `$${finance.approvedClaimsAwaitingPayment.toFixed(2)} approved awaiting payout` : ""}
          icon={FileSpreadsheet}
        />
        <StatCard
          title="Merch Pickups"
          value={pendingPickups.length}
          subtext="Orders awaiting student desk pickup"
          icon={Package}
        />
      </div>

      {/* Operational Grids */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Active Campus Events & Gate Check-in Shortcut */}
        <div className="lg:col-span-7 bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>Active Event Capacities & Check-in</span>
              </h3>
              <Link
                to="/app/manage/events"
                className="text-xs text-teal-600 hover:underline font-semibold"
              >
                Manage all
              </Link>
            </div>

            <div className="mt-4 space-y-4">
              {events.map((e) => {
                const percent = Math.min(100, Math.round((e.registeredCount / e.capacity) * 100));
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
                      <Link
                        to={`/app/manage/check-in?eventId=${e.id}`}
                        className="inline-flex items-center gap-1 font-bold text-teal-700 hover:underline"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Open Gate Check-in</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Items: Claims to Review & Pickups */}
        <div className="lg:col-span-5 space-y-6">
          {/* Claims Needing Treasurer Review */}
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
              {pendingClaims.slice(0, 3).map((claim) => (
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
              ))}
            </div>
          </div>

          {/* Quick Staff Navigation links */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xs">
            <h3 className="text-sm font-bold text-foreground mb-3">
              Staff Navigation Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                to="/app/manage/members"
                className="p-2.5 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>Member Registry</span>
              </Link>
              <Link
                to="/app/manage/inventory"
                className="p-2.5 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
              >
                <Package className="w-4 h-4 text-teal-600" />
                <span>Stock Inventory</span>
              </Link>
              <Link
                to="/app/manage/finance"
                className="p-2.5 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
              >
                <DollarSign className="w-4 h-4 text-teal-600" />
                <span>Finance Ledger</span>
              </Link>
              <Link
                to="/app/manage/users"
                className="p-2.5 rounded-xl border border-border bg-slate-50 hover:bg-slate-100 flex items-center gap-2 font-medium text-slate-700"
              >
                <Shield className="w-4 h-4 text-teal-600" />
                <span>User Roles</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
