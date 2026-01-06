import { DeleteOutlined } from "@ant-design/icons";
import { Button, Empty, List, Space, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { deleteBookmark, getBookmarksByPdf } from "../utils/db/bookmarks";
import type { BookmarkRecord } from "../utils/db/types";

type BookmarksListProps = {
  pdfId: string | undefined;
  onNavigateToPage: (page: number) => void;
};

function BookmarksList({ pdfId, onNavigateToPage }: BookmarksListProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadBookmarks = async () => {
      if (!pdfId) {
        setBookmarks([]);
        return;
      }

      setLoading(true);
      try {
        const records = await getBookmarksByPdf(pdfId);
        if (!cancelled) {
          // Sort by page number
          setBookmarks(records.sort((a, b) => a.page - b.page));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load bookmarks", err);
        if (!cancelled) {
          message.error("Failed to load bookmarks");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadBookmarks();

    return () => {
      cancelled = true;
    };
  }, [pdfId]);

  const handleDeleteBookmark = async (id: string) => {
    try {
      await deleteBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      message.success("Bookmark deleted");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete bookmark", err);
      message.error("Failed to delete bookmark");
    }
  };

  if (!pdfId) {
    return (
      <Empty
        description="No PDF selected"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  if (bookmarks.length === 0 && !loading) {
    return (
      <Empty
        description="No bookmarks yet"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <List
      loading={loading}
      dataSource={bookmarks}
      renderItem={(bookmark) => (
        <List.Item
          key={bookmark.id}
          style={{
            padding: "12px 0",
            cursor: "pointer",
            transition: "background 0.2s ease",
          }}
          onClick={() => onNavigateToPage(bookmark.page)}
          extra={
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteBookmark(bookmark.id);
              }}
            />
          }
        >
          <List.Item.Meta
            title={
              <Space>
                <Typography.Text strong>{bookmark.title}</Typography.Text>
              </Space>
            }
            description={
              <Space size={8}>
                <Typography.Text type="secondary">
                  Page {bookmark.page}
                </Typography.Text>
                <Typography.Text type="secondary">•</Typography.Text>
                <Typography.Text type="secondary">
                  {new Date(bookmark.createdAt).toLocaleDateString()}
                </Typography.Text>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );
}

export default BookmarksList;
