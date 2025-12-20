import {
  DeleteOutlined,
  FileAddOutlined,
  FilePdfFilled,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Empty,
  Input,
  Modal,
  Skeleton,
  Tooltip,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getPdfIndex, removePdfRecord } from "../utils/db/pdfs";
import type { PdfRecord } from "../utils/db/types";
import { ROUTES } from "../utils/routes";
import "./LibraryPage.css";

function LibraryPage() {
  const navigate = useNavigate();
  const { setSelectedPdfById } = useApp();
  const [pdfs, setPdfs] = useState<PdfRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pdfToDelete, setPdfToDelete] = useState<PdfRecord | null>(null);

  const loadPdfs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await getPdfIndex();
      setPdfs(records);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load PDFs";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPdfs();
  }, [loadPdfs]);

  const filteredPdfs = useMemo(() => {
    if (!searchQuery.trim()) return pdfs;
    const query = searchQuery.toLowerCase();
    return pdfs.filter(
      (pdf) =>
        pdf.title.toLowerCase().includes(query) ||
        pdf.path.toLowerCase().includes(query)
    );
  }, [pdfs, searchQuery]);

  const handleOpenPdf = async (pdf: PdfRecord) => {
    await setSelectedPdfById(pdf.id);
    navigate(ROUTES.research);
  };

  const handleDeleteClick = (e: React.MouseEvent, pdf: PdfRecord) => {
    e.stopPropagation();
    setPdfToDelete(pdf);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pdfToDelete) return;
    try {
      await removePdfRecord(pdfToDelete.id);
      message.success(`"${pdfToDelete.title}" removed from library`);
      setPdfs((prev) => prev.filter((p) => p.id !== pdfToDelete.id));
    } catch {
      message.error("Failed to remove PDF");
    } finally {
      setDeleteModalOpen(false);
      setPdfToDelete(null);
    }
  };

  const handleAddPdf = () => {
    // Navigate to home where user can add PDFs
    navigate(ROUTES.research);
  };

  return (
    <section className="page library-page">
      <div className="library-header">
        <div className="library-header-text">
          <p className="eyebrow">Library</p>
          <Typography.Title level={1}>Your PDF Collection</Typography.Title>
          <Typography.Paragraph>
            Browse and manage your documents. Click on any PDF to open it and
            start creating highlights.
          </Typography.Paragraph>
        </div>

        <div className="library-header-actions">
          <Button
            type="primary"
            icon={<FileAddOutlined />}
            onClick={handleAddPdf}
            size="large"
          >
            Add PDF
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {!loading && pdfs.length > 0 && (
        <div className="library-search">
          <Input
            placeholder="Search your library..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="large"
          />
        </div>
      )}

      {loading ? (
        <div className="library-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="library-card library-card-skeleton">
              <Skeleton.Avatar
                active
                size={64}
                shape="square"
                style={{ borderRadius: 12 }}
              />
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ))}
        </div>
      ) : filteredPdfs.length === 0 ? (
        <Empty
          description={
            searchQuery ? (
              <span className="library-empty-text">
                No PDFs matching "{searchQuery}"
              </span>
            ) : (
              <span className="library-empty-text">
                Your library is empty. Add your first PDF to get started.
              </span>
            )
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          {!searchQuery && (
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={handleAddPdf}
            >
              Add Your First PDF
            </Button>
          )}
        </Empty>
      ) : (
        <>
          <div className="library-stats">
            <Typography.Text className="library-stats-text">
              {filteredPdfs.length}{" "}
              {filteredPdfs.length === 1 ? "document" : "documents"}
              {searchQuery && ` found`}
            </Typography.Text>
          </div>
          <div className="library-grid">
            {filteredPdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="library-card"
                onClick={() => void handleOpenPdf(pdf)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    void handleOpenPdf(pdf);
                  }
                }}
              >
                <div className="library-card-icon">
                  <FilePdfFilled />
                </div>

                <div className="library-card-content">
                  <Tooltip title={pdf.title} placement="topLeft">
                    <Typography.Text className="library-card-title" ellipsis>
                      {pdf.title}
                    </Typography.Text>
                  </Tooltip>
                  <Typography.Text
                    className="library-card-path"
                    type="secondary"
                    ellipsis
                  >
                    {pdf.path}
                  </Typography.Text>
                </div>

                <div className="library-card-actions">
                  <Tooltip title="Remove from library">
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => handleDeleteClick(e, pdf)}
                      className="library-card-delete"
                    />
                  </Tooltip>
                </div>

                <div className="library-card-glow" />
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        title="Remove PDF"
        open={deleteModalOpen}
        onOk={() => void handleConfirmDelete()}
        onCancel={() => {
          setDeleteModalOpen(false);
          setPdfToDelete(null);
        }}
        okText="Remove"
        okButtonProps={{ danger: true }}
      >
        <p>
          Are you sure you want to remove{" "}
          <strong>"{pdfToDelete?.title}"</strong> from your library?
        </p>
        <p style={{ color: "#666666", fontSize: "0.9rem" }}>
          This will also remove all highlights associated with this document.
        </p>
      </Modal>
    </section>
  );
}

export default LibraryPage;
