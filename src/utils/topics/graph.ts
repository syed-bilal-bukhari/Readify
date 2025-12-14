import type { TopicRecord } from "../db/types";

export type TopicGraphNode = {
  id: string;
  name: string;
  parentId: string | null;
};

export type TopicGraphEdge = {
  id: string;
  source: string;
  target: string;
};

export function buildTopicGraph(topics: TopicRecord[]): {
  nodes: TopicGraphNode[];
  edges: TopicGraphEdge[];
} {
  const nodes = topics.map(({ id, name, parentId }) => ({
    id,
    name,
    parentId,
  }));
  const edges = topics
    .filter((topic) => topic.parentId)
    .map((topic) => ({
      id: `edge-${topic.id}`,
      source: topic.parentId as string,
      target: topic.id,
    }));
  return { nodes, edges };
}

export function buildTopicPath(
  topics: TopicRecord[],
  topicId: string
): TopicRecord[] {
  const map = new Map(topics.map((t) => [t.id, t]));
  const path: TopicRecord[] = [];
  let current: TopicRecord | undefined = map.get(topicId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? map.get(current.parentId) : undefined;
  }
  return path;
}

export function formatTopicPath(path: TopicRecord[]): string {
  return path.map((t) => t.name).join(" > ");
}
