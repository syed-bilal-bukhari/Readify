import { Space, Typography } from "antd";
import { useState } from "react";
import SearchByTopicPanel from "../components/SearchByTopicPanel";
import TopicTreePanel from "../components/TopicTreePanel";

function TopicsPage() {
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(null);

  return (
    <section className="page">
      <p className="eyebrow">Topics</p>
      <Typography.Title level={1}>Topic Tree</Typography.Title>
      <Typography.Paragraph>
        Manage the full topic hierarchy. Add, rename, or move nodes and explore
        the graph layout.
      </Typography.Paragraph>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <SearchByTopicPanel
          title="Search by Topic"
          selectedTopicId={focusedTopicId}
          onTopicSelect={(topicId) => setFocusedTopicId(topicId)}
        />
        <TopicTreePanel
          flowHeight={600}
          bordered={false}
          focusTopicId={focusedTopicId ?? undefined}
          onNodeClick={(topicId) => setFocusedTopicId(topicId)}
        />
      </Space>
    </section>
  );
}

export default TopicsPage;
