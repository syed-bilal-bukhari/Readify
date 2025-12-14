import {
  LAST_PDF_KEY,
  STORE_HIGHLIGHTS,
  STORE_META,
  STORE_PDFS,
  STORE_TOPICS,
  getDb,
  seedIfEmpty,
} from "./core";
import type { PdfIndexBackup } from "./types";

export async function exportPdfIndex(): Promise<PdfIndexBackup> {
  const db = await getDb();
  await seedIfEmpty(db);
  const pdfs = (await db.getAll(STORE_PDFS)) ?? [];
  const lastPdfId =
    ((await db.get(STORE_META, LAST_PDF_KEY)) as string | null) ?? null;
  const highlights = ((await db.getAll(STORE_HIGHLIGHTS)) ??
    []) as PdfIndexBackup["highlights"];
  const topics = ((await db.getAll(STORE_TOPICS)) ??
    []) as PdfIndexBackup["topics"];
  return { pdfs, lastPdfId, highlights, topics };
}

export async function importPdfIndex(data: PdfIndexBackup): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    [STORE_PDFS, STORE_META, STORE_HIGHLIGHTS, STORE_TOPICS],
    "readwrite"
  );
  await tx.objectStore(STORE_PDFS).clear();
  await tx.objectStore(STORE_HIGHLIGHTS).clear();
  await tx.objectStore(STORE_TOPICS).clear();
  for (const record of data.pdfs) {
    await tx.objectStore(STORE_PDFS).put(record);
  }
  for (const record of data.highlights ?? []) {
    await tx.objectStore(STORE_HIGHLIGHTS).put(record);
  }
  for (const record of data.topics ?? []) {
    await tx.objectStore(STORE_TOPICS).put(record);
  }
  if (data.lastPdfId) {
    await tx.objectStore(STORE_META).put(data.lastPdfId, LAST_PDF_KEY);
  } else {
    await tx.objectStore(STORE_META).delete(LAST_PDF_KEY);
  }
  await tx.done;
}
