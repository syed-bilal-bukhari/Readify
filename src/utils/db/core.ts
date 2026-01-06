import { openDB, type IDBPDatabase } from "idb";

export type PdfDb = IDBPDatabase<unknown>;

export const DB_NAME = "pdfIndexDb";
export const DB_VERSION = 4;

export const STORE_PDFS = "pdfs";
export const STORE_META = "meta";
export const STORE_HIGHLIGHTS = "highlights";
export const STORE_TOPICS = "topics";
export const STORE_BOOKMARKS = "bookmarks";

export const LAST_PDF_KEY = "lastPdfId";

export async function getDb(): Promise<PdfDb> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_PDFS)) {
        db.createObjectStore(STORE_PDFS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
      if (!db.objectStoreNames.contains(STORE_HIGHLIGHTS)) {
        const store = db.createObjectStore(STORE_HIGHLIGHTS, {
          keyPath: "id",
        });
        store.createIndex("pdfId", "pdfId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_TOPICS)) {
        db.createObjectStore(STORE_TOPICS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_BOOKMARKS)) {
        const store = db.createObjectStore(STORE_BOOKMARKS, {
          keyPath: "id",
        });
        store.createIndex("pdfId", "pdfId", { unique: false });
      }
    },
  });
}

export async function seedIfEmpty(db: PdfDb) {
  const tx = db.transaction(STORE_PDFS, "readonly");
  const count = await tx.store.count();
  if (count === 0) return;
}
