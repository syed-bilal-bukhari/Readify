import { STORE_META, getDb } from "./core";

export type ReadingDirection = "ltr" | "rtl";

const READING_DIRECTION_PREFIX = "readingDirection::";

export async function saveReadingDirection(
  pdfId: string,
  dir: ReadingDirection
): Promise<void> {
  const db = await getDb();
  await db.put(STORE_META, dir, `${READING_DIRECTION_PREFIX}${pdfId}`);
}

export async function readReadingDirection(
  pdfId: string
): Promise<ReadingDirection | null> {
  const db = await getDb();
  const value = await db.get(STORE_META, `${READING_DIRECTION_PREFIX}${pdfId}`);
  return (value as ReadingDirection | null) ?? null;
}
