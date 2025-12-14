import { Layout as AntLayout } from "antd";
import { Outlet } from "react-router-dom";
import "./Layout.css";
import NavBar from "./NavBar";

const { Content } = AntLayout;

function Layout() {
  return (
    <AntLayout className="app-shell">
      <NavBar />
      <Content className="content">
        <Outlet />
      </Content>
    </AntLayout>
  );
}

export default Layout;
