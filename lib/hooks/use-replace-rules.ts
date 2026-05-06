"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type ReplaceRule } from "@/lib/db";
import type { ReplaceRule as EngineReplaceRule } from "@/lib/replace-engine";

// ─── Reads ───────────────────────────────────────────────────

/** Get enabled replace rules for global + optional novelId scope, sorted by order */
export function useReplaceRules(novelId?: string) {
  return useLiveQuery(async () => {
    const global = await db.replaceRules
      .where("scope")
      .equals("global")
      .toArray();
    const novel = novelId
      ? await db.replaceRules.where("scope").equals(novelId).toArray()
      : [];
    const merged = new Map<string, ReplaceRule>();
    for (const r of global) merged.set(r.pattern, r);
    for (const r of novel) merged.set(r.pattern, r); // novel overrides
    return Array.from(merged.values())
      .filter((r) => r.enabled)
      .sort((a, b) => a.order - b.order);
  }, [novelId]);
}

/** Get ALL replace rules (enabled + disabled) for a single scope, for management UI */
export function useAllReplaceRules(scope: string) {
  return useLiveQuery(
    () => db.replaceRules.where("scope").equals(scope).sortBy("order"),
    [scope],
  );
}

/** Get merged replace rules (global + novel, novel overrides by pattern) — non-hook */
export async function getMergedReplaceRules(
  novelId?: string,
): Promise<ReplaceRule[]> {
  const globalRules = await db.replaceRules
    .where("scope")
    .equals("global")
    .toArray();
  const novelRules = novelId
    ? await db.replaceRules.where("scope").equals(novelId).toArray()
    : [];
  const merged = new Map<string, ReplaceRule>();
  for (const r of globalRules) merged.set(r.pattern, r);
  for (const r of novelRules) merged.set(r.pattern, r);
  return Array.from(merged.values())
    .filter((r) => r.enabled)
    .sort((a, b) => a.order - b.order);
}

// ─── Mutations ───────────────────────────────────────────────

export async function createReplaceRule(
  data: Omit<ReplaceRule, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = new Date();
  const id = crypto.randomUUID();
  await db.replaceRules.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateReplaceRule(
  id: string,
  data: Partial<Omit<ReplaceRule, "id" | "createdAt">>,
): Promise<void> {
  await db.replaceRules.update(id, { ...data, updatedAt: new Date() });
}

export async function deleteReplaceRule(id: string): Promise<void> {
  await db.replaceRules.delete(id);
}

// ─── Utilities ──────────────────────────────────────────────

/** Convert a DB ReplaceRule to the lightweight engine format */
export function toEngineRule(r: ReplaceRule): EngineReplaceRule {
  return {
    pattern: r.pattern,
    replacement: r.replacement,
    isRegex: r.isRegex,
    caseSensitive: r.caseSensitive,
  };
}
