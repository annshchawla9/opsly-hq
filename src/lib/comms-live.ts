// src/lib/comms-live.ts
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type CommsHealthStats = {
  totalDeliveries: number; // per store (message_targets count) for active messages
  readCount: number;       // deliveries where read_at exists
  unreadCount: number;     // totalDeliveries - readCount
  readPercentage: number;  // rounded %
};

type ReadKey = `${string}|${string}`;

/**
 * LIVE Communication Health for HQ Dashboard
 * Active = messages where resolved_at IS NULL
 * Counts per store delivery = message_targets row
 * Read is evaluated per target using message_reads.read_at (works even if read row missing)
 */
export async function fetchCommsHealthStats(): Promise<CommsHealthStats> {
  // 1) active messages
  const { data: msgRows, error: msgErr } = await sb
    .from("messages")
    .select("id,resolved_at")
    .is("resolved_at", null);

  if (msgErr) throw msgErr;

  const ids = (msgRows ?? []).map((m: any) => m.id as string);
  if (!ids.length) {
    return { totalDeliveries: 0, readCount: 0, unreadCount: 0, readPercentage: 0 };
  }

  // 2) targets for those messages (deliveries)
  const { data: targetRows, error: targetErr } = await sb
    .from("message_targets")
    .select("message_id,store_id")
    .in("message_id", ids);

  if (targetErr) throw targetErr;

  const targets = (targetRows ?? []) as { message_id: string; store_id: string }[];
  const totalDeliveries = targets.length;

  if (!totalDeliveries) {
    return { totalDeliveries: 0, readCount: 0, unreadCount: 0, readPercentage: 0 };
  }

  // 3) reads rows (may not exist for all targets)
  const { data: readRows, error: readErr } = await sb
    .from("message_reads")
    .select("message_id,store_id,read_at")
    .in("message_id", ids);

  if (readErr) throw readErr;

  const readMap = new Map<ReadKey, { read_at: string | null }>();
  (readRows ?? []).forEach((r: any) => {
    readMap.set(`${r.message_id}|${r.store_id}` as ReadKey, {
      read_at: r.read_at ?? null,
    });
  });

  let readCount = 0;
  for (const t of targets) {
    const r = readMap.get(`${t.message_id}|${t.store_id}` as ReadKey);
    if (r?.read_at) readCount += 1;
  }

  const unreadCount = Math.max(totalDeliveries - readCount, 0);
  const readPercentage = totalDeliveries > 0 ? Math.round((readCount / totalDeliveries) * 100) : 0;

  return { totalDeliveries, readCount, unreadCount, readPercentage };
}