"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type ChatSettings } from "@/lib/db";

const DEFAULT_SETTINGS: ChatSettings = {
  id: "default",
  providerId: "",
  modelId: "",
  systemPrompt:
    "You are a helpful writing assistant for Novel Studio, a creative writing workspace. Be concise and helpful.",
  temperature: 0.7,
};

export function useChatSettings() {
  const stored = useLiveQuery(() => db.chatSettings.get("default"));
  return stored ?? DEFAULT_SETTINGS;
}

export async function updateChatSettings(
  data: Partial<Omit<ChatSettings, "id">>,
) {
  const existing = await db.chatSettings.get("default");
  if (existing) {
    await db.chatSettings.update("default", data);
  } else {
    await db.chatSettings.put({ ...DEFAULT_SETTINGS, ...data });
  }
}
