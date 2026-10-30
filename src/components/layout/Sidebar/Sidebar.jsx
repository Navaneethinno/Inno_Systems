import { useState } from "react";
import { NAVIGATION } from "../../../config/navigation";
import { env } from "../../../config/env";
import { filterNavigation } from "../../../lib/navTree";
import { useAuth } from "../../../features/auth/hooks/useAuth";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarSearch } from "./SidebarSearch";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarItem } from "./SidebarItem";
import "./Sidebar.css";

export function Sidebar() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const searching = query.trim() !== "";
  const modules = filterNavigation(NAVIGATION, query);

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <SidebarBrand />
      <SidebarSearch value={query} onChange={setQuery} />

      <nav className="sidebar__nav">
        {modules.map((node, i) => (
          <div key={node.id} className="sidebar__entry">
            {node.section !== modules[i - 1]?.section && <div className="sidebar__section">{node.section}</div>}
            {node.items ? <SidebarGroup node={node} searching={searching} /> : <SidebarItem item={node} />}
          </div>
        ))}
        {modules.length === 0 && <p className="sidebar__empty">No pages match “{query.trim()}”.</p>}
      </nav>

      <footer className="sidebar__footer">
        <span className="sidebar__avatar" aria-hidden="true">
          {(user?.username ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <span className="sidebar__footer-text sidebar__collapsible">
          <span className="sidebar__footer-user">{user?.username}</span>
          <span className="sidebar__footer-version">System Console · v{env.appVersion}
            {env.buildCommit && ` (${env.buildCommit})`}
          </span>
        </span>
      </footer>
    </aside>
  );
}
