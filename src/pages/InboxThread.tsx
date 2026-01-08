// src/pages/InboxThread.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, RefreshCw, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type DbHQThread = {
  id: string;
  store_id: string;
  subject: string;
  status: string | null; // 'open' | 'resolved'
  created_by_user_id: string | null;
  created_at: string;
  last_message_at: string | null;
};

type DbHQMessage = {
  id: string;
  thread_id: string;
  sender_role: string; // 'store' | 'hq'
  sender_user_id: string | null;
  body: string;
  created_at: string;
  hq_read_at: string | null;
  store_read_at: string | null;
};

function formatDateTime(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export default function InboxThread() {
  const navigate = useNavigate();
  const { threadId } = useParams();
  const { appUser, stores } = useAuth();

  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<DbHQThread | null>(null);
  const [messages, setMessages] = useState<DbHQMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);

  const storeNameById = useMemo(() => {
    const map = new Map<string, string>();
    (stores || []).forEach((s: any) => map.set(s.id, `${s.code ?? ""} — ${s.name ?? ""}`.trim()));
    return map;
  }, [stores]);

  async function loadThread() {
    if (!threadId) return;
    setLoading(true);
    try {
      const { data: tRow, error: tErr } = await (supabase as any)
        .from("hq_threads")
        .select("id,store_id,subject,status,created_by_user_id,created_at,last_message_at")
        .eq("id", threadId)
        .maybeSingle();

      if (tErr) throw tErr;
      if (!tRow) {
        setThread(null);
        setMessages([]);
        return;
      }

      const t: DbHQThread = {
        id: tRow.id,
        store_id: tRow.store_id,
        subject: tRow.subject,
        status: tRow.status ?? null,
        created_by_user_id: tRow.created_by_user_id ?? null,
        created_at: tRow.created_at,
        last_message_at: tRow.last_message_at ?? null,
      };
      setThread(t);

      const { data: msgRows, error: mErr } = await (supabase as any)
        .from("hq_messages")
        .select("id,thread_id,sender_role,sender_user_id,body,created_at,hq_read_at,store_read_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (mErr) throw mErr;
      const msgs = (msgRows || []) as DbHQMessage[];
      setMessages(msgs);

      // Mark as read for HQ: all store messages where hq_read_at is null
      const unreadStoreMsgIds = msgs
        .filter((m) => m.sender_role === "store" && !m.hq_read_at)
        .map((m) => m.id);

      if (unreadStoreMsgIds.length) {
        const nowIso = new Date().toISOString();
        const { error: updErr } = await (supabase as any)
          .from("hq_messages")
          .update({ hq_read_at: nowIso })
          .in("id", unreadStoreMsgIds);

        if (updErr) console.warn("Failed to mark HQ read:", updErr);

        setMessages((prev) =>
          prev.map((m) => (unreadStoreMsgIds.includes(m.id) ? { ...m, hq_read_at: nowIso } : m))
        );
      }
    } catch (e) {
      console.error("InboxThread load error:", e);
      setThread(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  async function resolveThread() {
    if (!threadId || !appUser?.id) return;

    const ok = window.confirm("Resolve this thread? It will be hidden from HQ and store inbox.");
    if (!ok) return;

    try {
      setResolving(true);

      const { error } = await (supabase as any)
        .from("hq_threads")
        .update({ status: "resolved" })
        .eq("id", threadId);

      if (error) throw error;

      navigate("/inbox");
    } catch (e) {
      console.error("Resolve thread error:", e);
      alert("Failed to resolve thread.");
    } finally {
      setResolving(false);
    }
  }

  async function sendReply() {
    if (!threadId || !appUser?.id) return;
    const body = reply.trim();
    if (!body) return;

    setSending(true);
    try {
      const { error: insErr } = await (supabase as any).from("hq_messages").insert({
        thread_id: threadId,
        sender_role: "hq",
        sender_user_id: appUser.id,
        body,
      });

      if (insErr) throw insErr;

      const { error: thrErr } = await (supabase as any)
        .from("hq_threads")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", threadId);

      if (thrErr) console.warn("Failed to update last_message_at:", thrErr);

      setReply("");
      await loadThread();
    } catch (e) {
      console.error("HQ reply error:", e);
      alert("Failed to send reply. Check console for details.");
    } finally {
      setSending(false);
    }
  }

  if (!appUser) {
    return <div className="p-6 text-sm text-muted-foreground">Please sign in.</div>;
  }

  const isResolved = (thread?.status || "").toLowerCase() === "resolved";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/inbox")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{thread?.subject || "Thread"}</h1>
              {thread?.status && <Badge variant="secondary">{thread.status}</Badge>}
              {thread && (
                <Badge variant="outline">
                  {storeNameById.get(thread.store_id) || thread.store_id}
                </Badge>
              )}
            </div>

            <p className="text-muted-foreground text-sm">
              Created: {formatDateTime(thread?.created_at)} · Last: {formatDateTime(thread?.last_message_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={loadThread}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={resolveThread}
            disabled={resolving || isResolved || !thread}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isResolved ? "Resolved" : resolving ? "Resolving…" : "Resolve"}
          </Button>
        </div>
      </div>

      <div className="dashboard-widget">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Conversation</h3>
        </div>

        <div className="p-4 space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

          {!loading && messages.length === 0 && (
            <div className="text-sm text-muted-foreground">No messages yet.</div>
          )}

          {!loading &&
            messages.map((m) => {
              const fromHQ = m.sender_role === "hq";
              return (
                <div
                  key={m.id}
                  className={[
                    "rounded-xl border p-3",
                    fromHQ ? "bg-muted/30" : "bg-white",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={fromHQ ? "secondary" : "default"}>
                        {fromHQ ? "HQ" : "Store"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDateTime(m.created_at)}</span>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {m.sender_role === "store" && (
                        <span>HQ read: {m.hq_read_at ? formatDateTime(m.hq_read_at) : "—"}</span>
                      )}
                      {m.sender_role === "hq" && (
                        <span>Store read: {m.store_read_at ? formatDateTime(m.store_read_at) : "—"}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="dashboard-widget">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Reply</h3>
        </div>

        <div className="p-4 space-y-3">
          {isResolved && (
            <div className="text-sm text-muted-foreground">
              This thread is resolved. Replies are disabled.
            </div>
          )}

          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={4}
            placeholder="Type your reply to the store…"
            disabled={isResolved}
          />

          <div className="flex justify-end">
            <Button
              className="gap-2"
              onClick={sendReply}
              disabled={sending || isResolved || !reply.trim()}
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending…" : "Send Reply"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
