// src/lib/goal-actions.ts
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

// ---------- Date helpers (IST) ----------
function istTodayISODate(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
  return ist.toISOString().slice(0, 10); // YYYY-MM-DD
}

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoDayOfWeekMon1Sun7(dateISO: string): number {
  // JS: Sun=0..Sat=6 -> convert to Mon=1..Sun=7
  const d = new Date(dateISO + "T00:00:00");
  const js = d.getDay();
  return js === 0 ? 7 : js;
}

function startOfWeekMon(dateISO: string): string {
  const dow = isoDayOfWeekMon1Sun7(dateISO); // Mon=1
  return addDaysISO(dateISO, -(dow - 1));
}

function endOfWeekSun(dateISO: string): string {
  const sow = startOfWeekMon(dateISO);
  return addDaysISO(sow, 6);
}

function startOfMonth(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function endOfMonth(dateISO: string): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  d.setDate(0); // last day of previous month
  return d.toISOString().slice(0, 10);
}

function eachDayBetween(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  let cur = startISO;
  while (cur <= endISO) {
    out.push(cur);
    cur = addDaysISO(cur, 1);
  }
  return out;
}

// ---------- Lists for dropdowns ----------
export async function fetchStoresList() {
  const { data, error } = await sb.from("stores").select("code,name").order("code");
  if (error) throw error;
  return (data || []).map((s: any) => ({
    code: String(s.code),
    name: String(s.name || s.code),
  }));
}

export async function fetchSalespersonsForStore(storeCode: string) {
  // last 30 days so all active salespeople appear
  const today = istTodayISODate();
  const from = addDaysISO(today, -30);

  const { data, error } = await sb
    .from("sales_lines")
    .select("sales_person_no,sales_person_name")
    .eq("store_code", storeCode)
    .gte("bill_date", from)
    .lte("bill_date", today);

  if (error) throw error;

  // distinct by sales_person_no (keep latest name)
  const map = new Map<string, string>();
  (data || []).forEach((r: any) => {
    const no = String(r.sales_person_no ?? "").trim();
    if (!no) return;
    const nm = String(r.sales_person_name ?? "").trim() || `SP ${no}`;
    map.set(no, nm);
  });

  return Array.from(map.entries())
    .map(([sales_person_no, name]) => ({ sales_person_no, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- Create Goals ----------
type Period = "daily" | "weekly" | "monthly";
type GoalType = "store" | "salesperson" | "special";

// store/salesperson targets are NET AMOUNT
export async function createNetAmountTarget(opts: {
  goalType: Exclude<GoalType, "special">; // "store" | "salesperson"
  period: Period;
  baseDateISO?: string; // if not provided -> today
  storeCode: string | "ALL"; // ALL = create for each store
  salespersonNo?: string; // required if salesperson goal
  targetAmount: number; // net amount
}) {
  const base = opts.baseDateISO || istTodayISODate();

  let start = base;
  let end = base;

  if (opts.period === "weekly") {
    start = startOfWeekMon(base);
    end = endOfWeekSun(base);
  }
  if (opts.period === "monthly") {
    start = startOfMonth(base);
    end = endOfMonth(base);
  }

  const days = eachDayBetween(start, end);

  // If ALL stores, expand into each store
  let storeCodes: string[] = [];
  if (opts.storeCode === "ALL") {
    const stores = await fetchStoresList();
    storeCodes = stores.map((s) => s.code);
  } else {
    storeCodes = [opts.storeCode];
  }

  // Build rows
  if (opts.goalType === "store") {
    const rows = storeCodes.flatMap((sc) =>
      days.map((d) => ({
        store_code: sc,
        target_date: d,
        target_amt: opts.targetAmount,
      }))
    );

    // Upsert so you can edit targets without duplicates
    const { error } = await sb
      .from("sales_targets_store_daily")
      .upsert(rows, { onConflict: "store_code,target_date" });

    if (error) throw error;
    return { start, end, count: rows.length };
  }

  // salesperson goal
  const spNo = String(opts.salespersonNo || "").trim();
  if (!spNo) throw new Error("Salesperson is required.");

  const rows = storeCodes.flatMap((sc) =>
    days.map((d) => ({
      store_code: sc,
      sales_person_no: spNo,
      target_date: d,
      target_amt: opts.targetAmount,
    }))
  );

  const { error } = await sb
    .from("sales_targets_salesperson_daily")
    .upsert(rows, { onConflict: "store_code,sales_person_no,target_date" });

  if (error) throw error;
  return { start, end, count: rows.length };
}

// special targets are QTY saved in special_targets
export async function createSpecialTarget(opts: {
  title: string;
  storeCode: string | "ALL"; // ALL -> insert HQ-wide (store_code null)
  period: Period;
  baseDateISO?: string; // used to compute start/end for weekly/monthly
  dimension: "dept" | "section" | "mark" | "style_no" | "barcode";
  dimensionValue: string;
  targetQty: number;
}) {
  const base = opts.baseDateISO || istTodayISODate();

  let start = base;
  let end = base;

  if (opts.period === "weekly") {
    start = startOfWeekMon(base);
    end = endOfWeekSun(base);
  }
  if (opts.period === "monthly") {
    start = startOfMonth(base);
    end = endOfMonth(base);
  }

  const payload = {
    title: opts.title || "Special Target",
    store_code: opts.storeCode === "ALL" ? null : opts.storeCode,
    start_date: start,
    end_date: end,
    dimension: opts.dimension,
    dimension_value: String(opts.dimensionValue || "").trim(),
    metric: "qty",
    target_value: opts.targetQty,
  };

  if (!payload.dimension_value) throw new Error("Special target value is required.");

  const { error } = await sb.from("special_targets").insert(payload);
  if (error) throw error;

  return { start, end };
}

export async function createStoreDailyTarget(opts: {
  storeCode: string;
  targetDate: string; // YYYY-MM-DD
  targetAmount: number; // net amount
}) {
  return createNetAmountTarget({
    goalType: "store",
    period: "daily",
    baseDateISO: opts.targetDate,
    storeCode: opts.storeCode,
    targetAmount: opts.targetAmount,
  });
}

export async function createSalespersonDailyTarget(opts: {
  storeCode: string;
  targetDate: string; // YYYY-MM-DD
  salesPersonNo: string;
  targetAmount: number; // net amount
}) {
  return createNetAmountTarget({
    goalType: "salesperson",
    period: "daily",
    baseDateISO: opts.targetDate,
    storeCode: opts.storeCode,
    salespersonNo: opts.salesPersonNo, // NOTE: matches createNetAmountTarget param name
    targetAmount: opts.targetAmount,
  });
}

export async function createSpecialDailyTarget(opts: {
  storeCode: string | "ALL";
  targetDate: string; // YYYY-MM-DD
  dimension: "dept" | "section" | "mark" | "style_no" | "barcode";
  dimensionValue: string;
  targetQty: number;
  title?: string;
}) {
  return createSpecialTarget({
    title: opts.title || "Special Target",
    storeCode: opts.storeCode,
    period: "daily",
    baseDateISO: opts.targetDate,
    dimension: opts.dimension,
    dimensionValue: opts.dimensionValue,
    targetQty: opts.targetQty,
  });
}