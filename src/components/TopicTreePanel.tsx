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
  deleteHighlightRecord,
  getHighlightsByTopic,
  updateHighlightRecord,
} from "../utils/db/highlights";
import {
  addTopic,
  deleteTopic,
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
  onDelete: (topic: TopicRecord) => void;
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
  const { topic, onMove, onRename, onDelete, isFocused } = data;
  return (
    <Card
      size="small"
      className="topic-node"
      title={<Typography.Text strong>{topic.name}</Typography.Text>}
      bordered
      style={
        isFocused
          ? {
              boxShadow: "0 0 0 2px #FF0073, 0 0 12px rgba(255,0,115,0.35)",
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
        <Button
          size="small"
          type="link"
          danger
          onClick={(event) => {
            event.stopPropagation();
            onDelete(topic);
          }}
        >
          Delete
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<TopicRecord | null>(null);
  const [moveTarget, setMoveTarget] = useState<TopicRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TopicRecord | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<{
    hasChildren: boolean;
    childrenCount: number;
    highlightsWithMultipleTopics: number;
    highlightsWithOnlyThisTopic: number;
  } | null>(null);
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
          onDelete: async (topic) => {
            setDeleteTarget(topic);
            // Analyze impact
            const children = topics.filter((t) => t.parentId === topic.id);
            const highlights = await getHighlightsByTopic(topic.id);
            const highlightsWithMultiple = highlights.filter(
              (h) => h.topicIds && h.topicIds.length > 1
            ).length;
            const highlightsWithOnlyThis = highlights.filter(
              (h) => !h.topicIds || h.topicIds.length === 1
            ).length;
            setDeleteImpact({
              hasChildren: children.length > 0,
              childrenCount: children.length,
              highlightsWithMultipleTopics: highlightsWithMultiple,
              highlightsWithOnlyThisTopic: highlightsWithOnlyThis,
            });
            setDeleteModalOpen(true);
          },
        },
      })),
    [positionedNodes, renameForm, moveForm, focusTopicId, topics]
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

  const handleDeleteTopic = async () => {
    if (!deleteTarget || !deleteImpact) return;

    // Check if topic has children - block deletion
    if (deleteImpact.hasChildren) {
      message.error(
        `Cannot delete topic with ${deleteImpact.childrenCount} child topic(s). Please move or delete children first.`
      );
      return;
    }

    try {
      setLoading(true);

      // Get all highlights associated with this topic
      const highlights = await getHighlightsByTopic(deleteTarget.id);

      // Process highlights
      for (const highlight of highlights) {
        if (!highlight.topicIds || highlight.topicIds.length <= 1) {
          // Delete highlight if it only has this topic
          await deleteHighlightRecord(highlight.id);
        } else {
          // Remove topic ID from highlight if it has multiple topics
          const updatedTopicIds = highlight.topicIds.filter(
            (id) => id !== deleteTarget.id
          );
          await updateHighlightRecord({
            ...highlight,
            topicIds: updatedTopicIds,
          });
        }
      }

      // Delete the topic itself
      await deleteTopic(deleteTarget.id);

      message.success(
        `Topic "${deleteTarget.name}" deleted. ${deleteImpact.highlightsWithOnlyThisTopic} highlight(s) removed, ${deleteImpact.highlightsWithMultipleTopics} highlight(s) updated.`
      );

      setDeleteModalOpen(false);
      setDeleteTarget(null);
      setDeleteImpact(null);
      await loadTopics();
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "Failed to delete topic";
      message.error(messageText);
    } finally {
      setLoading(false);
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
              <Background gap={7} />
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

      <Modal
        title="Delete Topic"
        open={deleteModalOpen}
        onOk={handleDeleteTopic}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeleteTarget(null);
          setDeleteImpact(null);
        }}
        okText={deleteImpact?.hasChildren ? "Cannot Delete" : "Delete"}
        okButtonProps={{
          danger: true,
          disabled: deleteImpact?.hasChildren,
        }}
        cancelText="Cancel"
        className="topic-modal"
      >
        {deleteTarget && deleteImpact && (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Typography.Text strong>Topic: {deleteTarget.name}</Typography.Text>

            {deleteImpact.hasChildren ? (
              <Typography.Paragraph type="danger">
                ⚠️ Cannot delete this topic because it has{" "}
                {deleteImpact.childrenCount} child topic(s). Please move or
                delete the children first.
              </Typography.Paragraph>
            ) : (
              <>
                <Typography.Paragraph>
                  This topic is a leaf node and can be deleted. Here's the
                  impact:
                </Typography.Paragraph>

                <Space direction="vertical" size="small">
                  <Typography.Text>
                    <strong>Highlights still accessible:</strong>{" "}
                    {deleteImpact.highlightsWithMultipleTopics} highlight(s)
                    have multiple topics and will remain accessible (this topic
                    will be removed from them).
                  </Typography.Text>

                  <Typography.Text type="danger">
                    <strong>Highlights that will be deleted:</strong>{" "}
                    {deleteImpact.highlightsWithOnlyThisTopic} highlight(s) only
                    have this topic and will be permanently deleted.
                  </Typography.Text>
                </Space>

                {deleteImpact.highlightsWithOnlyThisTopic > 0 && (
                  <Typography.Paragraph type="danger" strong>
                    ⚠️ Warning: {deleteImpact.highlightsWithOnlyThisTopic}{" "}
                    highlight(s) will be permanently deleted. This action cannot
                    be undone.
                  </Typography.Paragraph>
                )}
              </>
            )}
          </Space>
        )}
      </Modal>
    </>
  );
}

export default TopicTreePanel;
