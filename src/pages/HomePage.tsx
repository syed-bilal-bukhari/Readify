import { Card, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PdfListSidebar from "../components/PdfListSidebar";
import PdfSample from "../components/PdfSample";
import SearchByTopicPanel from "../components/SearchByTopicPanel";
import TopicTreePanel from "../components/TopicTreePanel";
import { useApp } from "../context/AppContext";

function HomePage() {
  const { appName, selectedPdf, setSelectedPdfById } = useApp();
  const [focusHighlightId, setFocusHighlightId] = useState<string | null>(null);
  const [focusPage, setFocusPage] = useState<number | undefined>(undefined);
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as {
      focusHighlightId?: string;
      focusPage?: number;
      focusPdfId?: string;
    } | null;
    if (state?.focusHighlightId) {
      setFocusHighlightId(state.focusHighlightId);
      setFocusPage(state.focusPage);
      if (state.focusPdfId) {
        void setSelectedPdfById(state.focusPdfId);
      }
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, setSelectedPdfById]);

  const handleOpenReference = (payload: {
    pdfId: string;
    highlightId: string;
    page?: number;
  }) => {
    void setSelectedPdfById(payload.pdfId);
    setFocusHighlightId(payload.highlightId);
    setFocusPage(payload.page);
  };

  return (
    <section className="page home-split">
      <div className="home-viewer">
        <p className="eyebrow">Welcome</p>
        <Typography.Title level={1}>{appName}</Typography.Title>
        <Typography.Paragraph>
          Highlight once, reference everywhere. Each highlight can live under
          multiple, even unrelated, topics—so you can trace ideas across your
          entire PDF library without duplicating effort.
        </Typography.Paragraph>
        <PdfSample
          source={selectedPdf ?? undefined}
          focusHighlightId={focusHighlightId ?? undefined}
          initialPage={focusPage}
        />
      </div>

      <div className="home-sidebar">
        <Typography.Title level={3}>Sidebar</Typography.Title>
        <Typography.Paragraph>
          Placeholder for search, topics, tags, or highlight details. Resize the
          window to see responsive behavior—this column stacks under the viewer
          on smaller screens.
        </Typography.Paragraph>
        <Space direction="vertical" style={{ width: "100%" }}>
          <PdfListSidebar />
          <SearchByTopicPanel
            title="Search by Topic"
            compact
            onOpenReference={handleOpenReference}
            onTopicSelect={(topicId) => setFocusedTopicId(topicId)}
          />
          <TopicTreePanel focusTopicId={focusedTopicId ?? undefined} />
          <Card title="Tags panel (placeholder)" size="small">
            <Typography.Paragraph type="secondary">
              Add quick tag filters, saved searches, or recent highlights.
            </Typography.Paragraph>
          </Card>
        </Space>
      </div>
    </section>
  );
}

export default HomePage;
