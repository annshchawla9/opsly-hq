// src/services/hqMessages.ts
import { supabase } from "@/integrations/supabase/client";

export type CreateMessageInput = {
  title: string;
  body: string;
  senderUserId: string;   // public.users.id (NOT auth.user.id)
  isAnnouncement: boolean;
  requiresAck: boolean;
  storeIds: string[];     // target store UUIDs
};

export type CreateMessageResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

const sb = supabase as any; // ✅ bypass until you regenerate Supabase types

function friendlyError(e: unknown) {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return "Unknown error"; }
}

export async function sendMessageToStores(
  input: CreateMessageInput
): Promise<CreateMessageResult> {
  const title = input.title?.trim();
  const body = input.body?.trim();

  if (!title) return { ok: false, error: "Title is required." };
  if (!body) return { ok: false, error: "Message body is required." };
  if (!input.senderUserId) return { ok: false, error: "Missing senderUserId." };
  if (!input.storeIds?.length) return { ok: false, error: "Select at least one store." };

  try {
    // 1) Insert message
    const { data: msgRow, error: msgErr } = await sb
      .from("messages")
      .insert({
        title,
        body,
        sender_user_id: input.senderUserId,
        is_announcement: input.isAnnouncement,
        requires_ack: input.requiresAck,
      })
      .select("id")
      .single();

    if (msgErr) throw msgErr;

    const messageId = msgRow.id as string;

    // 2) Insert targets
    const targetsPayload = input.storeIds.map((storeId) => ({
      message_id: messageId,
      store_id: storeId,
    }));

    const { error: targetsErr } = await sb
      .from("message_targets")
      .insert(targetsPayload);

    if (targetsErr) throw targetsErr;

    return { ok: true, messageId };
  } catch (e) {
    console.error("sendMessageToStores error:", e);
    return { ok: false, error: friendlyError(e) };
  }
}