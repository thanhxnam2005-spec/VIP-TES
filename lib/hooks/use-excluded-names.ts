"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type ExcludedName } from "@/lib/db";

const EMPTY_LIST: string[] = [];

// ─── Shared Query ────────────────────────────────────────────

/** Fetch merged excluded names (global + novel, novel overrides) */
async function fetchMergedExcludedNames(
  novelId?: string,
): Promise<ExcludedName[]> {
  const global = await db.excludedNames
    .where("scope")
    .equals("global")
    .toArray();
  const novel = novelId
    ? await db.excludedNames.where("scope").equals(novelId).toArray()
    : [];
  const merged = new Map<string, ExcludedName>();
  for (const e of global) merged.set(e.chinese, e);
  for (const e of novel) merged.set(e.chinese, e);
  return Array.from(merged.values());
}

// ─── Reads ───────────────────────────────────────────────────

/** Get all excluded names for global + optional novelId scope */
export function useExcludedNames(novelId?: string) {
  return useLiveQuery(() => fetchMergedExcludedNames(novelId), [novelId]);
}

/** Get excluded names as a flat string[] of chinese names (for QT engine filtering) */
export function useExcludedNamesList(novelId?: string): string[] {
  return (
    useLiveQuery(
      async () =>
        (await fetchMergedExcludedNames(novelId)).map((e) => e.chinese),
      [novelId],
    ) ?? EMPTY_LIST
  );
}

// ─── Mutations ───────────────────────────────────────────────

export async function createExcludedName(
  data: Omit<ExcludedName, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = new Date();
  const id = crypto.randomUUID();
  await db.excludedNames.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}

export async function deleteExcludedName(id: string): Promise<void> {
  await db.excludedNames.delete(id);
}
