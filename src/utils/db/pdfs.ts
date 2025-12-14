import {
  LAST_PDF_KEY,
  STORE_META,
  STORE_PDFS,
  getDb,
  seedIfEmpty,
} from "./core";
import type { PdfRecord } from "./types";

export async function getPdfIndex(): Promise<PdfRecord[]> {
  const db = await getDb();
  await seedIfEmpty(db);
  return db.getAll(STORE_PDFS) as Promise<PdfRecord[]>;
}

export async function getPdfRecord(id: string): Promise<PdfRecord | undefined> {
  const db = await getDb();
  await seedIfEmpty(db);
  return (await db.get(STORE_PDFS, id)) as PdfRecord | undefined;
}

export async function addPdfRecord(record: PdfRecord): Promise<void> {
  const db = await getDb();
  await db.put(STORE_PDFS, record);
}

export async function removePdfRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_PDFS, id);
}

export async function saveLastPdfId(id: string): Promise<void> {
  const db = await getDb();
  await db.put(STORE_META, id, LAST_PDF_KEY);
}

export async function readLastPdfId(): Promise<string | null> {
  const db = await getDb();
  const value = await db.get(STORE_META, LAST_PDF_KEY);
  return (value as string | null) ?? null;
}

export async function clearLastPdfId(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_META, LAST_PDF_KEY);
}

export async function findPdfRecordByPath(
  path: string
): Promise<PdfRecord | undefined> {
  const db = await getDb();
  await seedIfEmpty(db);
  const all = (await db.getAll(STORE_PDFS)) as PdfRecord[];
  return all.find((record) => record.path === path);
}
