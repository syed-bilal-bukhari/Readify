import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  message,
} from "antd";
import type { FormInstance } from "antd/es/form";
import { useState } from "react";
import type { TopicRecord } from "../utils/db/types";

type HighlightMetadataModalProps = {
  open: boolean;
  form: FormInstance;
  currentPage: number;
  topics: TopicRecord[];
  pdfId?: string;
  isEditing?: boolean;
  onOk: () => void;
  onCancel: () => void;
  onRefreshTopics: () => Promise<void>;
  onCreateTopic: (name: string, parentId: string | null) => Promise<void>;
};

const HighlightMetadataModal = ({
  open,
  form,
  currentPage,
  topics,
  pdfId,
  isEditing = false,
  onOk,
  onCancel,
  onRefreshTopics,
  onCreateTopic,
}: HighlightMetadataModalProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicParentId, setNewTopicParentId] = useState<string | null>(null);

  const handleRefreshTopics = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshTopics();
      message.success("Topics refreshed");
    } catch (err) {
      message.error("Failed to refresh topics");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopicName.trim()) {
      message.warning("Topic name cannot be empty");
      return;
    }

    try {
      await onCreateTopic(newTopicName.trim(), newTopicParentId);
      message.success(`Topic "${newTopicName}" created`);
      setNewTopicName("");
      setNewTopicParentId(null);
      setIsCreatingTopic(false);
    } catch (err) {
      message.error("Failed to create topic");
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit Highlight Metadata" : "Save Highlight Metadata"}
      open={open}
      onOk={onOk}
      onCancel={onCancel}
      okText={isEditing ? "Update" : "Save"}
      cancelText="Cancel"
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          page: currentPage,
          tags: "",
          topicIds: [],
        }}
      >
        <Form.Item label="Topics">
          <Flex vertical gap={8}>
            <Flex gap={8} align="center">
              <Form.Item name="topicIds" noStyle style={{ flex: 1 }}>
                <Select
                  mode="multiple"
                  placeholder="Select topics"
                  options={topics.map((topic) => ({
                    value: topic.id,
                    label: topic.name,
                  }))}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  style={{ flex: 1 }}
                />
              </Form.Item>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshTopics}
                loading={isRefreshing}
                title="Refresh topics"
              />
              <Button
                icon={<PlusOutlined />}
                onClick={() => setIsCreatingTopic(!isCreatingTopic)}
                type={isCreatingTopic ? "primary" : "default"}
                title="Create new topic"
              />
            </Flex>

            {isCreatingTopic && (
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  placeholder="New topic name"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  onPressEnter={handleCreateTopic}
                  style={{ flex: 1 }}
                />
                <Select
                  placeholder="Parent (optional)"
                  value={newTopicParentId}
                  onChange={setNewTopicParentId}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={[
                    { value: null, label: "Root (No Parent)" },
                    ...topics.map((topic) => ({
                      value: topic.id,
                      label: topic.name,
                    })),
                  ]}
                  style={{ width: 180 }}
                />
                <Button type="primary" onClick={handleCreateTopic}>
                  Add
                </Button>
              </Space.Compact>
            )}
          </Flex>
        </Form.Item>
        <Form.Item name="book" label="Book">
          <Input placeholder="Book name" />
        </Form.Item>
        <Form.Item name="volume" label="Volume">
          <Input placeholder="Volume" />
        </Form.Item>
        <Form.Item name="chapter" label="Chapter">
          <Input placeholder="Chapter" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea
            placeholder="Optional description for this highlight"
            rows={3}
            allowClear
          />
        </Form.Item>
        <Form.Item
          name="page"
          label="Page number"
          rules={[{ required: true, message: "Page is required" }]}
        >
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="tags" label="Tags (comma separated)">
          <Input placeholder="tag1, tag2" />
        </Form.Item>
        <Form.Item label="PDF id">
          <Input value={pdfId ?? ""} disabled />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default HighlightMetadataModal;
