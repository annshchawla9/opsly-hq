// ===============================
// HQ APP — Tasks & Campaigns (COPY-PASTE)
// Adds: Resolve Task (tasks.status='resolved', resolved_at=now())
// Shows ONLY active tasks everywhere, and KPI counts ignore resolved tasks.
// ===============================

import React, { useEffect, useMemo, useState } from "react";
import { Plus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sb = supabase as any;

type DbTask = {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "critical";
  due_at: string | null;
  requires_proof: boolean | null;
  created_by: string | null;
  created_at: string;

  // ✅ NEW for resolve
  status?: string | null; // 'active' | 'resolved'
  resolved_at?: string | null;
};

type DbTaskTarget = {
  task_id: string;
  store_id: string;
  status: "pending" | "in_progress" | "pending_review" | "completed";
  completed_at: string | null;
  review_note?: string | null;
};

type ProofRow = {
  id: string;
  task_id: string;
  store_id: string;
  image_url: string;
  approved: boolean | null;
  created_at?: string;
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/10 text-info",
  high: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

function parseDatetimeLocalToISO(val: string) {
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default function Tasks() {
  const { stores, appUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [targets, setTargets] = useState<DbTaskTarget[]>([]);
  const [allProofs, setAllProofs] = useState<ProofRow[]>([]);

  // New task modal state
  const [openNew, setOpenNew] = useState(false);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<DbTask["priority"]>("high");
  const [requiresProof, setRequiresProof] = useState(true);
  const [dueAt, setDueAt] = useState<string>("");

  // Assign stores
  const [assignAll, setAssignAll] = useState(false);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  // Task details modal
  const [openDetails, setOpenDetails] = useState(false);
  const [activeTask, setActiveTask] = useState<DbTask | null>(null);
  const [taskProofs, setTaskProofs] = useState<ProofRow[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Review panel state
  const [reviewStoreId, setReviewStoreId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<string>("");

  // Proof filter selection (All stores OR one store)
  const ALL_STORES = "__all__";
  const [selectedProofStoreId, setSelectedProofStoreId] =
    useState<string>(ALL_STORES);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  async function fetchAll() {
    setLoading(true);
    try {
      const [
        { data: taskRows, error: taskErr },
        { data: targetRows, error: targetErr },
        { data: proofRows, error: proofErr },
      ] = await Promise.all([
        // ✅ ONLY ACTIVE TASKS
        sb
          .from("tasks")
          .select(
            "id,title,description,priority,due_at,requires_proof,created_by,created_at,status,resolved_at"
          )
          .eq("status", "active")
          .order("created_at", { ascending: false }),

        sb
          .from("task_targets")
          .select("task_id,store_id,status,completed_at,review_note"),

        sb
          .from("task_proofs")
          .select("id,task_id,store_id,image_url,approved,created_at"),
      ]);

      if (taskErr) throw taskErr;
      if (targetErr) throw targetErr;
      if (proofErr) throw proofErr;

      setTasks((taskRows || []) as DbTask[]);
      setTargets((targetRows || []) as DbTaskTarget[]);
      setAllProofs((proofRows || []) as ProofRow[]);
    } catch (e) {
      console.error("HQ Tasks fetch error:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Active task ids set (so KPIs ignore resolved tasks)
  const activeTaskIdSet = useMemo(
    () => new Set(tasks.map((t) => t.id)),
    [tasks]
  );

  const now = Date.now();

  // ===============================
  // ✅ KPI FIXES (ONLY THESE)
  // ===============================

  // ✅ Total Tasks should count assignments (task_targets) for active tasks
  const totalTasksCount = useMemo(() => {
    return targets.filter((t) => activeTaskIdSet.has(t.task_id)).length;
  }, [targets, activeTaskIdSet]);

  const completedCount = useMemo(() => {
    return targets.filter(
      (t) => activeTaskIdSet.has(t.task_id) && t.status === "completed"
    ).length;
  }, [targets, activeTaskIdSet]);

  // ✅ NEW KPI: Incomplete Tasks = active assignments that are NOT completed
  const incompleteCount = useMemo(() => {
    return targets.filter(
      (t) => activeTaskIdSet.has(t.task_id) && t.status !== "completed"
    ).length;
  }, [targets, activeTaskIdSet]);

  const overdueCount = useMemo(() => {
    const taskDueMap = new Map(tasks.map((t) => [t.id, t.due_at]));
    return targets.filter((tt) => {
      if (!activeTaskIdSet.has(tt.task_id)) return false;
      if (tt.status === "completed") return false;
      const due = taskDueMap.get(tt.task_id);
      if (!due) return false;
      return new Date(due).getTime() < now;
    }).length;
  }, [targets, tasks, now, activeTaskIdSet]);

  // ✅ Pending Proofs should be 1 per store-task (NOT per photo)
  const pendingProofsCount = useMemo(() => {
    // just count task_targets in pending_review for active tasks
    return targets.filter(
      (t) => activeTaskIdSet.has(t.task_id) && t.status === "pending_review"
    ).length;
  }, [targets, activeTaskIdSet]);

  // ===============================

  const tasksWithProgress = useMemo(() => {
    const byTask = new Map<string, DbTaskTarget[]>();
    for (const t of targets) {
      const arr = byTask.get(t.task_id) || [];
      arr.push(t);
      byTask.set(t.task_id, arr);
    }
    return tasks.map((task) => {
      const a = byTask.get(task.id) || [];
      const completed = a.filter((x) => x.status === "completed").length;
      return { task, assignments: a, completed };
    });
  }, [tasks, targets]);

  function resetNewTaskForm() {
    setTitle("");
    setDescription("");
    setPriority("high");
    setRequiresProof(true);
    setDueAt("");
    setAssignAll(false);
    setSelectedStoreIds([]);
  }

  const toggleStore = (id: string) => {
    setSelectedStoreIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  async function createTask() {
    if (!appUser?.id) return;
    if (!title.trim()) return;

    const storeIds = assignAll ? stores.map((s) => s.id) : selectedStoreIds;
    if (!storeIds.length) return;

    setCreating(true);
    try {
      const dueISO = dueAt ? parseDatetimeLocalToISO(dueAt) : null;

      const { data: insertedTask, error: taskErr } = await sb
        .from("tasks")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          due_at: dueISO,
          requires_proof: requiresProof,
          created_by: appUser.id,
          // ✅ ensure it's active
          status: "active",
          resolved_at: null,
        })
        .select("id")
        .single();

      if (taskErr) throw taskErr;

      const rows = storeIds.map((store_id: string) => ({
        task_id: insertedTask.id,
        store_id,
        status: "pending",
        completed_at: null,
        review_note: null,
      }));

      const { error: targetErr } = await sb.from("task_targets").insert(rows);
      if (targetErr) throw targetErr;

      setOpenNew(false);
      resetNewTaskForm();
      await fetchAll();
    } catch (e) {
      console.error("Create task error:", e);
    } finally {
      setCreating(false);
    }
  }

  function storeLabel(store_id: string) {
    const s = stores.find((x) => x.id === store_id);
    return s ? `${s.code} — ${s.name}` : store_id;
  }

  function statusBadge(status: DbTaskTarget["status"]) {
    if (status === "pending_review")
      return <Badge variant="secondary">pending_review</Badge>;
    if (status === "completed")
      return <Badge className="bg-success/10 text-success">completed</Badge>;
    if (status === "in_progress")
      return <Badge className="bg-info/10 text-info">in_progress</Badge>;
    return <Badge variant="outline">pending</Badge>;
  }

  // ✅ NEW: Resolve Task (removes from HQ + Store by status filter)
  async function resolveTask(taskId: string) {
    try {
      const { error } = await sb
        .from("tasks")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", taskId);

      if (error) throw error;

      setOpenDetails(false);
      setActiveTask(null);
      await fetchAll();
    } catch (e) {
      console.error("Resolve task error:", e);
      alert("Failed to resolve task. Check console.");
    }
  }

  async function openTaskDetails(task: DbTask) {
    setActiveTask(task);
    setTaskProofs([]);
    setSignedUrls({});
    setOpenDetails(true);

    setReviewStoreId(null);
    setReviewNote("");

    setSelectedProofStoreId(ALL_STORES);

    setPreviewOpen(false);
    setPreviewIndex(0);

    try {
      const { data: proofs, error } = await sb
        .from("task_proofs")
        .select("id,task_id,store_id,image_url,approved,created_at")
        .eq("task_id", task.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (proofs || []) as ProofRow[];
      setTaskProofs(rows);

      const urlMap: Record<string, string> = {};
      for (const p of rows) {
        const { data } = await supabase.storage
          .from("task_proofs")
          .createSignedUrl(p.image_url, 60 * 60);
        if (data?.signedUrl) urlMap[p.id] = data.signedUrl;
      }
      setSignedUrls(urlMap);
    } catch (e) {
      console.error("Open task details error:", e);
    }
  }

  const activeAssignments = useMemo(() => {
    if (!activeTask) return [];
    return targets
      .filter((t) => t.task_id === activeTask.id)
      .sort((a, b) =>
        storeLabel(a.store_id).localeCompare(storeLabel(b.store_id))
      );
  }, [activeTask, targets, stores]);

  const visibleProofs = useMemo(() => {
    return taskProofs.filter((p) =>
      selectedProofStoreId === ALL_STORES
        ? true
        : p.store_id === selectedProofStoreId
    );
  }, [taskProofs, selectedProofStoreId]);

  async function approveStoreSubmission(taskId: string, storeId: string) {
    try {
      const nowIso = new Date().toISOString();

      const { error: tErr } = await sb
        .from("task_targets")
        .update({
          status: "completed",
          completed_at: nowIso,
          review_note: null,
        })
        .eq("task_id", taskId)
        .eq("store_id", storeId);

      if (tErr) throw tErr;

      const { error: pErr } = await sb
        .from("task_proofs")
        .update({ approved: true })
        .eq("task_id", taskId)
        .eq("store_id", storeId);

      if (pErr) throw pErr;

      await fetchAll();
      if (activeTask) await openTaskDetails(activeTask);
    } catch (e) {
      console.error("Approve submission error:", e);
      alert("Failed to approve. Check console.");
    }
  }

  async function requestChangesForStore(
    taskId: string,
    storeId: string,
    note: string
  ) {
    try {
      const clean = note.trim();
      if (!clean) return alert("Please write the extra requirements / note.");

      const { error: tErr } = await sb
        .from("task_targets")
        .update({
          status: "in_progress",
          completed_at: null,
          review_note: clean,
        })
        .eq("task_id", taskId)
        .eq("store_id", storeId);

      if (tErr) throw tErr;

      const { error: pErr } = await sb
        .from("task_proofs")
        .update({ approved: false })
        .eq("task_id", taskId)
        .eq("store_id", storeId);

      if (pErr) throw pErr;

      await fetchAll();
      if (activeTask) await openTaskDetails(activeTask);

      setReviewNote("");
      setReviewStoreId(null);
    } catch (e) {
      console.error("Request changes error:", e);
      alert("Failed to request changes. Check console.");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks & Campaigns</h1>
          <p className="text-muted-foreground">Create and manage store tasks</p>
        </div>

        <Dialog
          open={openNew}
          onOpenChange={(v) => {
            setOpenNew(v);
            if (!v) resetNewTaskForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Title</div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Inventory Audit"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Description</div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What should the store do?"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Priority</div>
                  <Select
                    value={priority}
                    onValueChange={(v) => setPriority(v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">low</SelectItem>
                      <SelectItem value="medium">medium</SelectItem>
                      <SelectItem value="high">high</SelectItem>
                      <SelectItem value="critical">critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Due at</div>
                  <Input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground">Optional</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={requiresProof}
                  onCheckedChange={(v) => setRequiresProof(Boolean(v))}
                />
                <span className="text-sm">Requires photo proof</span>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Assign to</div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={assignAll}
                    onCheckedChange={(v) => setAssignAll(Boolean(v))}
                  />
                  <span className="text-sm">All stores</span>
                </div>

                {!assignAll && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-lg p-3 max-h-48 overflow-auto">
                    {stores.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={selectedStoreIds.includes(s.id)}
                          onCheckedChange={() => toggleStore(s.id)}
                        />
                        <span>
                          {s.code} — {s.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {!assignAll && selectedStoreIds.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    Select at least 1 store.
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenNew(false)}>
                Cancel
              </Button>
              <Button
                onClick={createTask}
                disabled={
                  creating ||
                  !title.trim() ||
                  (!assignAll && selectedStoreIds.length === 0)
                }
              >
                {creating ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ✅ ONLY KPI CARDS UPDATED */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="stats-card">
          <p className="text-sm text-muted-foreground">Total Tasks</p>
          <p className="text-3xl font-bold">
            {loading ? "—" : totalTasksCount}
          </p>
        </div>

        <div className="stats-card">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-3xl font-bold text-success">
            {loading ? "—" : completedCount}
          </p>
        </div>

        <div className="stats-card">
          <p className="text-sm text-muted-foreground">Incomplete Tasks</p>
          <p className="text-3xl font-bold text-muted-foreground">
            {loading ? "—" : incompleteCount}
          </p>
        </div>

        <div className="stats-card">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-3xl font-bold text-destructive">
            {loading ? "—" : overdueCount}
          </p>
        </div>

        <div className="stats-card">
          <p className="text-sm text-muted-foreground">Pending Proofs</p>
          <p className="text-3xl font-bold text-warning">
            {loading ? "—" : pendingProofsCount}
          </p>
        </div>
      </div>

      <div className="dashboard-widget">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Active Tasks</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAll}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>

        <div className="divide-y">
          {tasksWithProgress.map(({ task, assignments, completed }) => {
            const dueStr = task.due_at
              ? new Date(task.due_at).toLocaleString()
              : "—";
            return (
              <div
                key={task.id}
                className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => openTaskDetails(task)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-medium">{task.title}</h4>
                      <Badge className={cn(priorityColors[task.priority])}>
                        {task.priority}
                      </Badge>
                      {task.requires_proof && (
                        <Badge variant="outline">Proof required</Badge>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span>Due: {dueStr}</span>
                      <span>
                        Stores: {completed}/{assignments.length} completed
                      </span>
                      <span className="underline">Click to view details</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!loading && tasksWithProgress.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No tasks yet. Create your first task.
            </div>
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      <Dialog
        open={openDetails}
        onOpenChange={(v) => {
          setOpenDetails(v);
          if (!v) {
            setActiveTask(null);
            setReviewStoreId(null);
            setReviewNote("");
            setSelectedProofStoreId(ALL_STORES);
            setPreviewOpen(false);
            setPreviewIndex(0);
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{activeTask?.title || "Task Details"}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto pr-1 max-h-[70vh]">
            {activeTask && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Store Status */}
                <div className="border rounded-lg p-4">
                  <div className="font-semibold mb-3">Store Status</div>

                  <div className="space-y-2">
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-md px-2 py-2 cursor-pointer hover:bg-muted/30 transition",
                        selectedProofStoreId === ALL_STORES &&
                          "bg-muted/70 ring-1 ring-primary/20"
                      )}
                      onClick={() => setSelectedProofStoreId(ALL_STORES)}
                    >
                      <div className="text-sm font-medium">All stores</div>
                      <Badge variant="outline">view all proofs</Badge>
                    </div>

                    {activeAssignments.map((a) => (
                      <div
                        key={`${a.task_id}-${a.store_id}`}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-md px-2 py-2 cursor-pointer hover:bg-muted/30 transition",
                          selectedProofStoreId === a.store_id &&
                            "bg-muted/70 ring-1 ring-primary/20"
                        )}
                        onClick={() => {
                          setSelectedProofStoreId(a.store_id);
                          setPreviewOpen(false);
                          setPreviewIndex(0);
                        }}
                      >
                        <div className="text-sm">{storeLabel(a.store_id)}</div>

                        <div className="flex items-center gap-2">
                          {statusBadge(a.status)}

                          {a.status === "pending_review" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReviewStoreId(a.store_id);
                                setReviewNote(a.review_note || "");
                                setSelectedProofStoreId(a.store_id);
                                setPreviewOpen(false);
                                setPreviewIndex(0);
                              }}
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                    {activeAssignments.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No store targets found.
                      </div>
                    )}
                  </div>

                  {reviewStoreId && (
                    <div className="mt-4 rounded-lg border bg-muted/20 p-3">
                      <div className="text-xs font-semibold mb-1">
                        Current note for {storeLabel(reviewStoreId)}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {activeAssignments.find(
                          (x) => x.store_id === reviewStoreId
                        )?.review_note || "—"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Proofs */}
                <div className="border rounded-lg p-4">
                  <div className="font-semibold mb-3">
                    Proofs{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      —{" "}
                      {selectedProofStoreId === ALL_STORES
                        ? "All stores"
                        : storeLabel(selectedProofStoreId)}
                    </span>
                  </div>

                  {/* Review Panel */}
                  {activeTask && reviewStoreId && (
                    <div className="mb-4 rounded-xl border p-3 bg-muted/20">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-sm">
                            Review: {storeLabel(reviewStoreId)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Approve to mark completed. Or request changes with a
                            note.
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReviewStoreId(null);
                            setReviewNote("");
                          }}
                        >
                          Close
                        </Button>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-medium">
                          Extra requirements / note
                        </div>
                        <Textarea
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          rows={3}
                          placeholder="e.g., Please upload a clearer picture from the front + show full display area."
                        />

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() =>
                              approveStoreSubmission(activeTask.id, reviewStoreId)
                            }
                          >
                            Approve & Mark Completed
                          </Button>

                          <Button
                            onClick={() =>
                              requestChangesForStore(
                                activeTask.id,
                                reviewStoreId,
                                reviewNote
                              )
                            }
                          >
                            Request Changes
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {taskProofs.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No proofs yet
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {visibleProofs.map((p) => {
                        const url = signedUrls[p.id];
                        const label = `${storeLabel(p.store_id)
                          .split("—")[0]
                          .trim()} • ${
                          p.created_at
                            ? new Date(p.created_at).toLocaleString()
                            : ""
                        }`;

                        return (
                          <div
                            key={p.id}
                            className="border rounded-lg overflow-hidden"
                          >
                            <div className="text-[11px] px-2 py-1 text-muted-foreground bg-muted/30 flex items-center justify-between gap-2">
                              <span className="truncate">{label}</span>
                              {p.approved === true ? (
                                <Badge
                                  className="bg-success/10 text-success"
                                  variant="secondary"
                                >
                                  Approved
                                </Badge>
                              ) : p.approved === false ? (
                                <Badge
                                  className="bg-destructive/10 text-destructive"
                                  variant="secondary"
                                >
                                  Rejected
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </div>

                            {url ? (
                              <button
                                type="button"
                                className="block w-full"
                                onClick={() => {
                                  const idx = visibleProofs.findIndex(
                                    (x) => x.id === p.id
                                  );
                                  setPreviewIndex(Math.max(0, idx));
                                  setPreviewOpen(true);
                                }}
                              >
                                <img
                                  src={url}
                                  alt="proof"
                                  className="w-full h-28 object-cover hover:opacity-90 transition"
                                />
                              </button>
                            ) : (
                              <div className="w-full h-28 flex items-center justify-center text-xs text-muted-foreground">
                                Loading…
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 p-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => {
                                  const idx = visibleProofs.findIndex(
                                    (x) => x.id === p.id
                                  );
                                  setPreviewIndex(Math.max(0, idx));
                                  setPreviewOpen(true);
                                }}
                                disabled={!url}
                              >
                                <ExternalLink className="h-4 w-4" />
                                Preview
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <div>
              {activeTask && (
                <Button
                  variant="destructive"
                  onClick={() => resolveTask(activeTask.id)}
                >
                  Resolve Task
                </Button>
              )}
            </div>

            <Button variant="outline" onClick={() => setOpenDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Preview ({Math.min(previewIndex + 1, visibleProofs.length)} /{" "}
              {visibleProofs.length})
            </DialogTitle>
          </DialogHeader>

          {visibleProofs.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No proofs to preview.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                  disabled={previewIndex === 0}
                >
                  Previous
                </Button>

                <div className="text-sm text-muted-foreground truncate">
                  {storeLabel(visibleProofs[previewIndex]?.store_id || "")}
                </div>

                <Button
                  variant="outline"
                  onClick={() =>
                    setPreviewIndex((i) =>
                      Math.min(visibleProofs.length - 1, i + 1)
                    )
                  }
                  disabled={previewIndex >= visibleProofs.length - 1}
                >
                  Next
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden bg-muted/20">
                {signedUrls[visibleProofs[previewIndex].id] ? (
                  <img
                    src={signedUrls[visibleProofs[previewIndex].id]}
                    alt="preview"
                    className="w-full max-h-[70vh] object-contain"
                  />
                ) : (
                  <div className="w-full h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
                    Loading…
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}