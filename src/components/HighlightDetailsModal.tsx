import { Button, Modal, Space, Tag, Typography } from "antd";
import type { Highlight } from "../types/pdfHighlight";

type HighlightDetailsModalProps = {
  open: boolean;
  highlight: Highlight | null;
  onClose: () => void;
  topicNameMap: Map<string, string>;
  onClear: () => void;
};

const HighlightDetailsModal = ({
  open,
  highlight,
  onClose,
  topicNameMap,
  onClear,
}: HighlightDetailsModalProps) => (
  <Modal
    title="Highlight Details"
    open={open}
    onCancel={onClose}
    footer={[
      <Button key="close" onClick={onClose}>
        Close
      </Button>,
      <Button key="clear" danger onClick={onClear} disabled={!highlight}>
        Clear Highlight
      </Button>,
    ]}
  >
    {highlight ? (
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <Typography.Text>Page: {highlight.page}</Typography.Text>
        {highlight.book ? (
          <Typography.Text>Book: {highlight.book}</Typography.Text>
        ) : null}
        {highlight.volume ? (
          <Typography.Text>Volume: {highlight.volume}</Typography.Text>
        ) : null}
        {highlight.chapter ? (
          <Typography.Text>Chapter: {highlight.chapter}</Typography.Text>
        ) : null}
        {highlight.description ? (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Typography.Text strong>Description</Typography.Text>
            <Typography.Paragraph
              style={{ margin: 0, whiteSpace: "pre-wrap" }}
            >
              {highlight.description}
            </Typography.Paragraph>
          </Space>
        ) : null}
        {highlight.tags?.length ? (
          <Space wrap>
            {highlight.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">No tags</Typography.Text>
        )}
        {highlight.topicIds?.length ? (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Typography.Text strong>Topics</Typography.Text>
            <Space wrap>
              {highlight.topicIds.map((id) => (
                <Tag key={id}>{topicNameMap.get(id) ?? id}</Tag>
              ))}
            </Space>
          </Space>
        ) : (
          <Typography.Text type="secondary">No topics</Typography.Text>
        )}
        {highlight.createdAt ? (
          <Typography.Text type="secondary">
            Created: {new Date(highlight.createdAt).toLocaleString()}
          </Typography.Text>
        ) : null}
      </Space>
    ) : (
      <Typography.Text type="secondary">No highlight selected</Typography.Text>
    )}
  </Modal>
);

export default HighlightDetailsModal;
