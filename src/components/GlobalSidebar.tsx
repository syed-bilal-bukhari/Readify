import { Collapse } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ROUTES } from "../utils/routes";
import BookmarksList from "./BookmarksList";
import PdfListSidebar from "./PdfListSidebar";
import SearchByTopicPanel from "./SearchByTopicPanel";
import TopicTreePanel from "./TopicTreePanel";

type GlobalSidebarProps = {
  onNavigateToPage?: (page: number) => void;
};

function GlobalSidebar({ onNavigateToPage }: GlobalSidebarProps) {
  const { selectedPdf, setSelectedPdfById } = useApp();
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleOpenReference = (payload: {
    pdfId: string;
    highlightId: string;
    page?: number;
  }) => {
    void setSelectedPdfById(payload.pdfId);
    navigate(ROUTES.research, {
      state: {
        focusHighlightId: payload.highlightId,
        focusPage: payload.page,
        focusPdfId: payload.pdfId,
      },
    });
  };

  return (
    <div className="global-sider-body">
      <Collapse
        bordered={false}
        defaultActiveKey={["pdfs"]}
        style={{ width: "100%" }}
        items={[
          {
            key: "pdfs",
            label: "Recent PDFs",
            children: <PdfListSidebar />,
          },
          {
            key: "bookmarks",
            label: "Bookmarks",
            children: (
              <BookmarksList
                pdfId={selectedPdf?.id}
                onNavigateToPage={
                  onNavigateToPage ??
                  (() => {
                    // Default no-op if not provided
                  })
                }
              />
            ),
          },
          {
            key: "search",
            label: "Search by Topic",
            children: (
              <SearchByTopicPanel
                title="Search by Topic"
                compact
                onOpenReference={handleOpenReference}
                onTopicSelect={(topicId) => setFocusedTopicId(topicId)}
              />
            ),
          },
          {
            key: "topics",
            label: "Topics Tree",
            children: (
              <TopicTreePanel focusTopicId={focusedTopicId ?? undefined} />
            ),
          },
        ]}
      />
    </div>
  );
}

export default GlobalSidebar;
