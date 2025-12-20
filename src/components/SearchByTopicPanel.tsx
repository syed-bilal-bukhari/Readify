import {
  Alert,
  Card,
  List,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getHighlightsByTopic } from "../utils/db/highlights";
import { getPdfRecord } from "../utils/db/pdfs";
import { getTopics } from "../utils/db/topics";
import type {
  HighlightRecord,
  PdfRecord,
  TopicRecord,
} from "../utils/db/types";
import { buildTopicPath, formatTopicPath } from "../utils/topics/graph";
import "./SearchByTopicPanel.css";

type ReferenceEntry = {
  highlight: HighlightRecord;
  pdf?: PdfRecord;
};

type SearchByTopicPanelProps = {
  title?: string;
  compact?: boolean;
  selectedTopicId?: string | null;
  onOpenReference?: (payload: {
    pdfId: string;
    highlightId: string;
    page?: number;
  }) => void;
  onTopicSelect?: (topicId: string | null) => void;
};

function SearchByTopicPanel({
  compact = false,
  selectedTopicId: externalSelectedTopicId,
  onOpenReference,
  onTopicSelect,
}: SearchByTopicPanelProps) {
  const navigate = useNavigate();
  const { setSelectedPdfById } = useApp();
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  // Sync external selection with internal state
  useEffect(() => {
    if (externalSelectedTopicId !== undefined) {
      setSelectedTopicId(externalSelectedTopicId);
    }
  }, [externalSelectedTopicId]);
  const [references, setReferences] = useState<ReferenceEntry[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const records = await getTopics();
        setTopics(records);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load topics";
        message.error(msg);
      }
    };
    void load();
  }, []);

  const pathLookup = useMemo(() => {
    const entries: Record<string, string> = {};
    topics.forEach((topic) => {
      const path = buildTopicPath(topics, topic.id);
      entries[topic.id] = formatTopicPath(path);
    });
    return entries;
  }, [topics]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return topics.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        pathLookup[t.id]?.toLowerCase().includes(q)
    );
  }, [query, topics, pathLookup]);

  useEffect(() => {
    const loadRefs = async () => {
      if (!selectedTopicId) {
        setReferences([]);
        return;
      }
      setLoadingRefs(true);
      setError(null);
      try {
        const refs = await getHighlightsByTopic(selectedTopicId);
        const pdfIds = Array.from(new Set(refs.map((r) => r.pdfId))).filter(
          Boolean
        ) as string[];
        const pdfMap = new Map<string, PdfRecord>();
        for (const id of pdfIds) {
          const pdf = await getPdfRecord(id);
          if (pdf) pdfMap.set(id, pdf);
        }
        setReferences(
          refs.map((highlight) => ({
            highlight,
            pdf: highlight.pdfId ? pdfMap.get(highlight.pdfId) : undefined,
          }))
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load references";
        setError(msg);
      } finally {
        setLoadingRefs(false);
      }
    };
    void loadRefs();
  }, [selectedTopicId]);

  const handleOpenReference = async (entry: ReferenceEntry) => {
    const pdfId = entry.highlight.pdfId;
    if (!pdfId) {
      message.error("Missing PDF id for this reference.");
      return;
    }
    try {
      await setSelectedPdfById(pdfId);
      const payload = {
        pdfId,
        highlightId: entry.highlight.id,
        page: entry.highlight.page,
      };
      if (onOpenReference) {
        onOpenReference(payload);
      } else {
        navigate("/research", {
          state: {
            focusHighlightId: payload.highlightId,
            focusPage: payload.page,
            focusPdfId: pdfId,
          },
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to open reference";
      message.error(msg);
    }
  };

  const selectedTopic = selectedTopicId
    ? topics.find((t) => t.id === selectedTopicId) ?? null
    : null;

  return (
    <Card size={compact ? "small" : "default"} className="search-topic-panel">
      <Space direction="vertical" style={{ width: "100%" }} size="small">
        <Select
          showSearch
          allowClear
          size="large"
          placeholder="Search topics"
          className="topic-search-select"
          popupClassName="search-topic-dropdown"
          value={selectedTopicId ?? undefined}
          onSearch={(value) => setQuery(value)}
          onChange={(value) => {
            setSelectedTopicId(value ?? null);
            onTopicSelect?.(value ?? null);
          }}
          filterOption={false}
          style={{ width: "100%", height: "100%" }}
          options={(query ? results : selectedTopic ? [selectedTopic] : []).map(
            (item) => ({
              value: item.id,
              label: (
                <Space direction="vertical" size={0}>
                  <span>{item.name}</span>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {pathLookup[item.id]}
                  </Typography.Text>
                </Space>
              ),
            })
          )}
          notFoundContent={query ? "No topics found" : null}
        />

        <Typography.Text strong className="references-title">
          References
        </Typography.Text>
        {error ? <Alert type="error" message={error} /> : null}
        <List
          size="small"
          loading={loadingRefs}
          dataSource={references}
          className="references-list"
          locale={{
            emptyText: selectedTopic ? "No references" : "Select a topic",
          }}
          renderItem={(entry) => (
            <List.Item
              className="topic-ref-item"
              onClick={() => void handleOpenReference(entry)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void handleOpenReference(entry);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <List.Item.Meta
                title={
                  <Typography.Text>
                    {entry.highlight.description?.trim() || "No Description"}
                  </Typography.Text>
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Typography.Text type="secondary">
                      Page {entry.highlight.page}
                      {entry.highlight.book ? ` · ${entry.highlight.book}` : ""}
                      {entry.highlight.volume
                        ? ` · Vol ${entry.highlight.volume}`
                        : ""}
                    </Typography.Text>
                    {entry.highlight.tags?.length ? (
                      <Space wrap size={4}>
                        {entry.highlight.tags.map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </Space>
                    ) : null}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Space>
    </Card>
  );
}

export default SearchByTopicPanel;
