"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type TTSSettings } from "@/lib/db";

const DEFAULT_SETTINGS: TTSSettings = {
  id: "default",
  providerId: "GoogleCloudTTS",
  voiceId: "0",
  rate: 1.0,
  pitch: 1.0,
  highlightColor: "#dbeafe",
  fluencyAdjust: 1.0,
  providerApiKeys: {},
};

export function useTTSSettings() {
  const stored = useLiveQuery(() => db.ttsSettings.get("default"));
  return stored ?? DEFAULT_SETTINGS;
}

export async function updateTTSSettings(
  data: Partial<Omit<TTSSettings, "id">>,
) {
  const existing = await db.ttsSettings.get("default");
  if (existing) {
    await db.ttsSettings.update("default", data);
  } else {
    await db.ttsSettings.put({ ...DEFAULT_SETTINGS, ...data });
  }
}
