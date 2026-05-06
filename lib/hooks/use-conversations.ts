"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Conversation, type ConversationMessage } from "@/lib/db";

// ─── Conversation Queries ───────────────────────────────────

export function useConversations() {
  return useLiveQuery(() =>
    db.conversations.orderBy("updatedAt").reverse().toArray()
  );
}

export function useConversation(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.conversations.get(id) : undefined),
    [id]
  );
}

export function useConversationMessages(conversationId: string | undefined) {
  return useLiveQuery(
    () =>
      conversationId
        ? db.conversationMessages
            .where("conversationId")
            .equals(conversationId)
            .sortBy("createdAt")
        : [],
    [conversationId]
  );
}

// ─── Conversation Mutations ─────────────────────────────────

export async function createConversation(
  data: Omit<Conversation, "id" | "createdAt" | "updatedAt">
) {
  const now = new Date();
  const id = crypto.randomUUID();
  await db.conversations.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateConversation(
  id: string,
  data: Partial<Omit<Conversation, "id" | "createdAt">>
) {
  await db.conversations.update(id, { ...data, updatedAt: new Date() });
}

export async function deleteConversation(id: string) {
  await db.transaction(
    "rw",
    [db.conversations, db.conversationMessages],
    async () => {
      await db.conversationMessages
        .where("conversationId")
        .equals(id)
        .delete();
      await db.conversations.delete(id);
    }
  );
}

// ─── Message Mutations ──────────────────────────────────────

export async function addMessage(
  data: Omit<ConversationMessage, "id" | "createdAt">
) {
  const id = crypto.randomUUID();
  const now = new Date();
  await db.transaction(
    "rw",
    [db.conversationMessages, db.conversations],
    async () => {
      await db.conversationMessages.add({ ...data, id, createdAt: now });
      await db.conversations.update(data.conversationId, {
        updatedAt: now,
      });
    }
  );
  return id;
}

export async function updateMessage(
  id: string,
  data: Partial<Omit<ConversationMessage, "id" | "createdAt">>
) {
  await db.conversationMessages.update(id, data);
}

/** Delete a message and all messages after it in the same conversation. */
export async function deleteMessagesFrom(
  conversationId: string,
  messageId: string,
) {
  const messages = await db.conversationMessages
    .where("conversationId")
    .equals(conversationId)
    .sortBy("createdAt");

  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx === -1) return;

  const idsToDelete = messages.slice(idx).map((m) => m.id);
  await db.conversationMessages.bulkDelete(idsToDelete);
}
