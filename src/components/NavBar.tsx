import { Layout as AntLayout, Button, Menu, Typography } from "antd";
import type { ChangeEvent } from "react";
import { useMemo, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { exportPdfIndex, importPdfIndex } from "../utils/db/backup";
import { ROUTES } from "../utils/routes";
import "./Layout.css";

const { Header } = AntLayout;

const links = [
  { to: ROUTES.home, label: "Home" },
  { to: ROUTES.library, label: "Library" },
  { to: ROUTES.topics, label: "Topics" },
];

function NavBar() {
  const { appName, setSelectedPdfFromFile, setSelectedPdfById } = useApp();
  const location = useLocation();
  const filePickerRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const selectedKey = useMemo(() => {
    const match = [...links]
      .sort((a, b) => b.to.length - a.to.length)
      .find(
        (link) =>
          location.pathname === link.to ||
          location.pathname.startsWith(`${link.to}/`)
      );
    return match?.to ?? ROUTES.home;
  }, [location.pathname]);

  const menuItems = links.map((link) => ({
    key: link.to,
    label: <Link to={link.to}>{link.label}</Link>,
  }));

  const handleExport = async () => {
    const data = await exportPdfIndex();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pdf-index-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    await importPdfIndex(parsed);
    if (parsed.lastPdfId) {
      await setSelectedPdfById(parsed.lastPdfId);
    }
  };

  const handleChoosePdf = () => {
    filePickerRef.current?.click();
  };

  const handlePdfSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await setSelectedPdfFromFile(file);
    // allow selecting same file again
    if (filePickerRef.current) {
      filePickerRef.current.value = "";
    }
  };

  return (
    <Header className="app-header">
      <div className="brand">
        <span className="brand-mark">📘</span>
        <div className="brand-text">
          <Typography.Text strong className="brand-title">
            {appName}
          </Typography.Text>
          <Typography.Text type="secondary" className="brand-subtitle">
            Read → Highlight → Categorize
          </Typography.Text>
        </div>
      </div>
      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        items={menuItems}
        className="nav"
      />
      <div className="header-actions">
        <input
          ref={filePickerRef}
          type="file"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={handlePdfSelected}
        />
        <Button type="primary" onClick={handleChoosePdf} size="middle">
          Load PDF
        </Button>
        <Button onClick={handleExport}>Export Index</Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleImport(file);
              if (importInputRef.current) {
                importInputRef.current.value = "";
              }
            }
          }}
        />
        <Button onClick={() => importInputRef.current?.click()}>
          Import Index
        </Button>
      </div>
    </Header>
  );
}

export default NavBar;
