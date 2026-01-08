import { useEffect, useMemo, useState } from "react";
import { Calendar, ClipboardCheck, Mail, DollarSign, AlertCircle } from "lucide-react";

import { StatCard } from "@/components/dashboard/StatCard";
import { TaskHealthWidget } from "@/components/dashboard/TaskHealthWidget";
import { CommunicationWidget } from "@/components/dashboard/CommunicationWidget";
import { PerformanceWidget } from "@/components/dashboard/PerformanceWidget";

import { fetchCommsHealthStats } from "@/lib/comms-live";
import { fetchTaskHealthStats, fetchPendingApprovalsCount } from "@/lib/tasks-live";

// ✅ LIVE performance (for Sales card)
import { fetchTodayPerformance } from "@/lib/performance-data";

// ✅ get ALL stores (ignore selected store filter for HQ dashboard)
import { useStoreFilter } from "@/contexts/StoreFilterContext";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  // ✅ HQ dashboard uses ALL stores
  const { allStores } = useStoreFilter();

  const storeCodes = useMemo(() => {
    return ((allStores as any[]) ?? [])
      .map((s) => s?.code)
      .filter(Boolean);
  }, [allStores]);

  // Live task card values
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Live comms card values
  const [commsRead, setCommsRead] = useState(0);
  const [commsTotal, setCommsTotal] = useState(0);
  const [commsPct, setCommsPct] = useState(0);

  // ✅ Live sales card values
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesPct, setSalesPct] = useState(0);

  async function load() {
    try {
      setLoading(true);

      const [taskStats, pending, comms, perf] = await Promise.all([
        fetchTaskHealthStats(),
        fetchPendingApprovalsCount(),
        fetchCommsHealthStats(),
        storeCodes.length ? fetchTodayPerformance(storeCodes) : Promise.resolve(null),
      ]);

      // Tasks
      setTasksCompleted(taskStats.completed);
      setTasksTotal(taskStats.totalAssignments);
      setPendingApprovals(pending);

      // Comms
      setCommsRead(comms.readCount);
      setCommsTotal(comms.totalDeliveries);
      setCommsPct(comms.readPercentage);

      // ✅ Sales card
      if (perf) {
        setSalesTotal(perf.totalSales || 0);
        setSalesPct(perf.percentage || 0);
      } else {
        setSalesTotal(0);
        setSalesPct(0);
      }
    } catch (e) {
      console.error("Dashboard load failed:", e);
      // keep last values (no crash)
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // ✅ Smart refresh aligned to :05 and :35
    const scheduleNext = () => {
      const now = new Date();
      const m = now.getMinutes();

      const nextMin = m < 5 ? 5 : m < 35 ? 35 : 65;
      const next = new Date(now);

      if (nextMin >= 60) {
        next.setHours(now.getHours() + 1);
        next.setMinutes(5, 2, 0); // +2 sec buffer
      } else {
        next.setMinutes(nextMin, 2, 0); // +2 sec buffer
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
  }, [storeCodes.join(",")]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Today's Overview</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tasks Completed"
          value={loading ? "—" : `${tasksCompleted}/${tasksTotal}`}
          subtitle="Today"
          icon={<ClipboardCheck className="h-5 w-5" />}
          variant="primary"
        />

        <StatCard
          title="Messages Read"
          value={loading ? "—" : `${commsRead}/${commsTotal}`}
          subtitle={loading ? "—" : `${commsPct}% read rate`}
          icon={<Mail className="h-5 w-5" />}
          variant="success"
        />

        {/* ✅ NOW LIVE */}
        <StatCard
          title="Today's Sales"
          value={loading ? "—" : inr(salesTotal)}
          subtitle={loading ? "—" : `${salesPct}% of target`}
          icon={<DollarSign className="h-5 w-5" />}
          variant="primary"
        />

        <StatCard
          title="Pending Approvals"
          value={loading ? "—" : String(pendingApprovals)}
          subtitle="Proofs to review"
          icon={<AlertCircle className="h-5 w-5" />}
          variant="warning"
        />
      </div>

      {/* Main Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaskHealthWidget />
        <CommunicationWidget />
      </div>

      <div className="grid grid-cols-1 gap-6">
  <PerformanceWidget />
</div>
    </div>
  );
}
