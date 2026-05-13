import { useLiveQuery } from "dexie-react-hooks";
import { db, type NovelCollection } from "../db";
import { nanoid } from "nanoid";

export function useNovelCollections() {
  return useLiveQuery(() => db.novelCollections.orderBy("createdAt").reverse().toArray());
}

export function useNovelCollection(id: string | undefined) {
  return useLiveQuery(() => (id ? db.novelCollections.get(id) : undefined), [id]);
}

export async function createNovelCollection(name: string) {
  const collection: NovelCollection = {
    id: nanoid(),
    name,
    createdAt: new Date(),
  };
  await db.novelCollections.add(collection);
  return collection.id;
}

export async function updateNovelCollection(id: string, name: string) {
  return db.novelCollections.update(id, { name });
}

export async function deleteNovelCollection(id: string) {
  return db.novelCollections.delete(id);
}
