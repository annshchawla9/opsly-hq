// src/lib/performance-data.ts
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

// ---------------- TYPES ----------------
export type StoreRow = {
  id: string;
  code: string;
  name: string;
};

export type TodayPerformance = {
  saleDate: string;
  totalSales: number;
  totalTarget: number;
  percentage: number;
};

export type StorePerfRow = {
  store_code: string;
  store_name: string;
  sales: number;
  target: number;
  percentage: number;
};

export type SalesmanLiteRow = {
  salesman_no: string;
  salesman_name: string;
};

export type UpsertResult = { count: number };

// ✅ Team performance rows (HQ view)
export type SalesmanPerfRow = {
  salesman_no: string;
  salesman_name: string;
  net_sales: number;
  qty: number;
  bill_count: number;
  target_amount: number; // 0 if not set
};

// ---------------- HELPERS ----------------
function num(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function safeDiv(a: number, b: number) {
  if (!b) return 0;
  return a / b;
}

// ---------------- CORE DATE RESOLUTION ----------------
export async function getCurrentSalesDate(
  storeCodes: string[]
): Promise<string | null> {
  if (!storeCodes.length) return null;

  const { data, error } = await sb
    .from("daily_store_sales")
    .select("sale_date")
    .in("store_code", storeCodes)
    .order("sale_date", { ascending: false })
    .limit(1);

  if (error) throw error;
  if (!data?.length) return null;

  return data[0].sale_date as string;
}

// ---------------- TOP CARDS ----------------
export async function fetchTodayPerformance(
  storeCodes: string[]
): Promise<TodayPerformance> {
  const saleDate = await getCurrentSalesDate(storeCodes);

  if (!saleDate) {
    return { saleDate: "", totalSales: 0, totalTarget: 0, percentage: 0 };
  }

  // SALES
  const { data: salesRows, error: salesErr } = await sb
    .from("daily_store_sales")
    .select("net_sales")
    .eq("sale_date", saleDate)
    .in("store_code", storeCodes);

  if (salesErr) throw salesErr;

  const totalSales = (salesRows ?? []).reduce(
    (sum: number, r: any) => sum + num(r.net_sales),
    0
  );

  // TARGETS
  const { data: targetRows, error: targetErr } = await sb
    .from("daily_store_targets")
    .select("target_amount")
    .eq("target_date", saleDate)
    .in("store_code", storeCodes);

  const totalTarget = targetErr
    ? 0
    : (targetRows ?? []).reduce(
        (sum: number, r: any) => sum + num(r.target_amount),
        0
      );

  const percentage =
    totalTarget > 0 ? Math.round(safeDiv(totalSales, totalTarget) * 100) : 0;

  return { saleDate, totalSales, totalTarget, percentage };
}

// ---------------- STORE LEADERBOARD ----------------
export async function fetchStoreLeaderboard(
  stores: StoreRow[]
): Promise<StorePerfRow[]> {
  const storeCodes = stores.map((s) => s.code);
  const saleDate = await getCurrentSalesDate(storeCodes);
  if (!saleDate) return [];

  const { data: salesRows, error: salesErr } = await sb
    .from("daily_store_sales")
    .select("store_code, net_sales")
    .eq("sale_date", saleDate)
    .in("store_code", storeCodes);

  if (salesErr) throw salesErr;

  const { data: targetRows, error: targetErr } = await sb
    .from("daily_store_targets")
    .select("store_code, target_amount")
    .eq("target_date", saleDate)
    .in("store_code", storeCodes);

  const salesMap = new Map<string, number>();
  for (const r of salesRows ?? []) salesMap.set(r.store_code, num(r.net_sales));

  const targetMap = new Map<string, number>();
  if (!targetErr) {
    for (const r of targetRows ?? []) {
      targetMap.set(r.store_code, num(r.target_amount));
    }
  }

  const out: StorePerfRow[] = stores.map((s) => {
    const sales = salesMap.get(s.code) ?? 0;
    const target = targetMap.get(s.code) ?? 0;
    const percentage = target > 0 ? Math.round(safeDiv(sales, target) * 100) : 0;

    return {
      store_code: s.code,
      store_name: s.name,
      sales,
      target,
      percentage,
    };
  });

  // (existing sort = by achievement; ok)
  out.sort((a, b) => b.percentage - a.percentage || b.sales - a.sales);
  return out;
}

// ---------------- SALESMEN LIST (for NewGoalDialog) ----------------
export async function fetchSalesmenForStore(
  storeCode: string
): Promise<SalesmanLiteRow[]> {
  if (!storeCode) return [];

  const { data, error } = await sb
    .from("daily_salesman_sales")
    .select("salesman_no, salesman_name")
    .eq("store_code", storeCode)
    .order("salesman_name", { ascending: true });

  if (error) throw error;

  const map = new Map<string, SalesmanLiteRow>();
  for (const r of data ?? []) {
    const no = String(r.salesman_no ?? "");
    if (!no) continue;
    if (!map.has(no)) {
      map.set(no, {
        salesman_no: no,
        salesman_name: String(r.salesman_name ?? `#${no}`),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.salesman_name.localeCompare(b.salesman_name)
  );
}

// ---------------- UPSERT STORE TARGETS ----------------
export async function upsertStoreTargets(
  rows: { target_date: string; store_code: string; target_amount: number }[]
): Promise<UpsertResult> {
  if (!rows.length) return { count: 0 };

  const payload = rows.map((r) => ({
    target_date: r.target_date,
    store_code: r.store_code,
    target_amount: num(r.target_amount),
  }));

  const { data, error } = await sb
    .from("daily_store_targets")
    .upsert(payload, { onConflict: "target_date,store_code" })
    .select("store_code");

  if (error) throw error;
  return { count: (data ?? []).length };
}

// ---------------- UPSERT SALESMAN TARGETS ----------------
export async function upsertSalesmanTargets(
  rows: {
    target_date: string;
    store_code: string;
    salesman_no: string;
    target_amount: number;
  }[]
): Promise<UpsertResult> {
  if (!rows.length) return { count: 0 };

  const payload = rows.map((r) => ({
    target_date: r.target_date,
    store_code: r.store_code,
    salesman_no: String(r.salesman_no),
    target_amount: num(r.target_amount),
  }));

  const { data, error } = await sb
    .from("daily_salesman_targets")
    .upsert(payload, { onConflict: "target_date,store_code,salesman_no" })
    .select("salesman_no");

  if (error) throw error;
  return { count: (data ?? []).length };
}

// ---------------- S3 SYNC ----------------
export async function syncSalesFromS3() {
  const { data, error } = await sb.functions.invoke("sync_sales_from_s3", {
    method: "POST",
    body: { trigger: "manual" },
  });

  if (error) {
    console.error("Edge Function error:", error);
    throw new Error(error.message || "S3 sync failed");
  }

  return data;
}

// ---------------- SALES TILL (latest bill time) ----------------
function formatIstTimeFromTimeString(hhmmss: string) {
  // expects: "HH:MM" or "HH:MM:SS"
  const [hStr, mStr] = String(hhmmss).split(":");
  const h = Number(hStr || 0);
  const m = Number(mStr || 0);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh12 = ((h + 11) % 12) + 1;
  return `${String(hh12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Pulls "sales till" for the current saleDate from daily_sales_meta (written by sync_today_sale.py)
 * Returns label like "05:35 PM"
 */
export async function fetchSalesTillTimeLabel(
  saleDate: string
): Promise<string | null> {
  if (!saleDate) return null;

  const { data, error } = await sb
    .from("daily_sales_meta")
    .select("sales_till, sales_till_ts")
    .eq("sale_date", saleDate)
    .limit(1);

  if (error) throw error;
  if (!data?.length) return null;

  // Prefer the TIME column (no timezone issues)
  const t = data[0]?.sales_till;
  if (t) return formatIstTimeFromTimeString(t);

  // Fallback: timestamp (format in IST)
  const ts = data[0]?.sales_till_ts;
  if (ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return null;
}

// ✅ TEAM PERFORMANCE (store app style, for HQ)
export async function fetchSalesmanPerformanceForStore(
  storeCode: string,
  saleDate: string
): Promise<{ rows: SalesmanPerfRow[]; storeTarget: number }> {
  if (!storeCode || !saleDate) return { rows: [], storeTarget: 0 };

  // Sales rows
  const { data: salesmanRows, error: salesmanErr } = await sb
    .from("daily_salesman_sales")
    .select("salesman_no, salesman_name, net_sales, qty, bill_count")
    .eq("sale_date", saleDate)
    .eq("store_code", storeCode)
    .order("net_sales", { ascending: false });

  if (salesmanErr) throw salesmanErr;

  // Targets map
  const { data: targetRows, error: targetErr } = await sb
    .from("daily_salesman_targets")
    .select("salesman_no, target_amount")
    .eq("target_date", saleDate)
    .eq("store_code", storeCode);

  const targetMap = new Map<string, number>();
  if (!targetErr) {
    for (const r of targetRows ?? []) {
      targetMap.set(String(r.salesman_no), Number(r.target_amount) || 0);
    }
  }

  // Store target (optional, for computing store % if you want later)
  const { data: storeTargetRows, error: storeTargetErr } = await sb
    .from("daily_store_targets")
    .select("target_amount")
    .eq("target_date", saleDate)
    .eq("store_code", storeCode)
    .limit(1);

  const storeTarget =
    storeTargetErr || !storeTargetRows?.length
      ? 0
      : Number(storeTargetRows[0].target_amount) || 0;

  const rows: SalesmanPerfRow[] = (salesmanRows ?? []).map((r: any) => {
    const key = String(r.salesman_no);
    return {
      salesman_no: key,
      salesman_name: String(r.salesman_name ?? `#${key}`),
      net_sales: Number(r.net_sales) || 0,
      qty: Number(r.qty) || 0,
      bill_count: Number(r.bill_count) || 0,
      target_amount: targetMap.get(key) ?? 0,
    };
  });

  return { rows, storeTarget };
}