import { Col, Row, Typography } from "antd";
import { useState } from "react";
import SearchByTopicPanel from "../components/SearchByTopicPanel";
import TopicTreePanel from "../components/TopicTreePanel";

function TopicsPage() {
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(null);

  return (
    <section className="page">
      <p className="eyebrow">Topics</p>
      <Typography.Paragraph>
        Manage the full topic hierarchy. Add, rename, or move nodes and explore
        the graph layout.
      </Typography.Paragraph>
      <Row gutter={[16, 16]} style={{ width: "100%" }}>
        <Col xs={24} md={10} lg={8}>
          <SearchByTopicPanel
            title="Search by Topic"
            selectedTopicId={focusedTopicId}
            onTopicSelect={(topicId) => setFocusedTopicId(topicId)}
          />
        </Col>
        <Col xs={24} md={14} lg={16}>
          <TopicTreePanel
            flowHeight={600}
            bordered={false}
            focusTopicId={focusedTopicId ?? undefined}
            onNodeClick={(topicId) => setFocusedTopicId(topicId)}
          />
        </Col>
      </Row>
    </section>
  );
}

export default TopicsPage;
