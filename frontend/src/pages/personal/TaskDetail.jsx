import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { taskApi } from "../../api";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  CheckSquare,
} from "lucide-react";
import Breadcrumbs from "../../components/common/Breadcrumbs";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";

export default function TaskDetail() {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    taskApi
      .getTaskById(taskId)
      .then((data) => setTask(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await taskApi.updateTaskStatus(task.id, newStatus);
      setTask({ ...task, status: newStatus });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingState message="Loading shift details..." />;
  if (error || !task) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <ErrorState
          title="Task Not Found"
          message="Could not find the requested volunteer assignment."
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Volunteer Tasks", to: "/app/tasks" },
          { label: task.title },
        ]}
      />

      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-2">
          <div>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
              {task.event}
            </span>
            <h1 className="text-xl font-bold text-foreground mt-2">
              {task.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={task.priority} />
            <StatusBadge status={task.status} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-border text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Shift Date</span>
            <span className="font-semibold text-foreground">{task.date}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Shift Hours</span>
            <span className="font-semibold text-foreground">{task.shiftTime}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Assigned Volunteer</span>
            <span className="font-semibold text-foreground">{task.assignedTo}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Shift Lead</span>
            <span className="font-semibold text-foreground">{task.lead || "Unassigned"}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Duty Instructions
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {task.description}
          </p>
        </div>

        {task.requiredItems && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Required Equipment / Checklists
            </h3>
            <ul className="space-y-2 text-xs text-slate-700">
              {task.requiredItems.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            to="/app/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Tasks</span>
          </Link>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {task.status !== "IN_PROGRESS" && task.status !== "COMPLETED" && (
              <button
                onClick={() => handleUpdateStatus("IN_PROGRESS")}
                disabled={updating}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-teal-600 text-teal-700 bg-teal-50 text-xs font-bold hover:bg-teal-100"
              >
                Mark Shift In-Progress
              </button>
            )}
            {task.status !== "COMPLETED" && (
              <button
                onClick={() => handleUpdateStatus("COMPLETED")}
                disabled={updating}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-xs"
              >
                Mark Shift Completed
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
