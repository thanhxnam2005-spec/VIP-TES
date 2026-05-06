"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  type NameFrequency,
  type NameFrequencyStatus,
} from "@/lib/db";
import type { DictPair } from "@/lib/workers/qt-engine.types";
import { COMPOUND_SURNAMES, SINGLE_SURNAMES } from "@/lib/workers/qt-engine.constants";

// ─── Reads ───────────────────────────────────────────────────

export function useNameFrequencies(
  novelId: string,
  status?: NameFrequencyStatus,
) {
  return useLiveQuery(
    () => {
      if (status) {
        return db.nameFrequency
          .where("[novelId+status]")
          .equals([novelId, status])
          .reverse()
          .sortBy("count");
      }
      return db.nameFrequency
        .where("novelId")
        .equals(novelId)
        .reverse()
        .sortBy("count");
    },
    [novelId, status],
  );
}

export function useNameFrequencyCount(novelId: string) {
  return useLiveQuery(
    () =>
      db.nameFrequency.where("novelId").equals(novelId).count(),
    [novelId],
  );
}

// ─── Surname type detection ─────────────────────────────────

function detectSurnameType(
  chinese: string,
): "compound" | "single" | "rare" {
  if (chinese.length >= 2 && COMPOUND_SURNAMES.has(chinese.slice(0, 2))) {
    return "compound";
  }
  if (SINGLE_SURNAMES.has(chinese[0])) {
    return "single";
  }
  return "rare";
}

/** Auto-promotion threshold based on surname type */
export function getPromotionThreshold(
  surnameType: "compound" | "single" | "rare",
): number {
  switch (surnameType) {
    case "compound":
      return 4;
    case "single":
      return 4;
    case "rare":
      return 8;
  }
}

// ─── Mutations ──────────────────────────────────────────────

/**
 * Update name frequency data after a conversion.
 * Upserts: if [novelId+chinese] exists, increment count and add chapterId.
 * If new, create with count from detectedNames.
 */
export async function updateNameFrequency(
  novelId: string,
  chapterId: string,
  detectedNames: DictPair[],
): Promise<void> {
  if (!detectedNames.length) return;

  const now = new Date();

  await db.transaction("rw", db.nameFrequency, async () => {
    // Batch fetch all existing entries for these names
    const chineseNames = detectedNames.map((n) => n.chinese);
    const existing = await db.nameFrequency
      .where("[novelId+chinese]")
      .anyOf(chineseNames.map((c) => [novelId, c]))
      .toArray();
    const existingMap = new Map(existing.map((e) => [e.chinese, e]));

    const toUpdate: Array<{ id: string; changes: Partial<NameFrequency> }> = [];
    const toAdd: NameFrequency[] = [];

    for (const name of detectedNames) {
      const entry = existingMap.get(name.chinese);
      if (entry) {
        const chapters = entry.chapters.includes(chapterId)
          ? entry.chapters
          : [...entry.chapters, chapterId];
        toUpdate.push({
          id: entry.id,
          changes: { count: entry.count + 1, chapters, updatedAt: now },
        });
      } else {
        toAdd.push({
          id: crypto.randomUUID(),
          novelId,
          chinese: name.chinese,
          reading: name.vietnamese,
          count: 1,
          chapters: [chapterId],
          surnameType: detectSurnameType(name.chinese),
          status: "pending",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Batch write
    for (const { id, changes } of toUpdate) {
      await db.nameFrequency.update(id, changes);
    }
    if (toAdd.length) {
      await db.nameFrequency.bulkAdd(toAdd);
    }
  });
}

/**
 * Approve a detected name — creates a NameEntry and updates status.
 */
export async function approveNameFrequency(
  id: string,
  novelId: string,
): Promise<void> {
  const entry = await db.nameFrequency.get(id);
  if (!entry) return;

  const now = new Date();

  // Create NameEntry
  await db.nameEntries.add({
    id: crypto.randomUUID(),
    scope: novelId,
    chinese: entry.chinese,
    vietnamese: entry.reading,
    category: "nhân vật",
    createdAt: now,
    updatedAt: now,
  });

  // Update status
  await db.nameFrequency.update(id, {
    status: "approved",
    updatedAt: now,
  });
}

/**
 * Reject a detected name — creates an ExcludedName and updates status.
 */
export async function rejectNameFrequency(id: string): Promise<void> {
  const entry = await db.nameFrequency.get(id);
  if (!entry) return;

  const now = new Date();

  // Create ExcludedName
  await db.excludedNames.add({
    id: crypto.randomUUID(),
    scope: entry.novelId,
    chinese: entry.chinese,
    createdAt: now,
    updatedAt: now,
  });

  await db.nameFrequency.update(id, {
    status: "rejected",
    updatedAt: now,
  });
}

export async function bulkApprove(
  ids: string[],
  novelId: string,
): Promise<void> {
  await db.transaction(
    "rw",
    [db.nameFrequency, db.nameEntries],
    async () => {
      for (const id of ids) {
        await approveNameFrequency(id, novelId);
      }
    },
  );
}

export async function bulkReject(ids: string[]): Promise<void> {
  await db.transaction(
    "rw",
    [db.nameFrequency, db.excludedNames],
    async () => {
      for (const id of ids) {
        await rejectNameFrequency(id);
      }
    },
  );
}

export async function resetNameFrequencies(
  novelId: string,
): Promise<void> {
  await db.nameFrequency.where("novelId").equals(novelId).delete();
}
