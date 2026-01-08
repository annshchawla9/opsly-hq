// src/lib/tasks-live.ts
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type TaskHealthStats = {
  totalAssignments: number;     // total active task assignments (task_targets)
  completed: number;            // completed assignments
  overdue: number;              // overdue assignments (due passed + not completed)
  onTime: number;               // completed before due (or no due)
  late: number;                 // completed after due
};

function toMs(d: string | null | undefined) {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Live Task Execution Health for HQ Dashboard
 * - Uses ONLY active tasks (tasks.status='active')
 * - Counts are based on task_targets (assignments)
 */
export async function fetchTaskHealthStats(): Promise<TaskHealthStats> {
  const now = Date.now();

  // 1) Active tasks (we need due_at for overdue/late/onTime logic)
  const { data: taskRows, error: taskErr } = await sb
    .from("tasks")
    .select("id,due_at,status")
    .eq("status", "active");

  if (taskErr) throw taskErr;

  const activeTasks = (taskRows ?? []) as { id: string; due_at: string | null }[];
  const activeTaskIds = activeTasks.map((t) => t.id);
  const dueMap = new Map(activeTasks.map((t) => [t.id, t.due_at]));

  if (activeTaskIds.length === 0) {
    return { totalAssignments: 0, completed: 0, overdue: 0, onTime: 0, late: 0 };
  }

  // 2) All assignments for active tasks
  const { data: targets, error: targetErr } = await sb
    .from("task_targets")
    .select("task_id,status,completed_at")
    .in("task_id", activeTaskIds);

  if (targetErr) throw targetErr;

  const rows = (targets ?? []) as {
    task_id: string;
    status: "pending" | "in_progress" | "pending_review" | "completed";
    completed_at: string | null;
  }[];

  const totalAssignments = rows.length;
  const completedRows = rows.filter((r) => r.status === "completed");
  const completed = completedRows.length;

  // overdue: not completed + due exists + due < now
  const overdue = rows.filter((r) => {
    if (r.status === "completed") return false;
    const due = dueMap.get(r.task_id) ?? null;
    const dueMs = toMs(due);
    if (!dueMs) return false;
    return dueMs < now;
  }).length;

  // onTime/late among completed:
  // - if due is null -> count as onTime
  // - else compare completed_at vs due_at
  let onTime = 0;
  let late = 0;

  for (const r of completedRows) {
    const due = dueMap.get(r.task_id) ?? null;
    const dueMs = toMs(due);
    const doneMs = toMs(r.completed_at);

    if (!doneMs) continue; // weird but safe
    if (!dueMs) {
      onTime += 1;
    } else if (doneMs <= dueMs) {
      onTime += 1;
    } else {
      late += 1;
    }
  }

  return { totalAssignments, completed, overdue, onTime, late };
}

/**
 * Optional: Pending approvals count (HQ Dashboard card)
 * One per store-task = task_targets.status='pending_review' (active tasks only)
 */
export async function fetchPendingApprovalsCount(): Promise<number> {
  const { data: tasks, error: taskErr } = await sb
    .from("tasks")
    .select("id")
    .eq("status", "active");

  if (taskErr) throw taskErr;

  const ids = (tasks ?? []).map((t: any) => t.id);
  if (!ids.length) return 0;

  const { data: rows, error } = await sb
    .from("task_targets")
    .select("task_id")
    .in("task_id", ids)
    .eq("status", "pending_review");

  if (error) throw error;
  return (rows ?? []).length;
}