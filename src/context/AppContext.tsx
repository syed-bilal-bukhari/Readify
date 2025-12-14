import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { usePdfSelection } from "../hooks/usePdfSelection";

type AppContextValue = {
  appName: string;
  selectedPdf: { url: string; name?: string; id?: string } | null;
  setSelectedPdfFromPath: (path: string, title?: string) => void;
  setSelectedPdfFromFile: (file: File) => Promise<void>;
  setSelectedPdfById: (id: string) => Promise<void>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const {
    selectedPdf,
    setSelectedPdfFromFile,
    setSelectedPdfFromPath,
    setSelectedPdfById,
  } = usePdfSelection();

  const value = useMemo<AppContextValue>(
    () => ({
      appName: "PDF Knowledge Explorer",
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

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }

  return context;
}
