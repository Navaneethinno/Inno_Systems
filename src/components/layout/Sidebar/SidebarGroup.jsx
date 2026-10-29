import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "../../icons/Icon";
import { childrenOf, containsPath } from "../../../lib/navTree";
import { useSidebar } from "../sidebarContext";
import { SidebarItem } from "./SidebarItem";

/**
 * A collapsible module (depth 0) or nested group (depth 1). It opens by
 * itself while it holds the current page or a search match; a click by
 * the user wins over that, so a group can still be shut while inside it.
 */
export function SidebarGroup({ node, depth = 0, searching }) {
  const { pathname } = useLocation();
  const { rail, expand } = useSidebar();
  const [manualOpen, setManualOpen] = useState(null);

  const holdsActive = containsPath(node, pathname);
  const isOpen = searching || (manualOpen ?? holdsActive);
  const panelId = `sidebar-group-${node.id}`;

  const handleToggle = () => {
    // On the icon rail the entries are hidden, so a click opens the
    // sidebar with this group showing instead of toggling it unseen.
    if (rail && depth === 0) {
      expand();
      setManualOpen(true);
      return;
    }
    setManualOpen(!isOpen);
  };

  return (
    <div className={`sidebar-group sidebar-group--depth-${depth} ${isOpen ? "sidebar-group--open" : ""}`}>
      <button
        type="button"
        className={`sidebar-group__toggle ${holdsActive ? "sidebar-group__toggle--active" : ""}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        title={node.label}
      >
        <Icon name={node.icon} size={depth === 0 ? 18 : 16} className="sidebar-group__icon" />
        <span className="sidebar-group__label sidebar__collapsible">{node.label}</span>
        <Icon name="chevronRight" size={14} className="sidebar-group__chevron sidebar__collapsible" />
      </button>

      <div id={panelId} className="sidebar-group__panel" inert={!isOpen}>
        <div className="sidebar-group__inner">
          <div className="sidebar-group__list">
            {childrenOf(node).map((child) =>
              childrenOf(child) ? (
                <SidebarGroup key={child.id} node={child} depth={depth + 1} searching={searching} />
              ) : (
                <SidebarItem key={child.path} item={child} depth={depth + 1} />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
