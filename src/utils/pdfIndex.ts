import { openDB, type IDBPDatabase } from "idb";

export type PdfRecord = {
  id: string;
  title: string;
  path: string;
};

export type HighlightRecord = {
  id: string;
  pdfId: string;
  page: number;
  top: number;
  left: number;
  width: number;
  height: number;
  topicIds: string[];
  book?: string;
  volume?: string;
  chapter?: string;
  tags?: string[];
  createdAt: number;
};

export type TopicRecord = {
  id: string;
  name: string;
  parentId: string | null;
};

export type TopicGraphNode = {
  id: string;
  name: string;
  parentId: string | null;
};

export type TopicGraphEdge = {
  id: string;
  source: string;
  target: string;
};

const DB_NAME = "pdfIndexDb";
const DB_VERSION = 3;
const STORE_PDFS = "pdfs";
const STORE_META = "meta";
const STORE_HIGHLIGHTS = "highlights";
const STORE_TOPICS = "topics";
const LAST_PDF_KEY = "lastPdfId";
type PdfDb = IDBPDatabase<unknown>;

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
      if (!db.objectStoreNames.contains(STORE_TOPICS)) {
        db.createObjectStore(STORE_TOPICS, { keyPath: "id" });
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

export async function getHighlightsByTopic(
  topicId: string
): Promise<HighlightRecord[]> {
  const db = await getDb();
  const all = (await db.getAll(STORE_HIGHLIGHTS)) as HighlightRecord[];
  return all.filter((hl) => hl.topicIds?.includes(topicId));
}

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

export type PdfIndexBackup = {
  pdfs: PdfRecord[];
  lastPdfId: string | null;
  highlights: HighlightRecord[];
  topics: TopicRecord[];
};

export async function exportPdfIndex(): Promise<PdfIndexBackup> {
  const db = await getDb();
  await seedIfEmpty(db);
  const pdfs = (await db.getAll(STORE_PDFS)) as PdfRecord[];
  const lastPdfId =
    ((await db.get(STORE_META, LAST_PDF_KEY)) as string | null) ?? null;
  const highlights =
    ((await db.getAll(STORE_HIGHLIGHTS)) as HighlightRecord[]) ?? [];
  const topics = ((await db.getAll(STORE_TOPICS)) as TopicRecord[]) ?? [];
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

export function buildTopicGraph(topics: TopicRecord[]): {
  nodes: TopicGraphNode[];
  edges: TopicGraphEdge[];
} {
  const nodes = topics.map(({ id, name, parentId }) => ({
    id,
    name,
    parentId,
  }));
  const edges = topics
    .filter((topic) => topic.parentId)
    .map((topic) => ({
      id: `edge-${topic.id}`,
      source: topic.parentId as string,
      target: topic.id,
    }));
  return { nodes, edges };
}

export function buildTopicPath(
  topics: TopicRecord[],
  topicId: string
): TopicRecord[] {
  const map = new Map(topics.map((t) => [t.id, t]));
  const path: TopicRecord[] = [];
  let current: TopicRecord | undefined = map.get(topicId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? map.get(current.parentId) : undefined;
  }
  return path;
}

export function formatTopicPath(path: TopicRecord[]): string {
  return path.map((t) => t.name).join(" > ");
}
