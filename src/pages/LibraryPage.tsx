import { Button, Empty, Space, Typography } from "antd";

function LibraryPage() {
  return (
    <section className="page">
      <p className="eyebrow">Library</p>
      <Typography.Title level={1}>Your PDF Collection</Typography.Title>
      <Typography.Paragraph>
        Placeholder view. List your PDFs here, open a book, and start creating
        multi-topic highlights with book, volume, chapter, page, and tag
        metadata.
      </Typography.Paragraph>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Empty
          description="No PDFs listed yet. Add your first document to begin."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary">Add PDF</Button>
        </Empty>
      </Space>
    </section>
  );
}

export default LibraryPage;
