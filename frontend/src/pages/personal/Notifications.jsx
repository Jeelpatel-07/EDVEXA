import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { notificationApi } from "../../api";
import {
  Bell,
  CheckCircle2,
  Ticket,
  ShoppingBag,
  CheckSquare,
  ArrowRight,
  CheckCheck,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import LoadingState from "../../components/common/LoadingState";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationApi
      .getNotifications()
      .then((data) => setNotifications(data))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id) => {
    await notificationApi.markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await notificationApi.markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type) => {
    switch (type) {
      case "ticket":
        return <Ticket className="w-4 h-4 text-teal-600" />;
      case "shop":
        return <ShoppingBag className="w-4 h-4 text-blue-600" />;
      case "task":
        return <CheckSquare className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Student Notifications"
        description="Important alerts about your tickets, merchandise pickups, and committee volunteer shifts."
        action={
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Mark All as Read</span>
          </button>
        }
      />

      {loading ? (
        <LoadingState message="Loading your alerts..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You are completely caught up! New alerts will appear here."
        />
      ) : (
        <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden shadow-xs">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => handleMarkRead(item.id)}
              className={`p-4 sm:p-5 flex items-start gap-4 transition-colors cursor-pointer ${
                !item.read ? "bg-teal-50/30" : "hover:bg-slate-50/50"
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-border">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-foreground truncate">
                    {item.title}
                  </h4>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {item.timestamp}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {item.message}
                </p>

                {item.link && (
                  <div className="mt-2.5">
                    <Link
                      to={item.link}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                    >
                      <span>Open Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>

              {!item.read && (
                <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0 mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
