import { openDB, type IDBPDatabase } from "idb";

export type PdfRecord = {
  id: string;
  title: string;
  path: string;
};

const DB_NAME = "pdfIndexDb";
const DB_VERSION = 2;
const STORE_PDFS = "pdfs";
const STORE_META = "meta";
const STORE_HIGHLIGHTS = "highlights";
const LAST_PDF_KEY = "lastPdfId";
type PdfDb = IDBPDatabase<unknown>;

export type HighlightRecord = {
  id: string;
  pdfId: string;
  page: number;
  top: number;
  left: number;
  width: number;
  height: number;
  createdAt: number;
};

async function getDb(): Promise<PdfDb> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_PDFS)) {
        db.createObjectStore(STORE_PDFS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
      if (!db.objectStoreNames.contains(STORE_HIGHLIGHTS)) {
        const store = db.createObjectStore(STORE_HIGHLIGHTS, { keyPath: "id" });
        store.createIndex("pdfId", "pdfId", { unique: false });
      }
    },
  });
}

async function seedIfEmpty(db: PdfDb) {
  const tx = db.transaction(STORE_PDFS, "readonly");
  const count = await tx.store.count();
  if (count === 0) return;
}

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

export type PdfIndexBackup = {
  pdfs: PdfRecord[];
  lastPdfId: string | null;
  highlights: HighlightRecord[];
};

export async function exportPdfIndex(): Promise<PdfIndexBackup> {
  const db = await getDb();
  await seedIfEmpty(db);
  const pdfs = ((await db.getAll(STORE_PDFS)) as PdfRecord[]).map(
    ({ blob, ...rest }) => rest
  );
  const lastPdfId =
    ((await db.get(STORE_META, LAST_PDF_KEY)) as string | null) ?? null;
  const highlights =
    ((await db.getAll(STORE_HIGHLIGHTS)) as HighlightRecord[]) ?? [];
  return { pdfs, lastPdfId, highlights };
}

export async function importPdfIndex(data: PdfIndexBackup): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    [STORE_PDFS, STORE_META, STORE_HIGHLIGHTS],
    "readwrite"
  );
  await tx.objectStore(STORE_PDFS).clear();
  await tx.objectStore(STORE_HIGHLIGHTS).clear();
  for (const record of data.pdfs) {
    await tx.objectStore(STORE_PDFS).put(record);
  }
  for (const record of data.highlights ?? []) {
    await tx.objectStore(STORE_HIGHLIGHTS).put(record);
  }
  if (data.lastPdfId) {
    await tx.objectStore(STORE_META).put(data.lastPdfId, LAST_PDF_KEY);
  } else {
    await tx.objectStore(STORE_META).delete(LAST_PDF_KEY);
  }
  await tx.done;
}
