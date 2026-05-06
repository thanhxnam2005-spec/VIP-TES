"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Scene } from "@/lib/db";

export function useScenes(chapterId: string | undefined) {
  const scenes = useLiveQuery(
    () =>
      chapterId
        ? db.scenes
            .where("[chapterId+isActive]")
            .equals([chapterId, 1])
            .sortBy("order")
        : [],
    [chapterId],
  );
  return scenes;
}

/** Reactive query: all original (version 1, manual) versions for a chapter's scenes. */
export function useOriginalScenes(chapterId: string | undefined) {
  const originalScenes = useLiveQuery(
    async () => {
      if (!chapterId) return [];
      // 1. Get all active scenes for this chapter to know the orders
      const activeScenes = await db.scenes
        .where("[chapterId+isActive]")
        .equals([chapterId, 1])
        .sortBy("order");

      if (activeScenes.length === 0) return [];

      // 2. For each active scene, find its version 1 (manual)
      const results = await Promise.all(
        activeScenes.map(async (active) => {
          const original = await db.scenes
            .where("activeSceneId")
            .equals(active.id)
            .filter((s) => s.version === 1 && s.versionType === "manual")
            .first();
          
          // If no version 1 found, it means the active content is still the original
          return original || active;
        })
      );
      return results;
    },
    [chapterId],
  );
  return originalScenes;
}

export function useNovelScenes(novelId: string | undefined) {
  const scenes = useLiveQuery(
    () =>
      novelId
        ? db.scenes
            .where("[novelId+isActive]")
            .equals([novelId, 1])
            .sortBy("order")
        : [],
    [novelId],
  );
  return scenes;
}

export function useScene(id: string | undefined) {
  const scene = useLiveQuery(
    () => (id ? db.scenes.get(id) : undefined),
    [id],
  );
  return scene;
}

export function useNovelWordCount(novelId: string | undefined) {
  const wordCount = useLiveQuery(
    async () => {
      if (!novelId) return 0;
      const scenes = await db.scenes
        .where("[novelId+isActive]")
        .equals([novelId, 1])
        .toArray();
      return scenes.reduce((sum, s) => sum + s.wordCount, 0);
    },
    [novelId],
  );
  return wordCount ?? 0;
}

export async function createScene(
  data: Omit<Scene, "id" | "wordCount" | "createdAt" | "updatedAt" | "version" | "versionType" | "isActive" | "activeSceneId">,
) {
  const now = new Date();
  const id = crypto.randomUUID();
  const wordCount = data.content.split(/\s+/).filter(Boolean).length;
  await db.scenes.add({
    ...data,
    id,
    wordCount,
    version: 0,
    versionType: "manual",
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateScene(
  id: string,
  data: Partial<Omit<Scene, "id" | "createdAt">>,
) {
  const updates: Partial<Scene> = { ...data, updatedAt: new Date() };
  if (data.content !== undefined) {
    updates.wordCount = data.content.split(/\s+/).filter(Boolean).length;
  }
  await db.scenes.update(id, updates);
}

export async function deleteScene(id: string) {
  await db.transaction("rw", db.scenes, async () => {
    // Delete all inactive versions pointing to this scene
    await db.scenes.where("activeSceneId").equals(id).delete();
    await db.scenes.delete(id);
  });
}

export async function reorderScenes(
  scenes: { id: string; order: number }[],
) {
  await db.transaction("rw", db.scenes, async () => {
    for (const { id, order } of scenes) {
      await db.scenes.update(id, { order, updatedAt: new Date() });
    }
  });
}
