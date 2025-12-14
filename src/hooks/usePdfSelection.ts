import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addPdfRecord,
  clearLastPdfId,
  findPdfRecordByPath,
  getPdfRecord,
  readLastPdfId,
  saveLastPdfId,
} from "../utils/db/pdfs";
import type { PdfRecord } from "../utils/db/types";

type SelectedPdf = { url: string; name?: string; id?: string } | null;

const newRecordId = () => `local-${Date.now()}`;

function normalizePath(path: string) {
  const sanitized = path.trim();
  if (!sanitized.startsWith("/")) {
    throw new Error("Path must start with '/' (e.g., /data/book.pdf)");
  }
  let decoded = sanitized;
  try {
    decoded = decodeURI(sanitized);
  } catch {
    decoded = sanitized;
  }
  return encodeURI(decoded);
}

async function resolveRecordPath(record: PdfRecord | undefined) {
  if (!record?.path) return null;
  const normalizedPath = normalizePath(record.path);
  try {
    const head = await fetch(normalizedPath, { method: "HEAD" });
    const contentType = head.headers.get("content-type") ?? "";
    if (!head.ok || !contentType.includes("pdf")) {
      return null;
    }
    return {
      url: normalizedPath,
      name: record.title,
      id: record.id,
    };
  } catch {
    return null;
  }
}

export function usePdfSelection() {
  const [selectedPdf, setSelectedPdf] = useState<SelectedPdf>(null);

  const setSelectedPdfFromPath = useCallback((path: string, title?: string) => {
    const normalizedPath = normalizePath(path);
    const recordId = newRecordId();
    const record: PdfRecord = {
      id: recordId,
      title: title ?? normalizedPath,
      path: normalizedPath,
    };
    void addPdfRecord(record).then(() => saveLastPdfId(recordId));
    setSelectedPdf({ url: normalizedPath, name: record.title, id: recordId });
  }, []);

  const setSelectedPdfFromFile = useCallback(async (file: File) => {
    const path = normalizePath(`/${file.name}`);
    const existing = await findPdfRecordByPath(path);
    if (existing) {
      setSelectedPdf({
        url: existing.path,
        name: existing.title,
        id: existing.id,
      });
      await saveLastPdfId(existing.id);
      return;
    }
    const recordId = newRecordId();
    const record: PdfRecord = { id: recordId, title: file.name, path };
    await addPdfRecord(record);
    await saveLastPdfId(recordId);
    setSelectedPdf({ url: path, name: record.title, id: recordId });
  }, []);

  const setSelectedPdfById = useCallback(async (id: string) => {
    const record = await getPdfRecord(id);
    if (!record) return;
    const resolved = await resolveRecordPath(record);
    if (!resolved) {
      await clearLastPdfId();
      setSelectedPdf(null);
      return;
    }
    setSelectedPdf(resolved);
    await saveLastPdfId(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      const lastId = await readLastPdfId();
      if (!lastId) return;
      const record = await getPdfRecord(lastId);
      if (!record) return;
      const resolved = await resolveRecordPath(record);
      if (!resolved) {
        await clearLastPdfId();
        setSelectedPdf(null);
        return;
      }
      setSelectedPdf(resolved);
    };
    void load();
  }, []);

  return useMemo(
    () => ({
      selectedPdf,
      setSelectedPdfFromPath,
      setSelectedPdfFromFile,
      setSelectedPdfById,
    }),
    [
      selectedPdf,
      setSelectedPdfFromFile,
      setSelectedPdfFromPath,
      setSelectedPdfById,
    ]
  );
}
