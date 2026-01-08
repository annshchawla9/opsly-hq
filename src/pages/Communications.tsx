// src/pages/Communications.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Plus, Eye, MessageSquare, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendMessageToStores } from "@/services/hqMessages";

// ---------- DB Row Types ----------
type DbMessage = {
  id: string;
  title: string;
  body: string;
  sender_user_id: string | null;
  is_announcement: boolean;
  requires_ack: boolean;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
};

type DbMessageTarget = {
  message_id: string;
  store_id: string;
};

type DbMessageRead = {
  message_id: string;
  store_id: string;
  read_at: string | null;
  acknowledged_at: string | null;
};

type ReadKey = `${string}|${string}`;

function formatDT(dt: string | null | undefined) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function maxDate(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export default function Communications() {
  const { appUser, stores } = useAuth();

  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [targets, setTargets] = useState<DbMessageTarget[]>([]);
  const [reads, setReads] = useState<DbMessageRead[]>([]);

  // New message modal state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(true);
  const [requiresAck, setRequiresAck] = useState(false);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  // Details modal state (Read/Ack)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMsgId, setDetailsMsgId] = useState<string | null>(null);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMsgId, setPreviewMsgId] = useState<string | null>(null);

  // Resolve state
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      // 1) messages (ACTIVE only)
      const { data: msgRows, error: msgErr } = await (supabase as any)
        .from("messages")
        .select(
          "id,title,body,sender_user_id,is_announcement,requires_ack,created_at,resolved_at,resolved_by"
        )
        .is("resolved_at", null)
        .order("created_at", { ascending: false });

      if (msgErr) throw msgErr;

      const msgs: DbMessage[] = (msgRows || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        body: m.body,
        sender_user_id: m.sender_user_id ?? null,
        is_announcement: !!m.is_announcement,
        requires_ack: !!m.requires_ack,
        created_at: m.created_at,
        resolved_at: m.resolved_at ?? null,
        resolved_by: m.resolved_by ?? null,
      }));

      setMessages(msgs);

      const messageIds = msgs.map((m) => m.id);
      if (!messageIds.length) {
        setTargets([]);
        setReads([]);
        return;
      }

      // 2) targets
      const { data: targetRows, error: targetErr } = await (supabase as any)
        .from("message_targets")
        .select("message_id, store_id")
        .in("message_id", messageIds);

      if (targetErr) throw targetErr;
      setTargets((targetRows || []) as DbMessageTarget[]);

      // 3) reads
      const { data: readRows, error: readErr } = await (supabase as any)
        .from("message_reads")
        .select("message_id, store_id, read_at, acknowledged_at")
        .in("message_id", messageIds);

      if (readErr) throw readErr;
      setReads((readRows || []) as DbMessageRead[]);
    } catch (e) {
      console.error("Communications load error:", e);
      setMessages([]);
      setTargets([]);
      setReads([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const storeNameById = useMemo(() => {
    const map = new Map<string, string>();
    (stores || []).forEach((s: any) => map.set(s.id, s.name || s.store_name || s.code));
    return map;
  }, [stores]);

  const readMap = useMemo(() => {
    const map = new Map<ReadKey, DbMessageRead>();
    (reads || []).forEach((r) => {
      map.set(`${r.message_id}|${r.store_id}`, r);
    });
    return map;
  }, [reads]);

  // ✅ Correct stats at target level (works even if message_reads row doesn't exist yet)
  const stats = useMemo(() => {
    const totalTargets = targets.length;

    let readCount = 0;
    let ackCount = 0;

    targets.forEach((t) => {
      const r = readMap.get(`${t.message_id}|${t.store_id}` as ReadKey);
      if (r?.read_at) readCount += 1;
      if (r?.acknowledged_at) ackCount += 1;
    });

    const unreadCount = Math.max(totalTargets - readCount, 0);

    return { totalTargets, readCount, unreadCount, ackCount };
  }, [targets, readMap]);

  function toggleStore(storeId: string) {
    setSelectedStoreIds((prev) =>
      prev.includes(storeId) ? prev.filter((x) => x !== storeId) : [...prev, storeId]
    );
  }

  function selectAllStores() {
    const all = (stores || []).map((s: any) => s.id);
    setSelectedStoreIds(all);
  }

  function clearStores() {
    setSelectedStoreIds([]);
  }

  async function onSend() {
    if (!appUser?.id) {
      alert("Not logged in.");
      return;
    }

    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle || !cleanBody) {
      alert("Please enter both title and body.");
      return;
    }

    if (!selectedStoreIds.length) {
      alert("Please select at least one store.");
      return;
    }

    const res = await sendMessageToStores({
      title: cleanTitle,
      body: cleanBody,
      senderUserId: appUser.id, // public.users.id
      isAnnouncement,
      requiresAck,
      storeIds: selectedStoreIds,
    });

    if (!res.ok) {
      const errMsg =
        "error" in res && typeof (res as any).error === "string"
          ? (res as any).error
          : "Failed to send message.";
      alert(errMsg);
      return;
    }

    // reset & refresh
    setOpen(false);
    setTitle("");
    setBody("");
    setIsAnnouncement(true);
    setRequiresAck(false);
    setSelectedStoreIds([]);

    await loadAll();
  }

  async function resolveMessage(messageId: string) {
    if (!appUser?.id) {
      alert("Not logged in.");
      return;
    }

    const ok = window.confirm("Resolve this message? It will be removed from store inbox.");
    if (!ok) return;

    try {
      setResolvingId(messageId);

      const { error } = await (supabase as any)
        .from("messages")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: appUser.id,
        })
        .eq("id", messageId);

      if (error) throw error;

      // close modals if they were open on this message
      if (detailsMsgId === messageId) {
        setDetailsOpen(false);
        setDetailsMsgId(null);
      }
      if (previewMsgId === messageId) {
        setPreviewOpen(false);
        setPreviewMsgId(null);
      }

      await loadAll();
    } catch (e) {
      console.error("Resolve message error:", e);
      alert("Failed to resolve message.");
    } finally {
      setResolvingId(null);
    }
  }

  function openDetails(messageId: string) {
    setDetailsMsgId(messageId);
    setDetailsOpen(true);
  }

  function openPreview(messageId: string) {
    setPreviewMsgId(messageId);
    setPreviewOpen(true);
  }

  const detailsMessage = useMemo(
    () => messages.find((m) => m.id === detailsMsgId) || null,
    [messages, detailsMsgId]
  );

  const detailsTargets = useMemo(() => {
    if (!detailsMsgId) return [];
    return targets.filter((t) => t.message_id === detailsMsgId);
  }, [targets, detailsMsgId]);

  const previewMessage = useMemo(
    () => messages.find((m) => m.id === previewMsgId) || null,
    [messages, previewMsgId]
  );

  const previewTargets = useMemo(() => {
    if (!previewMsgId) return [];
    return targets.filter((t) => t.message_id === previewMsgId);
  }, [targets, previewMsgId]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Communications</h1>
          <p className="text-muted-foreground">Send announcements and messages to stores</p>
        </div>

        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New Message
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stats-card">
          <p className="text-sm text-muted-foreground">Deliveries</p>
          <p className="text-3xl font-bold">{loading ? "…" : stats.totalTargets}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Counts per store (1 message to 3 stores = 3)
          </p>
        </div>

        <div className="stats-card">
          <p className="text-sm text-muted-foreground">Read by Stores</p>
          <p className="text-3xl font-bold text-success">{loading ? "…" : stats.readCount}</p>
        </div>

        <div className="stats-card">
          <p className="text-sm text-muted-foreground">Acknowledged</p>
          <p className="text-3xl font-bold text-primary">{loading ? "…" : stats.ackCount}</p>
        </div>

        <div className="stats-card">
          <p className="text-sm text-muted-foreground">Unread</p>
          <p className="text-3xl font-bold text-warning">{loading ? "…" : stats.unreadCount}</p>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="dashboard-widget">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Recent Messages</h3>
        </div>

        <div className="divide-y">
          {loading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}

          {!loading && messages.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              No active messages. Click <b>New Message</b> to send one.
            </div>
          )}

          {!loading &&
            messages.map((msg) => {
              const msgTargets = targets.filter((t) => t.message_id === msg.id);

              const readCount = msgTargets.reduce((acc, t) => {
                const r = readMap.get(`${msg.id}|${t.store_id}` as ReadKey);
                return acc + (r?.read_at ? 1 : 0);
              }, 0);

              const ackCount = msgTargets.reduce((acc, t) => {
                const r = readMap.get(`${msg.id}|${t.store_id}` as ReadKey);
                return acc + (r?.acknowledged_at ? 1 : 0);
              }, 0);

              let latestRead: string | null = null;
              let latestAck: string | null = null;
              msgTargets.forEach((t) => {
                const r = readMap.get(`${msg.id}|${t.store_id}` as ReadKey);
                latestRead = maxDate(latestRead, r?.read_at ?? null);
                latestAck = maxDate(latestAck, r?.acknowledged_at ?? null);
              });

              return (
                <div key={msg.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium">{msg.title}</h4>

                        <Badge variant={msg.is_announcement ? "secondary" : "default"}>
                          {msg.is_announcement ? "announcement" : "actionable"}
                        </Badge>

                        {msg.requires_ack && <Badge variant="outline">Ack Required</Badge>}

                        <Badge variant="outline">
                          {readCount}/{msgTargets.length} read
                        </Badge>

                        {msg.requires_ack && (
                          <Badge variant="outline">
                            {ackCount}/{msgTargets.length} ack
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">{msg.body}</p>

                      {msgTargets.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Targeted:{" "}
                          {msgTargets
                            .slice(0, 6)
                            .map((t) => storeNameById.get(t.store_id) || t.store_id)
                            .join(", ")}
                          {msgTargets.length > 6 ? "…" : ""}
                        </p>
                      )}

                      <div className="mt-2 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <span>Latest read: {formatDT(latestRead)}</span>
                        {msg.requires_ack && <span>Latest ack: {formatDT(latestAck)}</span>}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => openPreview(msg.id)}
                        >
                          <MessageSquare className="h-4 w-4" /> Preview
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => openDetails(msg.id)}
                        >
                          <Eye className="h-4 w-4" /> Read / Ack details
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={resolvingId === msg.id}
                          onClick={() => resolveMessage(msg.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {resolvingId === msg.id ? "Resolving…" : "Resolve"}
                        </Button>
                      </div>
                    </div>

                    <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                      {formatDT(msg.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* New Message Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Send a message from HQ to one or more stores (e.g., DGK).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title…" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Body</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the message…"
                rows={5}
              />
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isAnnouncement}
                  onCheckedChange={(v) => setIsAnnouncement(Boolean(v))}
                />
                <span className="text-sm">Announcement</span>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox checked={requiresAck} onCheckedChange={(v) => setRequiresAck(Boolean(v))} />
                <span className="text-sm">Requires Acknowledgement</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Target Stores</label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllStores}>
                    Select all
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearStores}>
                    Clear
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg p-3 max-h-56 overflow-auto space-y-2">
                {(stores || []).map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedStoreIds.includes(s.id)}
                      onCheckedChange={() => toggleStore(s.id)}
                    />
                    <span className="text-sm">
                      {s.code} — {s.name}
                    </span>
                  </div>
                ))}

                {(stores || []).length === 0 && (
                  <div className="text-sm text-muted-foreground">No stores found.</div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">Selected: {selectedStoreIds.length}</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={onSend}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Read/Ack Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Read / Acknowledgement Details</DialogTitle>
            <DialogDescription>Store-wise status for this message.</DialogDescription>
          </DialogHeader>

          {detailsMessage ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-semibold">{detailsMessage.title}</h3>
                <Badge variant={detailsMessage.is_announcement ? "secondary" : "default"}>
                  {detailsMessage.is_announcement ? "announcement" : "actionable"}
                </Badge>
                {detailsMessage.requires_ack && <Badge variant="outline">Ack Required</Badge>}
              </div>

              <div className="border rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground">
                  <div className="col-span-4">Store</div>
                  <div className="col-span-4">Read at</div>
                  <div className="col-span-4">Acknowledged at</div>
                </div>

                {detailsTargets.map((t) => {
                  const r = readMap.get(`${t.message_id}|${t.store_id}` as ReadKey);
                  const storeLabel = storeNameById.get(t.store_id) || t.store_id;

                  return (
                    <div
                      key={`${t.message_id}|${t.store_id}`}
                      className="grid grid-cols-12 gap-2 px-4 py-3 border-t text-sm"
                    >
                      <div className="col-span-4 flex items-center gap-2">
                        <span className="font-medium">{storeLabel}</span>
                        {r?.read_at ? <Badge variant="outline">Read</Badge> : <Badge variant="outline">Unread</Badge>}
                        {detailsMessage.requires_ack &&
                          (r?.acknowledged_at ? (
                            <Badge variant="outline">Ack</Badge>
                          ) : (
                            <Badge variant="outline">No Ack</Badge>
                          ))}
                      </div>
                      <div className="col-span-4 text-muted-foreground">{formatDT(r?.read_at)}</div>
                      <div className="col-span-4 text-muted-foreground">{formatDT(r?.acknowledged_at)}</div>
                    </div>
                  );
                })}

                {detailsTargets.length === 0 && (
                  <div className="px-4 py-3 text-sm text-muted-foreground">No targets found.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No message selected.</div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
            <DialogDescription>This is what stores will see.</DialogDescription>
          </DialogHeader>

          {previewMessage ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold">{previewMessage.title}</h3>
                    <Badge variant={previewMessage.is_announcement ? "secondary" : "default"}>
                      {previewMessage.is_announcement ? "announcement" : "actionable"}
                    </Badge>
                    {previewMessage.requires_ack && <Badge variant="outline">Ack Required</Badge>}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Sent {formatDT(previewMessage.created_at)}
                  </div>
                </div>
              </div>

              <div className="border rounded-xl p-4 bg-muted/20">
                <p className="whitespace-pre-wrap leading-relaxed">{previewMessage.body}</p>
              </div>

              <div className="text-sm">
                <div className="text-muted-foreground mb-1">Targeted stores</div>
                <div className="flex flex-wrap gap-2">
                  {previewTargets.map((t) => (
                    <Badge key={`${t.message_id}|${t.store_id}`} variant="outline">
                      {storeNameById.get(t.store_id) || t.store_id}
                    </Badge>
                  ))}
                  {previewTargets.length === 0 && <span className="text-muted-foreground">—</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No message selected.</div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}