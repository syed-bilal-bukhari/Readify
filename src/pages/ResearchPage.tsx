import { Layout } from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GlobalSidebar from "../components/GlobalSidebar";
import PdfSample from "../components/PdfSample";
import { useApp } from "../context/AppContext";

const { Sider, Content } = Layout;

function ResearchPage() {
  const { selectedPdf, setSelectedPdfById } = useApp();
  const [focusHighlightId, setFocusHighlightId] = useState<string | null>(null);
  const [focusPage, setFocusPage] = useState<number | undefined>(undefined);
  const [bookmarkPage, setBookmarkPage] = useState<number | undefined>(
    undefined
  );
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

  const handleNavigateToBookmarkPage = (page: number) => {
    setBookmarkPage(page);
    setFocusPage(page);
  };

  return (
    <section>
      <Layout className="home-layout">
        <Sider
          className="home-sider"
          width={340}
          theme="light"
          collapsible={false}
        >
          <GlobalSidebar onNavigateToPage={handleNavigateToBookmarkPage} />
        </Sider>
        <Content className="home-content">
          <div className="home-content-inner">
            <PdfSample
              source={selectedPdf ?? undefined}
              focusHighlightId={focusHighlightId ?? undefined}
              initialPage={focusPage ?? bookmarkPage}
            />
          </div>
        </Content>
      </Layout>
    </section>
  );
}

export default ResearchPage;
