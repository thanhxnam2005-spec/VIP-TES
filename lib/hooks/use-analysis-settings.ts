"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type AnalysisSettings } from "@/lib/db";

const DEFAULT_SETTINGS: AnalysisSettings = {
  id: "default",
};

export function useAnalysisSettings() {
  const stored = useLiveQuery(() => db.analysisSettings.get("default"));
  return stored ?? DEFAULT_SETTINGS;
}

export async function updateAnalysisSettings(
  data: Partial<Omit<AnalysisSettings, "id">>,
) {
  const existing = await db.analysisSettings.get("default");
  if (existing) {
    await db.analysisSettings.update("default", data);
  } else {
    await db.analysisSettings.put({ ...DEFAULT_SETTINGS, ...data });
  }
}
