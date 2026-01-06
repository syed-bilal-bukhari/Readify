import { HighlightOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Flex,
  Form,
  InputNumber,
  Select,
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
  updateHighlightRecord,
} from "../utils/db/highlights";
import {
  readReadingDirection,
  saveReadingDirection,
  type ReadingDirection,
} from "../utils/db/settings";
import { getTopics } from "../utils/db/topics";
import type { TopicRecord } from "../utils/db/types";
import { capturePageAsImage } from "../utils/pdfCapture";
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
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(
    null
  );
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
  const [readingDirection, setReadingDirection] =
    useState<ReadingDirection>("ltr");

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
    setEditingHighlight(null);
  };

  const handleSaveMetadata = async () => {
    if (!source?.id) {
      message.error("Missing PDF context.");
      return;
    }

    // Check if we're editing or creating
    const isEditing = !!editingHighlight;
    const boxData = isEditing ? editingHighlight : pendingBox;

    if (!boxData) {
      message.error("Missing highlight data.");
      return;
    }

    try {
      const values = await metaForm.validateFields();
      const tags = (values.tags as string)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const record = {
        id: isEditing ? editingHighlight.id : `box-${Date.now()}`,
        pdfId: source.id,
        page: values.page,
        top: boxData.top,
        left: boxData.left,
        width: boxData.width,
        height: boxData.height,
        topicIds: (values.topicIds as string[]) ?? [],
        book: values.book as string,
        volume: values.volume as string,
        chapter: values.chapter as string,
        tags,
        description: (values.description as string) || undefined,
        createdAt: isEditing
          ? editingHighlight.createdAt ?? Date.now()
          : Date.now(),
      };

      if (isEditing) {
        // Update existing highlight
        setHighlights((prev) =>
          prev.map((hl) => (hl.id === record.id ? record : hl))
        );
        await updateHighlightRecord(record);
        message.success("Highlight updated.");
      } else {
        // Create new highlight
        setHighlights((prev) => [...prev, record]);
        await addHighlightRecord(record);
        message.success("Highlight saved.");
      }

      setMetadataModalOpen(false);
      setPendingBox(null);
      setEditingHighlight(null);
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

  const goNextPage = () => {
    setCurrentPage((p) => clampPage(p + 1));
  };
  const goPrevPage = () => {
    setCurrentPage((p) => clampPage(p - 1));
  };

  const handleEditHighlight = () => {
    if (!selectedHighlight) return;

    // Pre-populate form with existing highlight data
    metaForm.setFieldsValue({
      topicIds: selectedHighlight.topicIds ?? [],
      book: selectedHighlight.book ?? "",
      volume: selectedHighlight.volume ?? "",
      chapter: selectedHighlight.chapter ?? "",
      page: selectedHighlight.page,
      tags: selectedHighlight.tags?.join(", ") ?? "",
      description: selectedHighlight.description ?? "",
    });

    setEditingHighlight(selectedHighlight);
    setViewModalOpen(false);
    setMetadataModalOpen(true);
  };

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

  const handleCapture = async () => {
    message.loading({ content: "Capturing page...", key: "capture" });

    const result = await capturePageAsImage({
      pageRef,
      highlights,
      currentPage,
      zoom,
      scaledPageWidth,
      sourceName: source?.name,
    });

    if (result.success) {
      message.success({
        content: "Page captured successfully!",
        key: "capture",
      });
    } else {
      message.error({
        content: result.error ?? "Failed to capture page",
        key: "capture",
      });
    }
  };

  const scaledPageWidth = BASE_PAGE_WIDTH * zoom;

  // Load and persist per-PDF reading direction
  useEffect(() => {
    let cancelled = false;
    const loadDir = async () => {
      const pdfId = source?.id;
      if (!pdfId) {
        setReadingDirection("ltr");
        return;
      }
      try {
        const stored = await readReadingDirection(pdfId);
        if (!cancelled) {
          setReadingDirection(stored ?? "ltr");
        }
      } catch {
        if (!cancelled) setReadingDirection("ltr");
      }
    };
    void loadDir();
    return () => {
      cancelled = true;
    };
  }, [source?.id]);

  // Global arrow-key navigation when a PDF is open
  useEffect(() => {
    if (!hasFile || !activeSource) return;
    const handler = (e: KeyboardEvent) => {
      // Disable when modals are open
      if (metadataModalOpen || viewModalOpen) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isInteractive =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;
      if (isInteractive) return;

      let handled = false;
      if (e.key === "ArrowRight") {
        if (readingDirection === "ltr") {
          goNextPage();
        } else {
          goPrevPage();
        }
        handled = true;
      } else if (e.key === "ArrowLeft") {
        if (readingDirection === "ltr") {
          goPrevPage();
        } else {
          goNextPage();
        }
        handled = true;
      }
      if (handled) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [
    hasFile,
    activeSource,
    metadataModalOpen,
    viewModalOpen,
    readingDirection,
  ]);

  return (
    <Card className="pdf-card">
      <Space direction="vertical" size="middle" className="pdf-space">
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
            <Button onClick={goPrevPage} disabled={currentPage <= 1}>
              Previous
            </Button>
            <Button onClick={goNextPage} disabled={currentPage >= totalPages}>
              Next
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
              style={{ width: 50 }}
            />
            <Typography.Text>
              {totalPagesDisplay ? `of ${totalPagesDisplay}` : ""}
            </Typography.Text>
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
              icon={
                <HighlightOutlined
                  style={{ color: drawMode ? "#ffffff" : "#FF0073" }}
                />
              }
            />
            <Select
              value={readingDirection}
              onChange={async (val) => {
                const dir = val as ReadingDirection;
                setReadingDirection(dir);
                if (source?.id) {
                  try {
                    await saveReadingDirection(source.id, dir);
                  } catch {
                    /* ignore */
                  }
                }
              }}
              options={[
                { label: "English (LTR)", value: "ltr" },
                { label: "Arabic/Urdu (RTL)", value: "rtl" },
              ]}
              style={{ width: 180 }}
            />
            <Button onClick={handleCapture}>Capture</Button>
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
        isEditing={!!editingHighlight}
      />

      <HighlightDetailsModal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedHighlight(null);
        }}
        highlight={selectedHighlight}
        topicNameMap={topicNameMap}
        onEdit={handleEditHighlight}
        onClear={handleClearSelectedHighlight}
      />
    </Card>
  );
}

export default PdfSample;
