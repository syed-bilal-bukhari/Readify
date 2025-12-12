import { Button, Result } from "antd";
import { Link } from "react-router-dom";
import { ROUTES } from "../utils/routes";

function NotFoundPage() {
  return (
    <section className="page">
      <Result
        status="404"
        title="Page not found"
        subTitle="We could not find that screen. Use the navigation to continue."
        extra={
          <Button type="primary">
            <Link to={ROUTES.home}>Back to Home</Link>
          </Button>
        }
      />
    </section>
  );
}

export default NotFoundPage;
