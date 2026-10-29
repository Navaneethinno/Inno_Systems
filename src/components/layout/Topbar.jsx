import { ThemeToggle } from "../ui/ThemeToggle";
import { Icon } from "../icons/Icon";
import { useSidebar } from "./sidebarContext";
import { PageBreadcrumbs } from "./PageBreadcrumbs";
import { UserMenu } from "./UserMenu";
import "./Topbar.css";

export function Topbar() {
  const { isMobile, rail, mobileOpen, toggleCollapsed, toggleMobile } = useSidebar();
  const expanded = isMobile ? mobileOpen : !rail;

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__nav-toggle"
        onClick={isMobile ? toggleMobile : toggleCollapsed}
        aria-label={expanded ? "Hide navigation" : "Show navigation"}
        aria-expanded={expanded}
        title={expanded ? "Hide navigation" : "Show navigation"}
      >
        <Icon name={isMobile ? "menu" : "sidebar"} />
      </button>

      <PageBreadcrumbs />

      <div className="topbar__actions">
        <ThemeToggle />
        <span className="topbar__divider" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  );
}
