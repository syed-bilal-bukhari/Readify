import { Layout as AntLayout } from "antd";
import { Outlet } from "react-router-dom";
import "./Layout.css";
import NavBar from "./NavBar";

function Layout() {
  return (
    <AntLayout className="app-main">
      <NavBar />
      <Outlet />
    </AntLayout>
  );
}

export default Layout;
