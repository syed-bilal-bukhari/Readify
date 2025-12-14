import { STORE_HIGHLIGHTS, getDb } from "./core";
import type { HighlightRecord } from "./types";

export async function addHighlightRecord(
  record: HighlightRecord
): Promise<void> {
  const db = await getDb();
  await db.put(STORE_HIGHLIGHTS, record);
}

export async function getHighlightsByPdf(
  pdfId: string
): Promise<HighlightRecord[]> {
  const db = await getDb();
  const tx = db.transaction(STORE_HIGHLIGHTS, "readonly");
  const index = tx.store.index("pdfId");
  const results = await index.getAll(pdfId);
  return results as HighlightRecord[];
}

export async function clearHighlightsForPdf(pdfId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_HIGHLIGHTS, "readwrite");
  const index = tx.store.index("pdfId");
  const keys = await index.getAllKeys(pdfId);
  for (const key of keys) {
    await tx.store.delete(key);
  }
  await tx.done;
}

export async function getHighlightsByTopic(
  topicId: string
): Promise<HighlightRecord[]> {
  const db = await getDb();
  const all = (await db.getAll(STORE_HIGHLIGHTS)) as HighlightRecord[];
  return all.filter((hl) => hl.topicIds?.includes(topicId));
}
