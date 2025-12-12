import { Card, Typography } from "antd";

function TopicsPage() {
  return (
    <section className="page">
      <p className="eyebrow">Topics</p>
      <Typography.Title level={1}>Topic Tree</Typography.Title>
      <Typography.Paragraph>
        Placeholder for the topic explorer. Visualize branches, and see
        highlights that belong to multiple nodes to trace connections across
        unrelated subjects.
      </Typography.Paragraph>
      <Card>
        <Typography.Text type="secondary">
          Coming soon: topic graph, tree navigation, and shared highlight view.
        </Typography.Text>
      </Card>
    </section>
  );
}

export default TopicsPage;
