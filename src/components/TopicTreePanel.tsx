import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  addTopic,
  getTopics,
  moveTopic,
  renameTopic,
} from "../utils/db/topics";
import type { TopicRecord } from "../utils/db/types";
import { buildTopicGraph } from "../utils/topics/graph";
import "./TopicTreePanel.css";

type TopicNodeData = {
  topic: TopicRecord;
  onRename: (topic: TopicRecord) => void;
  onMove: (topic: TopicRecord) => void;
  isFocused?: boolean;
};

type PositionedTopic = {
  topic: TopicRecord;
  x: number;
  y: number;
};

function computeLayout(topics: TopicRecord[]): PositionedTopic[] {
  const children = new Map<string | null, TopicRecord[]>();
  topics.forEach((topic) => {
    const key = topic.parentId ?? null;
    if (!children.has(key)) children.set(key, []);
    children.get(key)?.push(topic);
  });

  const roots = children.get(null) ?? [];
  const spacingX = 220;
  const spacingY = 140;
  let cursorX = 0;
  const positioned: PositionedTopic[] = [];

  const walk = (topic: TopicRecord, depth: number): number => {
    const kids = children.get(topic.id) ?? [];
    const childCenters = kids.map((kid) => walk(kid, depth + 1));
    let x: number;
    if (childCenters.length > 0) {
      x = childCenters.reduce((sum, val) => sum + val, 0) / childCenters.length;
    } else {
      x = cursorX;
      cursorX += spacingX;
    }
    positioned.push({ topic, x, y: depth * spacingY });
    return x;
  };

  roots.forEach((root) => {
    walk(root, 0);
    // add spacing between separate trees
    cursorX += spacingX;
  });

  // handle disconnected nodes with parents that don't exist
  topics
    .filter(
      (topic) => topic.parentId && !topics.find((t) => t.id === topic.parentId)
    )
    .forEach((topic) => {
      positioned.push({ topic, x: cursorX, y: 0 });
      cursorX += spacingX;
    });

  return positioned;
}

function TopicNode({ data }: NodeProps<TopicNodeData>) {
  const { topic, onMove, onRename, isFocused } = data;
  return (
    <Card
      size="small"
      className="topic-node"
      title={<Typography.Text strong>{topic.name}</Typography.Text>}
      bordered
      style={
        isFocused
          ? {
              boxShadow: "0 0 0 2px #2563eb, 0 0 12px rgba(37,99,235,0.35)",
            }
          : undefined
      }
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Space size={8}>
        <Button
          size="small"
          type="link"
          onClick={(event) => {
            event.stopPropagation();
            onRename(topic);
          }}
        >
          Rename
        </Button>
        <Button
          size="small"
          type="link"
          onClick={(event) => {
            event.stopPropagation();
            onMove(topic);
          }}
        >
          Move
        </Button>
      </Space>
    </Card>
  );
}

const nodeTypes = {
  topicNode: TopicNode,
};

type TopicTreePanelProps = {
  title?: string;
  flowHeight?: number;
  bordered?: boolean;
  focusTopicId?: string | null;
  showOnlySubtree?: boolean;
  onNodeClick?: (topicId: string) => void;
};

function TopicTreePanel({
  title = "Topic Tree",
  flowHeight = 420,
  bordered = true,
  focusTopicId = null,
  showOnlySubtree = false,
  onNodeClick,
}: TopicTreePanelProps) {
  const [topics, setTopics] = useState<TopicRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<TopicRecord | null>(null);
  const [moveTarget, setMoveTarget] = useState<TopicRecord | null>(null);
  const [form] = Form.useForm();
  const [renameForm] = Form.useForm();
  const [moveForm] = Form.useForm();

  const loadTopics = async () => {
    setLoading(true);
    try {
      const records = await getTopics();
      setTopics(records);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load topics";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTopics();
  }, []);

  const filteredTopics = useMemo(() => {
    if (!focusTopicId || !showOnlySubtree) return topics;
    const byParent = new Map<string | null, TopicRecord[]>();
    topics.forEach((t) => {
      const key = t.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)?.push(t);
    });
    const collect = (id: string): TopicRecord[] => {
      const children = byParent.get(id) ?? [];
      return children.flatMap((child) => [child, ...collect(child.id)]);
    };
    const root = topics.find((t) => t.id === focusTopicId);
    if (!root) return topics;
    return [root, ...collect(root.id)];
  }, [focusTopicId, showOnlySubtree, topics]);

  const graph = useMemo(
    () => buildTopicGraph(filteredTopics),
    [filteredTopics]
  );
  const positionedNodes = useMemo(
    () => computeLayout(filteredTopics),
    [filteredTopics]
  );

  const nodes = useMemo<Node<TopicNodeData>[]>(
    () =>
      positionedNodes.map((item) => ({
        id: item.topic.id,
        type: "topicNode",
        position: { x: item.x, y: item.y },
        data: {
          topic: item.topic,
          isFocused: focusTopicId === item.topic.id,
          onRename: (topic) => {
            setRenameTarget(topic);
            renameForm.setFieldsValue({ name: topic.name });
            setRenameModalOpen(true);
          },
          onMove: (topic) => {
            setMoveTarget(topic);
            moveForm.setFieldsValue({ parentId: topic.parentId ?? undefined });
            setMoveModalOpen(true);
          },
        },
      })),
    [positionedNodes, renameForm, moveForm, focusTopicId]
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: false,
      })),
    [graph.edges]
  );

  const topicOptions = useMemo(
    () =>
      [{ value: "", label: "Root" }].concat(
        topics.map((topic) => ({ value: topic.id, label: topic.name }))
      ),
    [topics]
  );

  const handleAddTopic = async () => {
    try {
      const values = await form.validateFields();
      const id = `topic-${crypto.randomUUID()}`;
      await addTopic({
        id,
        name: values.name as string,
        parentId: values.parentId ? (values.parentId as string) : null,
      });
      setAddModalOpen(false);
      form.resetFields();
      await loadTopics();
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to add topic";
      message.error(messageText);
    }
  };

  const handleRenameTopic = async () => {
    if (!renameTarget) return;
    try {
      const values = await renameForm.validateFields();
      await renameTopic(renameTarget.id, values.name as string);
      setRenameModalOpen(false);
      setRenameTarget(null);
      await loadTopics();
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to rename topic";
      message.error(messageText);
    }
  };

  const handleMoveTopic = async () => {
    if (!moveTarget) return;
    try {
      const values = await moveForm.validateFields();
      const parentId = values.parentId ? (values.parentId as string) : null;
      await moveTopic(moveTarget.id, parentId);
      setMoveModalOpen(false);
      setMoveTarget(null);
      await loadTopics();
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to move topic";
      message.error(messageText);
    }
  };

  return (
    <>
      <Card
        title={title}
        extra={
          <Button
            size="small"
            type="primary"
            onClick={() => setAddModalOpen(true)}
          >
            Add Topic
          </Button>
        }
        loading={loading}
        className="topic-tree-panel"
        bordered={bordered}
      >
        <div className="topic-flow-wrapper" style={{ height: flowHeight }}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              nodeTypes={nodeTypes}
              proOptions={{ hideAttribution: true }}
              onNodeClick={(_, node) => onNodeClick?.(node.id)}
            >
              <Background gap={24} />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </Card>

      <Modal
        title="Add Topic"
        open={addModalOpen}
        onOk={handleAddTopic}
        onCancel={() => setAddModalOpen(false)}
        okText="Create"
        className="topic-modal"
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Topic name is required" }]}
          >
            <Input placeholder="Enter topic name" />
          </Form.Item>
          <Form.Item name="parentId" label="Parent topic">
            <Select
              placeholder="Root"
              options={topicOptions}
              allowClear
              showSearch
              popupClassName="topic-modal-dropdown"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Rename Topic"
        open={renameModalOpen}
        onOk={handleRenameTopic}
        onCancel={() => setRenameModalOpen(false)}
        okText="Save"
        className="topic-modal"
      >
        <Form layout="vertical" form={renameForm}>
          <Form.Item
            name="name"
            label="New name"
            rules={[{ required: true, message: "Topic name is required" }]}
          >
            <Input placeholder="Enter topic name" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Move Topic"
        open={moveModalOpen}
        onOk={handleMoveTopic}
        onCancel={() => setMoveModalOpen(false)}
        okText="Move"
        className="topic-modal"
      >
        <Form layout="vertical" form={moveForm}>
          <Form.Item name="parentId" label="New parent">
            <Select
              placeholder="Root"
              options={topicOptions.filter(
                (opt) => opt.value !== (moveTarget?.id ?? "")
              )}
              allowClear
              showSearch
              popupClassName="topic-modal-dropdown"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default TopicTreePanel;
