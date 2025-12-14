import { FilePdfFilled, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Alert, Button, Carousel, Empty, Skeleton, Typography } from "antd";
import type { CarouselRef } from "antd/es/carousel";
import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { getPdfIndex } from "../utils/db/pdfs";
import type { PdfRecord } from "../utils/db/types";

function PdfListSidebar() {
  const { setSelectedPdfById } = useApp();
  const [pdfs, setPdfs] = useState<PdfRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const carouselRef = useRef<CarouselRef | null>(null);

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

  const gradients = [
    "linear-gradient(135deg, #7c3aed, #22d3ee)",
    "linear-gradient(135deg, #f97316, #f43f5e)",
    "linear-gradient(135deg, #22c55e, #3b82f6)",
    "linear-gradient(135deg, #6366f1, #a855f7)",
    "linear-gradient(135deg, #eab308, #f97316)",
  ];

  return (
    <div className="pdf-carousel-card">
      <div className="pdf-carousel-header">
        <Typography.Text strong>Recent PDFs</Typography.Text>
        <div className="pdf-carousel-actions">
          <Button
            shape="circle"
            icon={<LeftOutlined />}
            size="small"
            disabled={loading || pdfs.length === 0}
            onClick={() => carouselRef.current?.prev()}
          />
          <Button
            shape="circle"
            icon={<RightOutlined />}
            size="small"
            disabled={loading || pdfs.length === 0}
            onClick={() => carouselRef.current?.next()}
          />
        </div>
      </div>

      {error ? (
        <Alert
          type="error"
          message="Could not load PDFs"
          description={error}
          showIcon
        />
      ) : null}

      {loading ? (
        <div className="pdf-carousel-loading">
          <Skeleton.Image active style={{ width: "100%", height: 160 }} />
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      ) : pdfs.length === 0 ? (
        <Empty
          description="No PDFs found. Load one to get started."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Carousel
          ref={carouselRef}
          dots={{ className: "pdf-carousel-dots" }}
          className="pdf-carousel"
          autoplay
          autoplaySpeed={4000}
          speed={500}
        >
          {pdfs.map((item, idx) => (
            <div key={item.id}>
              <div
                className="pdf-slide"
                style={{ backgroundImage: gradients[idx % gradients.length] }}
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(item.id);
                  }
                }}
              >
                <div className="pdf-slide-icon">
                  <FilePdfFilled />
                </div>
                <Typography.Text className="pdf-slide-title" ellipsis>
                  {item.title}
                </Typography.Text>
                <Typography.Text className="pdf-slide-path" type="secondary">
                  {item.path}
                </Typography.Text>
              </div>
            </div>
          ))}
        </Carousel>
      )}
    </div>
  );
}

export default PdfListSidebar;
