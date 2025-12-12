import { Card, Space, Typography } from "antd";
import PdfListSidebar from "../components/PdfListSidebar";
import PdfSample from "../components/PdfSample";
import { useApp } from "../context/AppContext";

function HomePage() {
  const { appName, selectedPdf } = useApp();

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
        <PdfSample source={selectedPdf ?? undefined} />
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
          <Card title="Topics panel (placeholder)" size="small">
            <Typography.Paragraph type="secondary">
              Show topic tree, filters, or selected highlight metadata here.
            </Typography.Paragraph>
          </Card>
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
