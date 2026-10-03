import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ticketApi, orderApi, taskApi, announcementApi } from "../../api";
import {
  Ticket,
  CreditCard,
  ShoppingBag,
  CheckSquare,
  FileSpreadsheet,
  Megaphone,
  ArrowRight,
  QrCode,
  Clock,
  Sparkles,
  Shield,
} from "lucide-react";
import StatCard from "../../components/common/StatCard";
import StatusBadge from "../../components/common/StatusBadge";
import QRCode from "../../components/common/QRCode";
import { ROLE_METADATA, PERMISSIONS } from "../../constants/permissions";

export default function Dashboard() {
  const { user, roles, membership, hasStaffAccess, isMember, hasPermission } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    ticketApi.getMyTickets().then((data) => setTickets(data));
    orderApi.getMyOrders().then((data) => setOrders(data));
    taskApi.getMyTasks().then((data) => setTasks(data));
    announcementApi.getAnnouncements().then((data) => setAnnouncements(data.slice(0, 2)));
  }, []);

  const activeTicket = tickets.find((t) => t.status === "ISSUED");

  return (
    <div className="space-y-6">
      {/* Welcome & Member Banner */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {roles.length > 0 ? (
              roles.map((r) => {
                const meta = ROLE_METADATA[r];
                return (
                  <span
                    key={r}
                    className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      meta?.badgeColor || "bg-teal-50 text-teal-700 border-teal-200"
                    }`}
                  >
                    {meta?.name ? meta.name.replace(" Administrator", " Admin") : r}
                  </span>
                );
              })
            ) : (
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                Registered Student
              </span>
            )}

            {isMember() ? (
              <StatusBadge status={membership?.status || "ACTIVE"} />
            ) : (
              <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Guest (Non-Member)
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Welcome back, {user?.name || "Student"}!
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {user?.studentId} • {user?.department}
          </p>

          <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {membership
              ? `You have unlocked ${membership.memberDiscountPercent}% discount across event tickets and official merchandise with your ${membership.planName}.`
              : "Upgrade to a Student Membership to receive 20% discounts on campus event tickets, workshop passes, and official club merchandise."}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {hasStaffAccess && (
              <Link
                to="/app/manage"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span>Open Staff Portal</span>
              </Link>
            )}
            <Link
              to="/app/membership"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Membership Benefits</span>
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              <span>Explore Events</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Tickets"
          value={tickets.filter((t) => t.status === "ISSUED").length}
          subtext="Ready for gate check-in"
          icon={Ticket}
        />
        <StatCard
          title="Membership"
          value={isMember() ? (membership?.tier || "ACTIVE") : "GUEST"}
          subtext={isMember() ? `Expires ${membership?.expiryDate}` : "Standard Student (Non-Member)"}
          icon={CreditCard}
        />
        <StatCard
          title="Orders & Merch"
          value={orders.length}
          subtext={`${orders.filter((o) => o.pickupStatus === "READY_FOR_PICKUP").length} ready for pickup`}
          icon={ShoppingBag}
        />
        {hasPermission(PERMISSIONS.TASKS_UPDATE_OWN) ? (
          <StatCard
            title="Volunteer Shifts"
            value={tasks.filter((t) => t.status !== "COMPLETED").length}
            subtext="Assigned duties"
            icon={CheckSquare}
          />
        ) : (
          <StatCard
            title="Campus Events"
            value="Browse"
            subtext="Workshops & Hackathons"
            icon={Calendar}
          />
        )}
      </div>

      {/* Main Content Layout: Active Pass & Operations */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Next Active Ticket Card with QR Code */}
        <div className="lg:col-span-7 bg-card rounded-2xl border border-border p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Next Digital Event Pass
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Show to gate staff upon arrival
                  </span>
                </div>
              </div>
              {activeTicket && <StatusBadge status={activeTicket.status} />}
            </div>

            {activeTicket ? (
              <div className="mt-5 grid sm:grid-cols-12 gap-6 items-center">
                <div className="sm:col-span-5 flex justify-center">
                  <QRCode value={activeTicket.qrCode} size={150} />
                </div>
                <div className="sm:col-span-7 space-y-2.5 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block">
                      Event
                    </span>
                    <h4 className="font-bold text-sm text-foreground">
                      {activeTicket.eventTitle}
                    </h4>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block">
                      Ticket Tier
                    </span>
                    <span className="font-medium text-teal-700">
                      {activeTicket.ticketTypeName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block">
                      Date & Venue
                    </span>
                    <span className="text-slate-700">
                      {new Date(activeTicket.eventDate).toLocaleDateString()} • {activeTicket.venue}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block">
                      Pass Reference
                    </span>
                    <span className="font-mono text-slate-500">
                      {activeTicket.ticketNumber}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-muted-foreground text-xs">
                You have no upcoming ticket reservations. Browse campus events to reserve your seat!
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
            <Link
              to="/app/tickets"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View All Tickets ({tickets.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/events"
              className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 text-xs font-medium hover:bg-teal-100 transition-colors"
            >
              Book New Ticket
            </Link>
          </div>
        </div>

        {/* Quick Links & Volunteer Tasks */}
        <div className="lg:col-span-5 space-y-6">
          {/* Volunteer Shifts widget (Only shown for volunteers / task assignees) */}
          {hasPermission(PERMISSIONS.TASKS_UPDATE_OWN) && (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-teal-600" />
                  <span>My Volunteer Tasks</span>
                </h3>
                <Link
                  to="/app/tasks"
                  className="text-xs text-teal-600 hover:underline font-medium"
                >
                  View all
                </Link>
              </div>

              <div className="space-y-3">
                {tasks.slice(0, 2).map((t) => (
                  <Link
                    key={t.id}
                    to={`/app/tasks/${t.id}`}
                    className="block p-3 rounded-xl bg-slate-50 hover:bg-teal-50/40 border border-border hover:border-teal-200 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span className="truncate max-w-[200px]">{t.title}</span>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{t.date} • {t.shiftTime}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Bulletins Widget */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-teal-600" />
                <span>Senate Bulletins</span>
              </h3>
              <Link
                to="/app/announcements"
                className="text-xs text-teal-600 hover:underline font-medium"
              >
                All
              </Link>
            </div>

            <div className="space-y-3">
              {announcements.map((a) => (
                <Link
                  key={a.id}
                  to={`/app/announcements/${a.id}`}
                  className="block p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs transition-colors"
                >
                  <h5 className="font-semibold text-foreground line-clamp-1">
                    {a.title}
                  </h5>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {a.content}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
