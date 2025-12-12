import {
  Button,
  Card,
  Flex,
  InputNumber,
  Space,
  Typography,
  message,
} from "antd";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { addHighlightRecord, getHighlightsByPdf } from "../utils/pdfIndex";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

type PdfSource = { url?: string; name?: string; id?: string };

type Highlight = {
  id: string;
  page: number;
  top: number;
  left: number;
  width: number;
  height: number;
};

function PdfSample({ source }: { source?: PdfSource }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [drawMode, setDrawMode] = useState(true);
  const [draftBox, setDraftBox] = useState<Highlight | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);

  const totalPages = numPages ?? 0;

  const clampPage = (page: number) => {
    if (!numPages) return 1;
    return Math.min(Math.max(1, page), numPages);
  };

  useEffect(() => {
    // Reset when source changes
    setNumPages(null);
    setCurrentPage(1);
    setHighlights([]);
    setLoadError(null);
  }, [source?.url]);

  useEffect(() => {
    if (numPages) {
      setCurrentPage((prev) => clampPage(prev));
    }
  }, [numPages]);

  useEffect(() => {
    let cancelled = false;
    const loadHighlights = async () => {
      if (!source?.id) {
        setHighlights([]);
        return;
      }
      loadingRef.current = true;
      try {
        const records = await getHighlightsByPdf(source.id);
        if (!cancelled) {
          setHighlights(
            records.map(({ id, page, top, left, width, height }) => ({
              id,
              page,
              top,
              left,
              width,
              height,
            }))
          );
        }
      } finally {
        loadingRef.current = false;
      }
    };
    void loadHighlights();
    return () => {
      cancelled = true;
    };
  }, [source?.id]);

  const activeSource = source;
  const hasFile = Boolean(activeSource?.url);
  const fileDescriptor = useMemo(
    () => (activeSource?.url ? { url: activeSource.url } : undefined),
    [activeSource?.url]
  );
  const documentKey = useMemo(
    () => `${activeSource?.id ?? "no-id"}::${activeSource?.url ?? "no-url"}`,
    [activeSource?.id, activeSource?.url]
  );

  const docTitle = useMemo(
    () =>
      `${activeSource?.name ?? "No PDF selected"} ${
        numPages ? `(${numPages} page${numPages > 1 ? "s" : ""})` : ""
      }`,
    [activeSource?.name, numPages]
  );

  const handlePageMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!drawMode || !pageRef.current) return;
    const pageRect = pageRef.current.getBoundingClientRect();
    const startX = event.clientX - pageRect.left;
    const startY = event.clientY - pageRect.top;
    setDraftBox({
      id: "draft",
      page: currentPage,
      top: startY,
      left: startX,
      width: 0,
      height: 0,
    });
  };

  const handlePageMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!draftBox || !pageRef.current) return;
    const pageRect = pageRef.current.getBoundingClientRect();
    const currentX = event.clientX - pageRect.left;
    const currentY = event.clientY - pageRect.top;
    const left = Math.min(draftBox.left, currentX);
    const top = Math.min(draftBox.top, currentY);
    const width = Math.abs(currentX - draftBox.left);
    const height = Math.abs(currentY - draftBox.top);
    setDraftBox({ ...draftBox, left, top, width, height });
  };

  const handlePageMouseUp = () => {
    if (draftBox) {
      if (draftBox.width > 4 && draftBox.height > 4) {
        const id = `box-${Date.now()}`;
        const pdfId = source?.id;
        const newHighlight = { ...draftBox, id };
        setHighlights((prev) => [...prev, newHighlight]);
        if (pdfId) {
          void addHighlightRecord({
            id,
            pdfId,
            page: draftBox.page,
            top: draftBox.top,
            left: draftBox.left,
            width: draftBox.width,
            height: draftBox.height,
            createdAt: Date.now(),
          }).catch((err) => {
            // eslint-disable-next-line no-console
            console.error("Failed to save highlight", err);
            message.error("Failed to save highlight");
          });
        } else {
          message.warning("Cannot save highlight: missing PDF id");
        }
      }
      setDraftBox(null);
    }
  };

  return (
    <Card title={docTitle} className="pdf-card">
      <Space direction="vertical" size="middle" className="pdf-space">
        <Typography.Text type="secondary">
          Rendered with react-pdf (pdf.js). Use the Open PDF button to pick one
          from disk or import an index.
        </Typography.Text>
        {loadError ? (
          <Typography.Text type="danger">
            Failed to load PDF. Make sure the file exists under /public and
            refresh. ({loadError})
          </Typography.Text>
        ) : null}
        <Flex align="center" gap={8} wrap>
          <Button
            onClick={() => setCurrentPage((p) => clampPage(p - 1))}
            disabled={!numPages || currentPage <= 1}
          >
            Previous
          </Button>
          <Button
            onClick={() => setCurrentPage((p) => clampPage(p + 1))}
            disabled={!numPages || currentPage >= totalPages}
          >
            Next
          </Button>
          <Typography.Text>
            Page {currentPage} {totalPages ? `of ${totalPages}` : ""}
          </Typography.Text>
          <Button
            type={drawMode ? "primary" : "default"}
            onClick={() => {
              setDrawMode((prev) => !prev);
            }}
          >
            {drawMode ? "Drawing mode on" : "Box highlight mode"}
          </Button>
          <InputNumber
            min={1}
            max={totalPages || 1}
            value={currentPage}
            disabled={!numPages}
            onChange={(value) => {
              const numeric = typeof value === "number" ? value : currentPage;
              setCurrentPage(clampPage(numeric));
            }}
            style={{ width: 100 }}
          />
        </Flex>
        <Flex justify="center" className="pdf-container" ref={containerRef}>
          {hasFile && activeSource ? (
            <div
              className="pdf-page-wrap"
              ref={pageRef}
              onMouseDown={handlePageMouseDown}
              onMouseMove={handlePageMouseMove}
              onMouseUp={handlePageMouseUp}
            >
              {highlights
                .filter((hl) => hl.page === currentPage)
                .map((hl) => (
                  <div
                    key={hl.id}
                    className="pdf-highlight"
                    style={{
                      top: hl.top,
                      left: hl.left,
                      width: hl.width,
                      height: hl.height,
                    }}
                  />
                ))}
              {draftBox ? (
                <div
                  className="pdf-highlight pdf-highlight-draft"
                  style={{
                    top: draftBox.top,
                    left: draftBox.left,
                    width: draftBox.width,
                    height: draftBox.height,
                  }}
                />
              ) : null}
              <Document
                key={documentKey}
                file={fileDescriptor}
                onLoadSuccess={({ numPages: total }) => {
                  setLoadError(null);
                  setNumPages(total);
                }}
                loading="Loading PDF..."
                error="Failed to load the PDF."
                onLoadError={(err) => {
                  setLoadError("Unable to load PDF");
                  // eslint-disable-next-line no-console
                  console.error("PDF load error", err);
                }}
                onSourceError={(err) => {
                  setLoadError("Unable to load PDF");
                  // eslint-disable-next-line no-console
                  console.error("PDF source error", err);
                }}
              >
                <Page
                  pageNumber={currentPage}
                  width={520}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </Document>
            </div>
          ) : (
            <Typography.Text type="secondary">
              Select a PDF to begin.
            </Typography.Text>
          )}
        </Flex>
      </Space>
    </Card>
  );
}

export default PdfSample;
