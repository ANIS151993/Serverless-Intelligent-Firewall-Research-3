"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDeferredValue, useEffect, useState } from "react";

import { SuperDataProvider, useSuperData } from "./super-context";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/super/overview", label: "Overview", description: "Global operations" },
  { href: "/super/clients", label: "Clients", description: "Tenant operations" },
  { href: "/super/ai", label: "AI Activity", description: "Model, OSINT, drift" },
  { href: "/super/threats", label: "Threat Intel", description: "Live feed and analytics" },
  { href: "/super/traffic", label: "Traffic", description: "Platform telemetry" },
  { href: "/super/team", label: "Team", description: "Users and audit" },
  { href: "/super/settings", label: "Settings", description: "Runtime configuration" },
];

function themeLabel(theme: "light" | "dark") {
  return theme === "dark" ? "Dark" : "Light";
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, refreshing } = useSuperData();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredQuery = useDeferredValue(searchTerm);

  useEffect(() => {
    const currentTheme =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(currentTheme);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results =
    deferredQuery.trim().length === 0
      ? data.searchIndex.slice(0, 8)
      : data.searchIndex.filter((item) =>
          `${item.title} ${item.description} ${item.category}`
            .toLowerCase()
            .includes(deferredQuery.toLowerCase()),
        );

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("sif-theme", nextTheme);
    setTheme(nextTheme);
  }

  const breadcrumb = NAV_ITEMS.find((item) => pathname.startsWith(item.href))?.label ?? "Overview";

  return (
    <div className="page-shell">
      <aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">SIF</div>
          {!sidebarCollapsed ? (
            <div>
              <div className="brand-title">ASLF-OSINT</div>
              <div className="brand-subtitle">Control Plane</div>
            </div>
          ) : null}
        </div>

        <div className="sidebar-user">
          <div className="avatar-shell">AR</div>
          {!sidebarCollapsed ? (
            <div>
              <div className="sidebar-user-name">Anis Rahman</div>
              <div className="sidebar-user-role">Super Admin</div>
            </div>
          ) : null}
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
              >
                <span className="sidebar-link-icon">{item.label.slice(0, 1)}</span>
                {!sidebarCollapsed ? (
                  <span>
                    <span className="sidebar-link-label">{item.label}</span>
                    <span className="sidebar-link-desc">{item.description}</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="button button-ghost sidebar-toggle"
          onClick={() => setSidebarCollapsed((current) => !current)}
        >
          {sidebarCollapsed ? "Expand" : "Collapse"}
        </button>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div>
            <div className="eyebrow">Super Dashboard</div>
            <div className="topbar-title-row">
              <h1>{breadcrumb}</h1>
              <span className={`status-pill ${data.meta.live ? "tone-success" : "tone-warning"}`}>
                {data.meta.live ? "Live" : "Partial"}
              </span>
            </div>
          </div>

          <div className="topbar-actions">
            <button type="button" className="search-trigger" onClick={() => setSearchOpen(true)}>
              <span>Search clients, IPs, events</span>
              <kbd>Cmd+K</kbd>
            </button>

            <button type="button" className="button button-ghost" onClick={toggleTheme}>
              {themeLabel(theme)}
            </button>

            <button type="button" className="notification-button" onClick={() => setSearchOpen(true)}>
              Alerts
              <span>{data.notifications.length}</span>
            </button>
          </div>
        </header>

        {data.meta.error ? (
          <div className="banner banner-warning">
            <strong>Data fallback active.</strong> {data.meta.error}
          </div>
        ) : null}

        {refreshing ? (
          <div className="sync-bar">
            <span className="status-dot" />
            Refreshing live telemetry
          </div>
        ) : null}

        <main className="content-shell">{children}</main>
      </div>

      {searchOpen ? (
        <div className="command-overlay" onClick={() => setSearchOpen(false)}>
          <div className="command-panel" onClick={(event) => event.stopPropagation()}>
            <div className="command-header">
              <input
                autoFocus
                className="command-input"
                placeholder="Search clients, events, reports, or actions"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <button type="button" className="button button-ghost" onClick={() => setSearchOpen(false)}>
                Close
              </button>
            </div>

            <div className="command-results">
              {results.slice(0, 12).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="command-item"
                  onClick={() => setSearchOpen(false)}
                >
                  <div className="command-item-title">{item.title}</div>
                  <div className="command-item-desc">{item.description}</div>
                  <div className="command-item-category">{item.category}</div>
                </Link>
              ))}
              {results.length === 0 ? (
                <div className="empty-state">
                  <h3>No matching results</h3>
                  <p>Try a client name, IP address, or a quick action like provision.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SuperShell({ children }: { children: React.ReactNode }) {
  return (
    <SuperDataProvider>
      <ShellFrame>{children}</ShellFrame>
    </SuperDataProvider>
  );
}
