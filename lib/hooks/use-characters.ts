"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Character } from "@/lib/db";

export function useCharacters(novelId: string | undefined) {
  const characters = useLiveQuery(
    () =>
      novelId ? db.characters.where("novelId").equals(novelId).toArray() : [],
    [novelId],
  );
  const charList =
    characters?.map((c) => {
      let roleKey = 99;
      if (c.role?.trim().toLocaleLowerCase() == "nhân vật chính") roleKey = 0;
      else if (c.role?.toLocaleLowerCase().includes("nhân vật chính"))
        roleKey = 1;
      else if (
        c.role?.toLocaleLowerCase().includes("người tình") ||
        c.role?.toLocaleLowerCase().includes("người yêu")
      )
        roleKey = 2;
      else if (c.role?.toLocaleLowerCase().includes("nhân vật phụ"))
        roleKey = 3;
      else if (c.role?.toLocaleLowerCase().includes("phản diện")) roleKey = 10;
      return { ...c, roleKey };
    }) ?? [];
  return charList.sort((a, b) => {
    return a.roleKey - b.roleKey;
  });
}

export function useCharacter(id: string | undefined) {
  const character = useLiveQuery(
    () => (id ? db.characters.get(id) : undefined),
    [id],
  );
  return character;
}

export async function createCharacter(
  data: Omit<Character, "id" | "createdAt" | "updatedAt">,
) {
  const now = new Date();
  const id = crypto.randomUUID();
  await db.characters.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
}

export async function updateCharacter(
  id: string,
  data: Partial<Omit<Character, "id" | "createdAt">>,
) {
  await db.characters.update(id, { ...data, updatedAt: new Date() });
}

export async function deleteCharacter(id: string) {
  await db.characters.delete(id);
}
