import { STORE_TOPICS, getDb } from "./core";
import type { TopicRecord } from "./types";

export async function getTopics(): Promise<TopicRecord[]> {
  const db = await getDb();
  return (await db.getAll(STORE_TOPICS)) as TopicRecord[];
}

export async function addTopic(record: TopicRecord): Promise<void> {
  const db = await getDb();
  await db.put(STORE_TOPICS, record);
}

export async function renameTopic(id: string, name: string): Promise<void> {
  const db = await getDb();
  const existing = (await db.get(STORE_TOPICS, id)) as TopicRecord | undefined;
  if (!existing) return;
  await db.put(STORE_TOPICS, { ...existing, name });
}

export async function moveTopic(
  id: string,
  newParentId: string | null
): Promise<void> {
  const db = await getDb();
  const existing = (await db.get(STORE_TOPICS, id)) as TopicRecord | undefined;
  if (!existing) return;
  const topics = (await db.getAll(STORE_TOPICS)) as TopicRecord[];
  const isDescendant = (targetId: string | null, searchId: string): boolean => {
    if (!targetId) return false;
    if (targetId === searchId) return true;
    const parent = topics.find((t) => t.id === targetId);
    return parent ? isDescendant(parent.parentId, searchId) : false;
  };
  if (newParentId && isDescendant(newParentId, id)) {
    throw new Error("Cannot move topic under its descendant");
  }
  await db.put(STORE_TOPICS, { ...existing, parentId: newParentId });
}
