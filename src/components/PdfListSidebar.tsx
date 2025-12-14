import { FilePdfFilled, LeftOutlined, RightOutlined } from "@ant-design/icons";
import { Alert, Carousel, Empty, Skeleton, Typography } from "antd";
import type { CarouselRef } from "antd/es/carousel";
import { useEffect, useRef, useState } from "react";
// Make sure to import your context and db utils correctly
import { useApp } from "../context/AppContext";
import { getPdfIndex } from "../utils/db/pdfs";
import type { PdfRecord } from "../utils/db/types";
import "./PdfCarousel.css";

function PdfListSidebar() {
  const { setSelectedPdfById } = useApp();
  const [pdfs, setPdfs] = useState<PdfRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const carouselRef = useRef<CarouselRef | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const records = await getPdfIndex();
        if (!active) return;
        // Limit to 10 for performance
        setPdfs(records.slice(0, 10));
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

  const count = pdfs.length;

  // If we have very few items (e.g. 1), we disable this mode to avoid glitches.
  const enable3DMode = count > 1;

  // 20% padding means: 20% width on left, 20% width on right, 60% width for center slide.
  // This guarantees the "neighbors" are always visible.
  const centerPadding = enable3DMode ? "20%" : "0px";

  return (
    <div>
      {error ? (
        <div style={{ padding: "0 24px" }}>
          <Alert type="error" message={error} showIcon />
        </div>
      ) : null}

      {loading ? (
        <div className="pdf-carousel-loading">
          <Skeleton.Button
            active
            style={{ width: "100%", height: 200, borderRadius: 20 }}
          />
        </div>
      ) : pdfs.length === 0 ? (
        <div style={{ padding: "0 24px" }}>
          <Empty
            description={
              <span style={{ color: "#7d6b5a" }}>No recent PDFs</span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        <div className="pdf-carousel-shell">
          {/* Navigation Arrows */}
          {count > 1 && (
            <>
              <button
                aria-label="Previous"
                className="pdf-carousel-arrow arrow-left"
                onClick={() => carouselRef.current?.prev()}
              >
                <LeftOutlined style={{ fontSize: "14px" }} />
              </button>
              <button
                aria-label="Next"
                className="pdf-carousel-arrow arrow-right"
                onClick={() => carouselRef.current?.next()}
              >
                <RightOutlined style={{ fontSize: "14px" }} />
              </button>
            </>
          )}

          <Carousel
            ref={carouselRef}
            dots={false}
            arrows={false}
            // Infinite is required to see the "Left" neighbor when you are at the first item
            infinite={count > 2}
            speed={500}
            slidesToShow={1}
            centerMode={enable3DMode}
            centerPadding={centerPadding}
            focusOnSelect={true}
            className="pdf-carousel"
            afterChange={(current) => {
              // Normalize index to handle infinite mode edge cases
              const normalizedIndex = ((current % count) + count) % count;
              setActiveIndex(normalizedIndex);
            }}
          >
            {pdfs.map((item, idx) => {
              // Determine state based on active index
              const isActive = idx === activeIndex;
              // We simplify the logic: if it's active, it pops. If not, it's dimmed.
              const stateClass = isActive ? "is-active" : "is-adjacent";

              return (
                <div key={item.id} className="pdf-slide-wrapper">
                  <div
                    className={`pdf-slide ${stateClass}`}
                    onClick={() => handleSelect(item.id)}
                  >
                    <div className="pdf-slide-badge">
                      <FilePdfFilled />
                    </div>

                    <div className="pdf-slide-preview">
                      <FilePdfFilled className="pdf-slide-preview-icon" />
                    </div>

                    <div className="pdf-slide-content">
                      <Typography.Text className="pdf-slide-title" ellipsis>
                        {item.title}
                      </Typography.Text>
                    </div>
                  </div>
                </div>
              );
            })}
          </Carousel>

          {/* Pagination Dots */}
          <div className="pdf-carousel-dots">
            {pdfs.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`pdf-dot ${idx === activeIndex ? "active" : ""}`}
                onClick={() => carouselRef.current?.goTo(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PdfListSidebar;
