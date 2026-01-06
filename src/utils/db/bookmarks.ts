import { STORE_BOOKMARKS, getDb } from "./core";
import type { BookmarkRecord } from "./types";

export async function addBookmark(record: BookmarkRecord): Promise<void> {
  const db = await getDb();
  await db.put(STORE_BOOKMARKS, record);
}

export async function getBookmarksByPdf(
  pdfId: string
): Promise<BookmarkRecord[]> {
  const db = await getDb();
  const tx = db.transaction(STORE_BOOKMARKS, "readonly");
  const index = tx.store.index("pdfId");
  const results = await index.getAll(pdfId);
  return results as BookmarkRecord[];
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_BOOKMARKS, "readwrite");
  await tx.store.delete(id);
  await tx.done;
}
