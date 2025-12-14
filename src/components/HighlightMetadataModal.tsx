import { Form, Input, InputNumber, Modal, Select } from "antd";
import type { FormInstance } from "antd/es/form";
import type { TopicRecord } from "../utils/db/types";

type HighlightMetadataModalProps = {
  open: boolean;
  form: FormInstance;
  currentPage: number;
  topics: TopicRecord[];
  pdfId?: string;
  onOk: () => void;
  onCancel: () => void;
};

const HighlightMetadataModal = ({
  open,
  form,
  currentPage,
  topics,
  pdfId,
  onOk,
  onCancel,
}: HighlightMetadataModalProps) => (
  <Modal
    title="Save Highlight Metadata"
    open={open}
    onOk={onOk}
    onCancel={onCancel}
    okText="Save"
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
      <Form.Item name="topicIds" label="Topics">
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
        />
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

export default HighlightMetadataModal;
