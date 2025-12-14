import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  addHighlightRecord,
  getHighlightsByPdf,
  getTopics,
  type TopicRecord,
} from "../utils/pdfIndex";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

type PdfSource = { url?: string; name?: string; id?: string };

type PdfSampleProps = {
  source?: PdfSource;
  focusHighlightId?: string | null;
  initialPage?: number;
};

type Highlight = {
  id: string;
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
  pdfId?: string;
  createdAt?: number;
};

function PdfSample({ source, focusHighlightId, initialPage }: PdfSampleProps) {
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
  const [flashHighlightId, setFlashHighlightId] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(
    null
  );

  const topicNameMap = useMemo(() => {
    const map = new Map<string, string>();
    topics.forEach((t) => map.set(t.id, t.name));
    return map;
  }, [topics]);

  const totalPages = numPages ?? 0;

  const clampPage = (page: number) => {
    if (!numPages) return 1;
    return Math.min(Math.max(1, page), numPages);
  };

  useEffect(() => {
    // Reset when source changes
    setNumPages(null);
    setCurrentPage(initialPage ?? 1);
    setHighlights([]);
    setLoadError(null);
  }, [source?.url, initialPage]);

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

  useEffect(() => {
    if (!focusHighlightId) return;
    const target = highlights.find((h) => h.id === focusHighlightId);
    if (target && target.page !== currentPage) {
      setCurrentPage(target.page);
    }
  }, [focusHighlightId, highlights, currentPage]);

  useEffect(() => {
    if (!focusHighlightId) return;
    const target = highlights.find(
      (h) => h.id === focusHighlightId && h.page === currentPage
    );
    if (!target) return;
    const timeout = setTimeout(() => {
      const el = pageRef.current?.querySelector(
        `[data-highlight-id="${focusHighlightId}"]`
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setFlashHighlightId(focusHighlightId);
        setTimeout(() => setFlashHighlightId(null), 1500);
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, [focusHighlightId, highlights, currentPage]);

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
    const startX = event.clientX - pageRect.left;
    const startY = event.clientY - pageRect.top;
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
                    data-highlight-id={hl.id}
                    data-highlight-page={hl.page}
                    data-highlight-pdf={source?.id ?? ""}
                    data-flash={flashHighlightId === hl.id || undefined}
                    style={{
                      top: hl.top,
                      left: hl.left,
                      width: hl.width,
                      height: hl.height,
                      boxShadow:
                        flashHighlightId === hl.id
                          ? "0 0 0 2px #2563eb, 0 0 12px rgba(37,99,235,0.6)"
                          : undefined,
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
      <Modal
        title="Save Highlight Metadata"
        open={metadataModalOpen}
        onOk={handleSaveMetadata}
        onCancel={handleCancelMetadata}
        okText="Save"
        cancelText="Cancel"
        destroyOnClose
      >
        <Form
          form={metaForm}
          layout="vertical"
          initialValues={{
            page: currentPage,
            tags: "",
            topicIds: [],
          }}
        >
          <Form.Item name="topicIds" label="Topics">
            <Select
              mode="multiple"
              placeholder="Select topics"
              options={topics.map((topic) => ({
                value: topic.id,
                label: topic.name,
              }))}
              allowClear
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="book" label="Book">
            <Input placeholder="Book name" />
          </Form.Item>
          <Form.Item name="volume" label="Volume">
            <Input placeholder="Volume" />
          </Form.Item>
          <Form.Item name="chapter" label="Chapter">
            <Input placeholder="Chapter" />
          </Form.Item>
          <Form.Item
            name="page"
            label="Page number"
            rules={[{ required: true, message: "Page is required" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="tags" label="Tags (comma separated)">
            <Input placeholder="tag1, tag2" />
          </Form.Item>
          <Form.Item label="PDF id">
            <Input value={source?.id ?? ""} disabled />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Highlight Details"
        open={viewModalOpen}
        onCancel={() => {
          setViewModalOpen(false);
          setSelectedHighlight(null);
        }}
        footer={null}
      >
        {selectedHighlight ? (
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Typography.Text>Page: {selectedHighlight.page}</Typography.Text>
            {selectedHighlight.book ? (
              <Typography.Text>Book: {selectedHighlight.book}</Typography.Text>
            ) : null}
            {selectedHighlight.volume ? (
              <Typography.Text>
                Volume: {selectedHighlight.volume}
              </Typography.Text>
            ) : null}
            {selectedHighlight.chapter ? (
              <Typography.Text>
                Chapter: {selectedHighlight.chapter}
              </Typography.Text>
            ) : null}
            {selectedHighlight.tags?.length ? (
              <Space wrap>
                {selectedHighlight.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            ) : (
              <Typography.Text type="secondary">No tags</Typography.Text>
            )}
            {selectedHighlight.topicIds?.length ? (
              <Space wrap>
                {selectedHighlight.topicIds.map((id) => (
                  <Tag key={id}>{topicNameMap.get(id) ?? id}</Tag>
                ))}
              </Space>
            ) : null}
            {selectedHighlight.createdAt ? (
              <Typography.Text type="secondary">
                Created:{" "}
                {new Date(selectedHighlight.createdAt).toLocaleString()}
              </Typography.Text>
            ) : null}
          </Space>
        ) : (
          <Typography.Text type="secondary">
            No highlight selected
          </Typography.Text>
        )}
      </Modal>
    </Card>
  );
}

export default PdfSample;
