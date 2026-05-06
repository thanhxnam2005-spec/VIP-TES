"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Note } from "@/lib/db";

export function useNotes(novelId: string | undefined) {
  const notes = useLiveQuery(
    () =>
      novelId
        ? db.notes.where("novelId").equals(novelId).sortBy("createdAt")
        : [],
    [novelId]
  );
  return notes;
}

export function useNotesByCategory(
  novelId: string | undefined,
  category: string
) {
  const notes = useLiveQuery(
    () =>
      novelId
        ? db.notes
            .where(["novelId", "category"])
            .equals([novelId, category])
            .toArray()
        : [],
    [novelId, category]
  );
  return notes;
}

export function useNote(id: string | undefined) {
  const note = useLiveQuery(
    () => (id ? db.notes.get(id) : undefined),
    [id]
  );
  return note;
}

export async function createNote(
  data: Omit<Note, "id" | "createdAt" | "updatedAt">
) {
  const now = new Date();
  const id = crypto.randomUUID();
  await db.notes.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateNote(
  id: string,
  data: Partial<Omit<Note, "id" | "createdAt">>
) {
  await db.notes.update(id, { ...data, updatedAt: new Date() });
}

export async function deleteNote(id: string) {
  await db.notes.delete(id);
}
