import { useEffect, useMemo, useState } from "react";
import { Mail, Eye, EyeOff } from "lucide-react";
import { ProgressRing } from "./ProgressRing";
import { Progress } from "@/components/ui/progress";

import { fetchCommsHealthStats, type CommsHealthStats } from "@/lib/comms-live";

export function CommunicationWidget() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CommsHealthStats>({
    totalDeliveries: 0,
    readCount: 0,
    unreadCount: 0,
    readPercentage: 0,
  });

  async function load() {
    try {
      setLoading(true);
      const s = await fetchCommsHealthStats();
      setStats(s);
    } catch (e) {
      console.error("CommunicationWidget load failed:", e);
      setStats({ totalDeliveries: 0, readCount: 0, unreadCount: 0, readPercentage: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // ✅ Smart refresh at :05 and :35 (with +2 sec buffer)
    const scheduleNext = () => {
      const now = new Date();
      const m = now.getMinutes();

      let nextMin = m < 5 ? 5 : m < 35 ? 35 : 65;
      const next = new Date(now);

      if (nextMin >= 60) {
        next.setHours(now.getHours() + 1);
        next.setMinutes(5, 2, 0);
      } else {
        next.setMinutes(nextMin, 2, 0);
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

  const ringMax = useMemo(() => (stats.totalDeliveries || 1), [stats.totalDeliveries]);

  return (
    <div className="dashboard-widget p-6">
      <div className="flex items-center gap-2 mb-6">
        <Mail className="h-5 w-5 text-info" />
        <h3 className="font-semibold text-lg">Communication Health</h3>
      </div>

      <div className="flex items-center gap-8">
        {/* Progress Ring */}
        <ProgressRing
          value={stats.readCount}
          max={ringMax}
          size="lg"
          label="Read Rate"
        />

        {/* Stats */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/10">
            <Eye className="h-5 w-5 text-success" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Messages Read</p>
                <p className="text-lg font-bold text-success">
                  {loading ? "—" : stats.readCount}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Out of {loading ? "—" : stats.totalDeliveries} deliveries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <EyeOff className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Unread</p>
                <p className="text-lg font-bold text-muted-foreground">
                  {loading ? "—" : stats.unreadCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Read Rate Bar */}
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Store Read Rate</span>
          <span className="font-semibold">
            {loading ? "—" : `${stats.readPercentage}%`}
          </span>
        </div>
        <Progress value={stats.readPercentage} className="h-2" />
      </div>
    </div>
  );
}