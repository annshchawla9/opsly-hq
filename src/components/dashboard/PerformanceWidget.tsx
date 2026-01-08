import { useEffect, useMemo, useState } from "react";
import { DollarSign, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

import { useStoreFilter } from "@/contexts/StoreFilterContext";
import {
  fetchTodayPerformance,
  fetchStoreLeaderboard,
  fetchSalesTillTimeLabel,
} from "@/lib/performance-data";

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function PerformanceWidget() {
  const { allStores } = useStoreFilter();

  const stores = useMemo(() => (allStores as any[]) ?? [], [allStores]);
  const storeCodes = useMemo(
    () => stores.map((s) => s?.code).filter(Boolean),
    [stores]
  );

  const [loading, setLoading] = useState(true);

  const [saleDate, setSaleDate] = useState("");
  const [salesTill, setSalesTill] = useState<string | null>(null);

  const [totalSales, setTotalSales] = useState(0);
  const [totalTarget, setTotalTarget] = useState(0);
  const [pct, setPct] = useState(0);

  const [rows, setRows] = useState<any[]>([]); // store leaderboard rows

  const gap = totalTarget - totalSales;
  const isAboveTarget = gap <= 0;

  async function load() {
    try {
      setLoading(true);

      if (!storeCodes.length) {
        setSaleDate("");
        setSalesTill(null);
        setTotalSales(0);
        setTotalTarget(0);
        setPct(0);
        setRows([]);
        return;
      }

      const perf = await fetchTodayPerformance(storeCodes);
      setSaleDate(perf.saleDate);
      setTotalSales(perf.totalSales);
      setTotalTarget(perf.totalTarget);
      setPct(perf.percentage);

      // sales till (optional)
      try {
        const till = perf.saleDate ? await fetchSalesTillTimeLabel(perf.saleDate) : null;
        setSalesTill(till);
      } catch {
        setSalesTill(null);
      }

      // ✅ store-wise rows
      const board = await fetchStoreLeaderboard(stores);
      // Sort by SALES high→low (since you want store-wise sales table)
      const sorted = [...(board ?? [])].sort(
        (a: any, b: any) => (Number(b.sales) || 0) - (Number(a.sales) || 0)
      );
      setRows(sorted);
    } catch (e) {
      console.error("PerformanceWidget load failed:", e);
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
  }, [storeCodes.join(",")]);

  return (
    <div className="dashboard-widget p-6 opsly-gradient text-primary-foreground">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          <h3 className="font-semibold text-lg">Today's Performance</h3>
        </div>

        <div className="text-right text-xs opacity-90 leading-5">
          <div>Sales date: {saleDate || "—"}</div>
          <div>Sales till: {salesTill || "—"}</div>
        </div>
      </div>

      {/* Top numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-sm opacity-80 mb-1">Total Sales</p>
          <p className="text-3xl font-bold">{loading ? "—" : inr(totalSales)}</p>
        </div>

        <div>
          <p className="text-sm opacity-80 mb-1">Target</p>
          <p className="text-3xl font-bold">{loading ? "—" : inr(totalTarget)}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="opacity-80">Achievement</span>
          <span className="font-semibold">{loading ? "—" : `${pct}%`}</span>
        </div>

        <div className="h-3 rounded-full bg-primary-foreground/20 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isAboveTarget ? "bg-success" : "bg-primary-foreground"
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Gap */}
      <div className="flex items-center justify-between pt-4 border-t border-primary-foreground/20 mb-6">
        <span className="text-sm opacity-80">
          {isAboveTarget ? "Above Target" : "Gap to Target"}
        </span>

        <div
          className={cn(
            "flex items-center gap-1 font-semibold",
            isAboveTarget && "text-success"
          )}
        >
          {isAboveTarget ? <TrendingUp className="h-4 w-4" /> : <Target className="h-4 w-4" />}
          {loading ? "—" : inr(Math.abs(gap))}
        </div>
      </div>

      {/* ✅ Store-wise table inside blue card */}
      <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 overflow-hidden">
        <div className="px-4 py-2 text-sm font-semibold flex items-center justify-between">
          <span>Store-wise Sales (High → Low)</span>
          <span className="text-xs opacity-80">{saleDate || "—"}</span>
        </div>

        <div className="grid grid-cols-12 px-4 py-2 text-xs font-semibold opacity-90 border-t border-primary-foreground/10">
          <div className="col-span-1">#</div>
          <div className="col-span-5">Store</div>
          <div className="col-span-3 text-center">Sales</div>
          <div className="col-span-2 text-center">Target</div>
          <div className="col-span-1 text-right">%</div>
        </div>

        {loading ? (
          <div className="px-4 py-4 text-sm opacity-80">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-4 text-sm opacity-80">No store sales found.</div>
        ) : (
          rows.map((r: any, idx: number) => (
            <div
              key={r.store_code || idx}
              className="grid grid-cols-12 items-center px-4 py-3 text-sm border-t border-primary-foreground/10 hover:bg-primary-foreground/5 transition"
            >
              <div className="col-span-1 opacity-90">{idx + 1}</div>

              <div className="col-span-5">
                <div className="font-semibold">{r.store_name}</div>
                <div className="text-xs opacity-80">{r.store_code}</div>
              </div>

              <div className="col-span-3 text-center font-semibold">
                {inr(Number(r.sales) || 0)}
              </div>

              <div className="col-span-2 text-center font-semibold">
                {inr(Number(r.target) || 0)}
              </div>

              <div className="col-span-1 text-right font-semibold">
                {Number(r.percentage) || 0}%
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
