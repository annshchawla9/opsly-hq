// src/pages/Performance.tsx
import { useEffect, useMemo, useState } from "react";
import { Plus, Target, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useStoreFilter } from "@/contexts/StoreFilterContext";
import {
  fetchTodayPerformance,
  fetchStoreLeaderboard,
  fetchSalesTillTimeLabel, // ✅ reads daily_sales_meta
  fetchSalesmanPerformanceForStore, // ✅
} from "@/lib/performance-data";
import type { StoreRow } from "@/contexts/StoreFilterContext";
import type { SalesmanPerfRow } from "@/lib/performance-data";

import NewGoalDialog from "@/components/goals/NewGoalDialog";

function safePercent(achieved: number, target: number) {
  if (!target || target <= 0) return 0;
  return Math.round((achieved / target) * 100);
}

function clamp100(x: number) {
  return Math.max(0, Math.min(100, x));
}

function msUntilNext2050(bufferSeconds = 30) {
  const now = new Date();
  const next = new Date(now);

  const m = now.getMinutes();
  const s = now.getSeconds();
  const ms = now.getMilliseconds();

  const bufferMs = bufferSeconds * 1000;
  const elapsedMs = s * 1000 + ms;

  // Next trigger minute: 20 or 50
  if (m < 20 || (m === 20 && elapsedMs < bufferMs)) {
    next.setMinutes(20, 0, 0);
  } else if (m < 50 || (m === 50 && elapsedMs < bufferMs)) {
    next.setMinutes(50, 0, 0);
  } else {
    // Next hour at :20
    next.setHours(now.getHours() + 1);
    next.setMinutes(20, 0, 0);
  }

  const targetMs = next.getTime() + bufferMs;
  return Math.max(500, targetMs - now.getTime());
}

export default function Performance() {
  const { toast } = useToast();

  // ✅ Keep hook usage, but IGNORE its selected filters for this tab
  const { allStores } = useStoreFilter();

  const [loading, setLoading] = useState(true);

  const [saleDate, setSaleDate] = useState("");
  const [salesTillLabel, setSalesTillLabel] = useState<string | null>(null);

  const [totalSales, setTotalSales] = useState(0);
  const [totalTarget, setTotalTarget] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [goalOpen, setGoalOpen] = useState(false);

  // ✅ IMPORTANT: Performance tab always uses ALL stores (global filter should not affect)
  const selectedStores: StoreRow[] = useMemo(() => {
    return (allStores as StoreRow[]) ?? [];
  }, [allStores]);

  const storeCodes = useMemo(() => selectedStores.map((s) => s.code), [selectedStores]);

  // ✅ Team performance state
  const [teamStoreCode, setTeamStoreCode] = useState<string>("");
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamRows, setTeamRows] = useState<SalesmanPerfRow[]>([]);
  const [teamStoreTarget, setTeamStoreTarget] = useState(0);

  async function load() {
    try {
      setLoading(true);

      if (!storeCodes.length) {
        setSaleDate("");
        setSalesTillLabel(null);
        setTotalSales(0);
        setTotalTarget(0);
        setPercentage(0);
        setLeaderboard([]);
        return;
      }

      const perf = await fetchTodayPerformance(storeCodes);
      const board = await fetchStoreLeaderboard(selectedStores);

      setSaleDate(perf.saleDate);
      setTotalSales(perf.totalSales);
      setTotalTarget(perf.totalTarget);
      setPercentage(perf.percentage);
      setLeaderboard(board);

      // ✅ SALES TILL (max bill time from daily_sales_meta)
      const till = perf.saleDate ? await fetchSalesTillTimeLabel(perf.saleDate) : null;
      setSalesTillLabel(till);
    } catch (e: any) {
      toast({
        title: "Failed to load performance",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // ✅ Initial load + reload when store list changes (still ignores global selection)
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeCodes.join(",")]);

  // ✅ SMART AUTO-REFRESH after :05 and :35 every hour (with small buffer)
  useEffect(() => {
    let alive = true;
    let t: number | undefined;

    const schedule = () => {
      if (!alive) return;

      const wait = msUntilNext2050(30); // refresh at :05:20 and :35:20
      t = window.setTimeout(async () => {
        if (!alive) return;
        await load();
        schedule();
      }, wait);
    };

    schedule();

    return () => {
      alive = false;
      if (t) window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeCodes.join(",")]);

  // ✅ for the new store-wise sales table (sort by SALES high→low)
  const storeSalesSorted = useMemo(() => {
    const rows = Array.isArray(leaderboard) ? [...leaderboard] : [];
    rows.sort((a: any, b: any) => (Number(b.sales) || 0) - (Number(a.sales) || 0));
    return rows;
  }, [leaderboard]);

  // ✅ pick a default store for the team widget (first available)
  useEffect(() => {
    if (!teamStoreCode && selectedStores.length) {
      setTeamStoreCode(selectedStores[0].code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStores.map((s) => s.code).join(",")]);

  // ✅ load team performance for the selected store + saleDate
  useEffect(() => {
    let alive = true;

    async function loadTeam() {
      if (!saleDate || !teamStoreCode) {
        if (!alive) return;
        setTeamRows([]);
        setTeamStoreTarget(0);
        return;
      }

      try {
        setTeamLoading(true);
        const res = await fetchSalesmanPerformanceForStore(teamStoreCode, saleDate);
        if (!alive) return;

        setTeamRows(res.rows);
        setTeamStoreTarget(res.storeTarget);
      } catch (e: any) {
        if (!alive) return;
        setTeamRows([]);
        setTeamStoreTarget(0);
      } finally {
        if (!alive) return;
        setTeamLoading(false);
      }
    }

    loadTeam();
    return () => {
      alive = false;
    };
  }, [teamStoreCode, saleDate]);

  const getPercentColor = (percent: number) => {
    if (percent >= 100) return "text-success";
    if (percent >= 80) return "text-warning";
    return "text-destructive";
  };

  const teamStoreName = useMemo(() => {
    const s = (allStores as StoreRow[]).find((x) => x.code === teamStoreCode);
    return s?.name || teamStoreCode;
  }, [allStores, teamStoreCode]);

  const teamStoreSalesAchieved = useMemo(() => {
    return (teamRows || []).reduce((sum, r) => sum + (Number(r.net_sales) || 0), 0);
  }, [teamRows]);

  const teamStorePercent = useMemo(() => {
    return safePercent(teamStoreSalesAchieved, teamStoreTarget);
  }, [teamStoreSalesAchieved, teamStoreTarget]);

  return (
    <div className="space-y-6">
      {/* DIALOG */}
      <NewGoalDialog
        open={goalOpen}
        onOpenChange={(v) => {
          setGoalOpen(v);
          if (!v) load();
        }}
        stores={(allStores as StoreRow[]) ?? []}
      />

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Control Center</h1>

          <p className="text-muted-foreground">
            {saleDate ? (
              <>
                Sales date: <span className="font-medium">{saleDate}</span>
                {salesTillLabel ? (
                  <>
                    {" "}
                    • Sales till: <span className="font-medium">{salesTillLabel}</span>
                  </>
                ) : null}
              </>
            ) : (
              "No sales data loaded"
            )}
          </p>
        </div>

        {/* ✅ ONLY New Goal button (Sync removed) */}
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => setGoalOpen(true)}>
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stats-card opsly-gradient text-white">
          <p className="text-sm opacity-80">Today's Sales</p>
          <p className="text-3xl font-bold">₹{Math.round(totalSales).toLocaleString("en-IN")}</p>
        </div>

        <div className="stats-card">
          <p className="text-sm text-muted-foreground">Target</p>
          <p className="text-3xl font-bold">₹{Math.round(totalTarget).toLocaleString("en-IN")}</p>
        </div>

        <div className="stats-card">
          <p className="text-sm text-muted-foreground">Achievement</p>
          <p className="text-3xl font-bold text-primary">{percentage}%</p>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="dashboard-widget p-6">
        <div className="flex justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Progress vs Target
          </h3>
          <Badge variant="outline">{totalTarget > 0 ? `${percentage}%` : "Target not set"}</Badge>
        </div>
        <Progress value={percentage} className="h-3" />
      </div>

      {/* ✅ STORE-WISE SALES TABLE (ABOVE RANKING) */}
      <div className="dashboard-widget p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Store-wise Sales (High → Low)
          </h3>
          <Badge variant="outline">{saleDate || "No date"}</Badge>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : storeSalesSorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No store sales found.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            {/* HEADER */}
            <div className="grid grid-cols-12 bg-muted/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Store</div>
              <div className="col-span-3 text-center">Sales</div>
              <div className="col-span-2 text-center">Targets</div>
              <div className="col-span-2 text-right">Achievement</div>
            </div>

            {/* ROWS */}
            {storeSalesSorted.map((s: any, idx: number) => (
              <div
                key={s.store_code}
                className="grid grid-cols-12 items-center px-4 py-3 border-t hover:bg-muted/10 transition"
              >
                <div className="col-span-1 text-sm font-medium">{idx + 1}</div>

                <div className="col-span-4">
                  <div className="text-sm font-semibold">{s.store_name}</div>
                  <div className="text-xs text-muted-foreground">{s.store_code}</div>
                </div>

                <div className="col-span-3 text-center text-sm font-semibold">
                  ₹{Math.round(Number(s.sales) || 0).toLocaleString("en-IN")}
                </div>

                <div className="col-span-2 text-center text-sm font-semibold">
                  ₹{Math.round(Number(s.target) || 0).toLocaleString("en-IN")}
                </div>

                <div className="col-span-2 text-right">
                  <div className="text-sm font-semibold text-primary">
                    {Number(s.percentage) || 0}%
                  </div>
                  <div className="mt-2">
                    <Progress value={Number(s.percentage) || 0} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RANKING */}
      <div className="dashboard-widget p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-success" />
          Store Ranking
        </h3>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground">No store sales found.</p>
        ) : (
          leaderboard.map((s, i) => (
            <div key={s.store_code} className="p-3 rounded bg-muted/20 mb-2">
              <div className="flex justify-between">
                <span>
                  {i + 1}. {s.store_name}
                </span>
                <span>{s.percentage}%</span>
              </div>
              <Progress value={s.percentage} className="h-2 mt-2" />
            </div>
          ))
        )}
      </div>

      {/* ✅ TEAM PERFORMANCE (ONE STORE AT A TIME) */}
      <div className="dashboard-widget p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Performance (Today)
          </h3>

          {/* local store filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Store</span>
            <div className="relative">
              <select
                className="h-9 border rounded-md pl-3 pr-9 text-sm bg-background"
                value={teamStoreCode}
                onChange={(e) => setTeamStoreCode(e.target.value)}
              >
                <option value="" disabled>
                  Select store
                </option>
                {selectedStores.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!saleDate ? (
          <p className="text-sm text-muted-foreground">No sales date loaded.</p>
        ) : teamLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : teamRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No salesman sales found for {teamStoreName} on {saleDate}.
          </p>
        ) : (
          <div className="space-y-2">
            {teamRows.map((person, idx) => {
              const target = Number(person.target_amount) || 0;
              const achieved = Number(person.net_sales) || 0;
              const percent = safePercent(achieved, target);

              return (
                <div key={`${person.salesman_no}-${idx}`} className="p-3 rounded bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">
                      {person.salesman_name}{" "}
                      <span className="text-xs text-muted-foreground">(#{person.salesman_no})</span>
                    </p>

                    <span className={`text-sm font-bold ${getPercentColor(percent)}`}>
                      {percent}%
                    </span>
                  </div>

                  <Progress value={clamp100(percent)} className="h-2" />

                  <div className="flex justify-between mt-1.5">
                    <span className="text-2xs text-muted-foreground">
                      ₹{Math.round(achieved).toLocaleString("en-IN")}
                      {target > 0
                        ? ` / ₹${Math.round(target).toLocaleString("en-IN")}`
                        : " / Target not set"}
                    </span>
                    <span className="text-2xs text-muted-foreground">
                      Bills: {person.bill_count ?? 0} • Qty: {person.qty ?? 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {saleDate ? (
          <div className="mt-4 text-xs text-muted-foreground">
            {teamStoreName} • {teamStoreCode ? `(${teamStoreCode}) • ` : ""}Sales date: {saleDate}
          </div>
        ) : null}
      </div>
    </div>
  );
}