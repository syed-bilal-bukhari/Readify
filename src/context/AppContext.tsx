import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  addPdfRecord,
  clearLastPdfId,
  findPdfRecordByPath,
  getPdfRecord,
  readLastPdfId,
  saveLastPdfId,
} from "../utils/pdfIndex";

type AppContextValue = {
  appName: string;
  selectedPdf: { url: string; name?: string; id?: string } | null;
  setSelectedPdfFromPath: (path: string, title?: string) => void;
  setSelectedPdfFromFile: (file: File) => Promise<void>;
  setSelectedPdfById: (id: string) => Promise<void>;
};

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

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedPdf, setSelectedPdf] = useState<{
    url: string;
    name?: string;
    id?: string;
  } | null>(null);

  const setSelectedPdfFromPath = (path: string, title?: string) => {
    const normalizedPath = normalizePath(path);
    const recordId = newRecordId();
    const record = {
      id: recordId,
      title: title ?? normalizedPath,
      path: normalizedPath,
    };
    void addPdfRecord(record).then(() => saveLastPdfId(recordId));
    setSelectedPdf({ url: normalizedPath, name: record.title, id: recordId });
  };

  const setSelectedPdfFromFile = async (file: File) => {
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
    const record = { id: recordId, title: file.name, path };
    await addPdfRecord(record);
    await saveLastPdfId(recordId);
    setSelectedPdf({ url: path, name: record.title, id: recordId });
  };

  const setSelectedPdfById = async (id: string) => {
    const record = await getPdfRecord(id);
    if (!record) return;
    if (typeof record.path === "string" && record.path.length > 0) {
      const normalizedPath = normalizePath(record.path);
      setSelectedPdf({
        url: normalizedPath,
        name: record.title,
        id: record.id,
      });
    } else {
      return;
    }
    await saveLastPdfId(record.id);
  };

  const value = useMemo<AppContextValue>(
    () => ({
      appName: "PDF Knowledge Explorer",
      selectedPdf,
      setSelectedPdfFromPath,
      setSelectedPdfFromFile,
      setSelectedPdfById,
    }),
    [selectedPdf]
  );

  useEffect(() => {
    const load = async () => {
      const lastId = await readLastPdfId();
      if (lastId) {
        const record = await getPdfRecord(lastId);
        if (record) {
          if (typeof record.path === "string" && record.path.length > 0) {
            const normalizedPath = normalizePath(record.path);
            try {
              const head = await fetch(normalizedPath, { method: "HEAD" });
              const contentType = head.headers.get("content-type") ?? "";
              if (!head.ok || !contentType.includes("pdf")) {
                await clearLastPdfId();
                setSelectedPdf(null);
                return;
              }
              setSelectedPdf({
                url: normalizedPath,
                name: record.title,
                id: record.id,
              });
            } catch {
              await clearLastPdfId();
              setSelectedPdf(null);
            }
          } else {
            return;
          }
        }
      }
    };
    void load();
  }, []);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }

  return context;
}
