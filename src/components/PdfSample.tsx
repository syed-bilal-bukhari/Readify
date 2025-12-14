import {
  Button,
  Card,
  Flex,
  Form,
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
import type { Highlight } from "../types/pdfHighlight";
import {
  addHighlightRecord,
  deleteHighlightRecord,
  getHighlightsByPdf,
} from "../utils/db/highlights";
import { getTopics } from "../utils/db/topics";
import type { TopicRecord } from "../utils/db/types";
import HighlightDetailsModal from "./HighlightDetailsModal";
import HighlightMetadataModal from "./HighlightMetadataModal";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const BASE_PAGE_WIDTH = 520;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 0.2;

type PdfSource = { url?: string; name?: string; id?: string };

type PdfSampleProps = {
  source?: PdfSource;
  focusHighlightId?: string | null;
  initialPage?: number;
  onPageChange?: (page: number) => void;
};

function PdfSample({
  source,
  focusHighlightId,
  initialPage,
  onPageChange,
}: PdfSampleProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [drawMode, setDrawMode] = useState(true);
  const [draftBox, setDraftBox] = useState<Highlight | null>(null);
  const [pendingBox, setPendingBox] = useState<Highlight | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<boolean>(false);
  const [metaForm] = Form.useForm();
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(
    null
  );
  const [zoom, setZoom] = useState(1);
  const hasNotifiedInitialPageRef = useRef(false);

  const topicNameMap = useMemo(() => {
    const map = new Map<string, string>();
    topics.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [topics]);

  const totalPages = numPages ?? Number.POSITIVE_INFINITY;
  const totalPagesDisplay = numPages ?? 0;

  const clampPage = (page: number) => {
    if (!numPages) {
      // If page count not known yet, optimistically keep requested page
      return Math.max(1, page);
    }
    return Math.min(Math.max(1, page), numPages);
  };

  useEffect(() => {
    // Reset when source changes
    setNumPages(null);
    setCurrentPage(initialPage ?? 1);
    setHighlights([]);
    setLoadError(null);
  }, [source?.url]);

  useEffect(() => {
    if (initialPage !== undefined && initialPage !== null) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  useEffect(() => {
    // skip the first notification if an initialPage was provided,
    // to avoid emitting the default 1 before the prop syncs through.
    if (!hasNotifiedInitialPageRef.current) {
      hasNotifiedInitialPageRef.current = true;
      if (initialPage !== undefined && initialPage !== null) {
        return;
      }
    }
    if (onPageChange) {
      onPageChange(currentPage);
    }
    // eslint-disable-next-line no-console
    console.log("PdfSample page state", {
      currentPage,
      numPages,
      focusHighlightId,
      sourceId: source?.id,
    });
  }, [
    currentPage,
    numPages,
    focusHighlightId,
    source?.id,
    onPageChange,
    initialPage,
  ]);

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
            records.map(
              ({
                id,
                page,
                top,
                left,
                width,
                height,
                topicIds,
                book,
                volume,
                chapter,
                tags,
                pdfId,
                createdAt,
                description,
              }) => ({
                id,
                page,
                top,
                left,
                width,
                height,
                topicIds: topicIds ?? [],
                book,
                volume,
                chapter,
                tags,
                pdfId,
                createdAt,
                description,
              })
            )
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

  // focusHighlightId is retained for signature compatibility but no longer used

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const records = await getTopics();
        setTopics(records);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load topics", err);
      }
    };
    void loadTopics();
  }, []);

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
    const startX = (event.clientX - pageRect.left) / zoom;
    const startY = (event.clientY - pageRect.top) / zoom;
    setDraftBox({
      id: "draft",
      page: currentPage,
      top: startY,
      left: startX,
      width: 0,
      height: 0,
      topicIds: [],
    });
  };

  const handlePageMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!draftBox || !pageRef.current) return;
    const pageRect = pageRef.current.getBoundingClientRect();
    const currentX = (event.clientX - pageRect.left) / zoom;
    const currentY = (event.clientY - pageRect.top) / zoom;
    const left = Math.min(draftBox.left, currentX);
    const top = Math.min(draftBox.top, currentY);
    const width = Math.abs(currentX - draftBox.left);
    const height = Math.abs(currentY - draftBox.top);
    setDraftBox({ ...draftBox, left, top, width, height });
  };

  const handlePageMouseUp = () => {
    if (draftBox) {
      if (!source?.id) {
        message.warning("Cannot save highlight: missing PDF id");
        setDraftBox(null);
        return;
      }
      if (draftBox.width > 4 && draftBox.height > 4) {
        const newHighlight: Highlight = {
          ...draftBox,
          pdfId: source.id,
          topicIds: [],
        };
        setPendingBox(newHighlight);
        metaForm.setFieldsValue({
          topicIds: [],
          book: "",
          volume: "",
          chapter: "",
          page: draftBox.page,
          tags: "",
        });
        setMetadataModalOpen(true);
      }
      setDraftBox(null);
    }
  };

  const handleCancelMetadata = () => {
    setMetadataModalOpen(false);
    setPendingBox(null);
  };

  const handleSaveMetadata = async () => {
    if (!pendingBox || !source?.id) {
      message.error("Missing highlight or PDF context.");
      return;
    }
    try {
      const values = await metaForm.validateFields();
      const tags = (values.tags as string)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const id = `box-${Date.now()}`;
      const record = {
        id,
        pdfId: source.id,
        page: values.page,
        top: pendingBox.top,
        left: pendingBox.left,
        width: pendingBox.width,
        height: pendingBox.height,
        topicIds: (values.topicIds as string[]) ?? [],
        book: values.book as string,
        volume: values.volume as string,
        chapter: values.chapter as string,
        tags,
        description: (values.description as string) || undefined,
        createdAt: Date.now(),
      };
      setHighlights((prev) => [...prev, record]);
      await addHighlightRecord(record);
      setMetadataModalOpen(false);
      setPendingBox(null);
      metaForm.resetFields();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    }
  };

  const clampZoom = (value: number) =>
    Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  const handleZoomChange = (delta: number) => {
    setZoom((prev) => Number(clampZoom(Number((prev + delta).toFixed(2)))));
  };
  const handleResetZoom = () => setZoom(1);

  const handleClearSelectedHighlight = async () => {
    if (!selectedHighlight) return;
    try {
      setHighlights((prev) =>
        prev.filter((hl) => hl.id !== selectedHighlight.id)
      );
      if (selectedHighlight.id) {
        await deleteHighlightRecord(selectedHighlight.id);
      }
      setSelectedHighlight(null);
      setViewModalOpen(false);
      message.success("Highlight removed.");
    } catch (err) {
      message.error("Unable to remove highlight.");
      // eslint-disable-next-line no-console
      console.error("Failed to delete highlight", err);
    }
  };

  const downloadPlaceholder = () => {
    message.info("Download is not available yet.");
  };

  const scaledPageWidth = BASE_PAGE_WIDTH * zoom;

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
        <Flex
          className="pdf-toolbar"
          gap={12}
          wrap
          align="center"
          justify="space-between"
        >
          <Flex align="center" gap={8} wrap>
            <Button
              onClick={() => setCurrentPage((p) => clampPage(p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage((p) => clampPage(p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
            <Typography.Text>
              Page {currentPage}{" "}
              {totalPagesDisplay ? `of ${totalPagesDisplay}` : ""}
            </Typography.Text>
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
          <Flex align="center" gap={8} wrap>
            <Button
              onClick={() => handleZoomChange(-ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
            >
              -
            </Button>
            <Typography.Text>{Math.round(zoom * 100)}%</Typography.Text>
            <Button
              onClick={() => handleZoomChange(ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
            >
              +
            </Button>
            <Button onClick={handleResetZoom}>Reset Zoom</Button>
          </Flex>
          <Flex align="center" gap={8} wrap>
            <Button
              type={drawMode ? "primary" : "default"}
              onClick={() => {
                setDrawMode((prev) => !prev);
              }}
            >
              Highlight
            </Button>
            <Button onClick={downloadPlaceholder}>Download</Button>
          </Flex>
        </Flex>
        <Flex
          justify="center"
          className="pdf-container"
          ref={containerRef}
          style={{
            maxHeight: 720,
            minHeight: 400,
            overflow: "auto",
            padding: 16,
            border: "1px solid #f0f0f0",
            borderRadius: 8,
          }}
        >
          {hasFile && activeSource ? (
            <div
              className="pdf-page-wrap"
              ref={pageRef}
              onMouseDown={handlePageMouseDown}
              onMouseMove={handlePageMouseMove}
              onMouseUp={handlePageMouseUp}
              style={{ width: scaledPageWidth }}
            >
              {highlights
                .filter((hl) => hl.page === currentPage)
                .map((hl) => (
                  <div
                    key={hl.id}
                    className="pdf-highlight"
                    data-highlight-id={hl.id}
                    data-highlight-page={hl.page}
                    data-highlight-pdf={source?.id ?? ""}
                    style={{
                      top: hl.top * zoom,
                      left: hl.left * zoom,
                      width: hl.width * zoom,
                      height: hl.height * zoom,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHighlight(hl);
                      setViewModalOpen(true);
                    }}
                  />
                ))}
              {draftBox ? (
                <div
                  className="pdf-highlight pdf-highlight-draft"
                  style={{
                    top: draftBox.top * zoom,
                    left: draftBox.left * zoom,
                    width: draftBox.width * zoom,
                    height: draftBox.height * zoom,
                  }}
                />
              ) : null}
              <Document
                key={documentKey}
                file={fileDescriptor}
                onLoadSuccess={({ numPages: total }) => {
                  setLoadError(null);
                  setNumPages(total);
                  setCurrentPage((prev) =>
                    Math.min(Math.max(1, prev), total ?? prev)
                  );
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
                  width={scaledPageWidth}
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
      <HighlightMetadataModal
        open={metadataModalOpen}
        onOk={handleSaveMetadata}
        onCancel={handleCancelMetadata}
        form={metaForm}
        currentPage={currentPage}
        topics={topics}
        pdfId={source?.id}
      />

      <HighlightDetailsModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedHighlight(null);
        }}
        highlight={selectedHighlight}
        topicNameMap={topicNameMap}
        onClear={handleClearSelectedHighlight}
      />
    </Card>
  );
}

export default PdfSample;
