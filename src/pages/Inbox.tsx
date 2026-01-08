// src/pages/Inbox.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox as InboxIcon, Search, RefreshCw, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type DbHQThread = {
  id: string;
  store_id: string;
  subject: string;
  status: string | null; // e.g. 'open' | 'resolved'
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

export default function Inbox() {
  const navigate = useNavigate();
  const { appUser, stores } = useAuth();

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<DbHQThread[]>([]);
  const [messages, setMessages] = useState<DbHQMessage[]>([]);
  const [q, setQ] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const storeNameById = useMemo(() => {
    const map = new Map<string, string>();
    (stores || []).forEach((s: any) => map.set(s.id, `${s.code ?? ""} — ${s.name ?? ""}`.trim()));
    return map;
  }, [stores]);

  async function loadInbox() {
    setLoading(true);
    try {
      // Threads (ACTIVE only: hide resolved)
      const { data: threadRows, error: tErr } = await (supabase as any)
        .from("hq_threads")
        .select("id,store_id,subject,status,created_by_user_id,created_at,last_message_at")
        .or("status.is.null,status.neq.resolved") // ✅ keep null/open, hide resolved
        .order("last_message_at", { ascending: false });

      if (tErr) throw tErr;

      const th: DbHQThread[] = (threadRows || []).map((r: any) => ({
        id: r.id,
        store_id: r.store_id,
        subject: r.subject,
        status: r.status ?? null,
        created_by_user_id: r.created_by_user_id ?? null,
        created_at: r.created_at,
        last_message_at: r.last_message_at ?? null,
      }));

      setThreads(th);

      // Messages for unread calculations + previews
      const threadIds = th.map((x) => x.id);
      if (!threadIds.length) {
        setMessages([]);
        return;
      }

      const { data: msgRows, error: mErr } = await (supabase as any)
        .from("hq_messages")
        .select("id,thread_id,sender_role,sender_user_id,body,created_at,hq_read_at,store_read_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });

      if (mErr) throw mErr;

      setMessages((msgRows || []) as DbHQMessage[]);
    } catch (e) {
      console.error("Inbox load error:", e);
      setThreads([]);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function resolveThread(threadId: string) {
    if (!appUser?.id) {
      alert("Not logged in.");
      return;
    }

    const ok = window.confirm("Resolve this thread? It will be hidden from HQ and store inbox.");
    if (!ok) return;

    try {
      setResolvingId(threadId);

      const { error } = await (supabase as any)
        .from("hq_threads")
        .update({ status: "resolved" })
        .eq("id", threadId);

      if (error) throw error;

      await loadInbox();
    } catch (e) {
      console.error("Resolve thread error:", e);
      alert("Failed to resolve thread.");
    } finally {
      setResolvingId(null);
    }
  }

  useEffect(() => {
    // Only HQ should see this, but even if roles aren’t enforced in UI, table policies should.
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestMessageByThread = useMemo(() => {
    const map = new Map<string, DbHQMessage>();
    for (const m of messages) {
      if (!map.has(m.thread_id)) map.set(m.thread_id, m);
    }
    return map;
  }, [messages]);

  const unreadCountByThread = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of messages) {
      // unread for HQ = store sent AND hq_read_at is null
      if (m.sender_role === "store" && !m.hq_read_at) {
        map.set(m.thread_id, (map.get(m.thread_id) || 0) + 1);
      }
    }
    return map;
  }, [messages]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return threads;
    return threads.filter((t) => {
      const storeLabel = (storeNameById.get(t.store_id) || "").toLowerCase();
      return (
        (t.subject || "").toLowerCase().includes(term) ||
        storeLabel.includes(term) ||
        (t.status || "").toLowerCase().includes(term)
      );
    });
  }, [threads, q, storeNameById]);

  const totalUnread = useMemo(() => {
    let sum = 0;
    unreadCountByThread.forEach((v) => (sum += v));
    return sum;
  }, [unreadCountByThread]);

  if (!appUser) {
    return <div className="p-6 text-sm text-muted-foreground">Please sign in.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <InboxIcon className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Inbox</h1>
            <Badge variant="secondary">{loading ? "…" : `${totalUnread} unread`}</Badge>
          </div>
          <p className="text-muted-foreground">
            Messages from stores to HQ (threads per store).
          </p>
        </div>

        <Button variant="outline" className="gap-2" onClick={loadInbox}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative w-full max-w-xl">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by store / subject / status…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="dashboard-widget">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Threads</h3>
        </div>

        <div className="divide-y">
          {loading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}

          {!loading && filtered.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No open threads.</div>
          )}

          {!loading &&
            filtered.map((t) => {
              const unread = unreadCountByThread.get(t.id) || 0;
              const last = latestMessageByThread.get(t.id);
              const storeLabel = storeNameById.get(t.store_id) || t.store_id;

              return (
                <div
                  key={t.id}
                  className="w-full p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <button
                      onClick={() => navigate(`/inbox/${t.id}`)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium">{t.subject || "(No subject)"}</h4>

                        <Badge variant="outline">{storeLabel}</Badge>

                        {!!t.status && <Badge variant="secondary">{t.status}</Badge>}

                        {unread > 0 && (
                          <Badge className="bg-blue-600 text-white hover:bg-blue-600">
                            {unread} unread
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {last ? last.body : "No messages in this thread yet."}
                      </p>
                    </button>

                    <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                      <div className="text-right text-xs text-muted-foreground">
                        <div>Last: {formatDateTime(t.last_message_at || last?.created_at)}</div>
                        <div>Created: {formatDateTime(t.created_at)}</div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={resolvingId === t.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation(); // ✅ don't open thread
                          resolveThread(t.id);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {resolvingId === t.id ? "Resolving…" : "Resolve"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}