import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react";

import { ProgressRing } from "./ProgressRing";
import { fetchTaskHealthStats, type TaskHealthStats } from "@/lib/tasks-live";

export function TaskHealthWidget() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TaskHealthStats>({
    totalAssignments: 0,
    completed: 0,
    overdue: 0,
    onTime: 0,
    late: 0,
  });

  async function load() {
    try {
      setLoading(true);
      const s = await fetchTaskHealthStats();
      setStats(s);
    } catch (e) {
      console.error("TaskHealthWidget load failed:", e);
      setStats({ totalAssignments: 0, completed: 0, overdue: 0, onTime: 0, late: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // ✅ Smart refresh aligned to :05 and :35 (same concept as sales)
    const scheduleNext = () => {
      const now = new Date();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const ms = now.getMilliseconds();

      // next trigger minute = 5 or 35
      let nextMin = m < 5 ? 5 : m < 35 ? 35 : 65; // 65 => next hour + 5
      const next = new Date(now);
      if (nextMin >= 60) {
        next.setHours(now.getHours() + 1);
        next.setMinutes(5, 2, 0); // 05:02 to allow cron + db settle
      } else {
        next.setMinutes(nextMin, 2, 0); // :05:02 or :35:02
      }
      const delay = next.getTime() - now.getTime();

      const t = window.setTimeout(async () => {
        await load();
        scheduleNext();
      }, Math.max(1000, delay));

      return t;
    };

    const timer = scheduleNext();
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completionRate = useMemo(() => {
    if (!stats.totalAssignments) return 0;
    return Math.round((stats.completed / stats.totalAssignments) * 100);
  }, [stats.completed, stats.totalAssignments]);

  return (
    <div className="dashboard-widget p-6">
      <div className="flex items-center gap-2 mb-6">
        <ListTodo className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Task Execution Health</h3>
      </div>

      <div className="flex items-center gap-8">
        {/* Progress Ring */}
        <ProgressRing
          value={stats.completed}
          max={stats.totalAssignments || 1}
          size="lg"
          label="Completed"
        />

        {/* Stats Grid */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="text-2xl font-bold text-success">
                {loading ? "—" : stats.onTime}
              </p>
              <p className="text-xs text-muted-foreground">On-time</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/5 border border-warning/10">
            <Clock className="h-5 w-5 text-warning" />
            <div>
              <p className="text-2xl font-bold text-warning">
                {loading ? "—" : stats.late}
              </p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/10 col-span-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold text-destructive">
                {loading ? "—" : stats.overdue}
              </p>
              <p className="text-xs text-muted-foreground">Overdue Tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tasks Completed Today</span>
          <span className="font-semibold">
            {loading ? "—" : `${stats.completed} / ${stats.totalAssignments}`}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Completion rate: {loading ? "—" : `${completionRate}%`}
        </div>
      </div>
    </div>
  );
}