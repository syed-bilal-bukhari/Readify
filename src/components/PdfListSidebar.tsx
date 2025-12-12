import { Alert, Card, List, Typography } from "antd";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { getPdfIndex, type PdfRecord } from "../utils/pdfIndex";

function PdfListSidebar() {
  const { setSelectedPdfById } = useApp();
  const [pdfs, setPdfs] = useState<PdfRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const records = await getPdfIndex();
        if (!active) return;
        setPdfs(records.slice(0, 5));
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Failed to load PDFs";
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleSelect = (id: string) => {
    void setSelectedPdfById(id);
  };

  return (
    <Card title="Recent PDFs" size="small">
      <List
        size="small"
        loading={loading}
        dataSource={pdfs}
        locale={{
          emptyText: loading
            ? "Loading PDFs..."
            : error
            ? "Failed to load PDFs"
            : "No PDFs found. Load one to get started.",
        }}
        renderItem={(item) => (
          <List.Item
            style={{ cursor: "pointer" }}
            onClick={() => handleSelect(item.id)}
          >
            <List.Item.Meta
              title={item.title}
              description={
                <Typography.Text type="secondary" ellipsis>
                  {item.path}
                </Typography.Text>
              }
            />
          </List.Item>
        )}
      />
      {error ? (
        <Alert
          type="error"
          message="Could not load PDFs"
          description={error}
          showIcon
          style={{ marginTop: 8 }}
        />
      ) : null}
    </Card>
  );
}

export default PdfListSidebar;
