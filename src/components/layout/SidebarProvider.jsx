import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { SidebarContext } from "./sidebarContext";

const STORAGE_KEY = "inno_sidebar_collapsed";
// Keep in step with the drawer breakpoint in AppShell.css / Sidebar.css.
const MOBILE_QUERY = "(max-width: 900px)";

function subscribeMobile(onChange) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isMobileNow() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

// Storage can throw (private mode, blocked site data); the rail then just
// starts expanded and the choice isn't remembered.
function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Not persisted; the in-memory state still applies.
  }
}

/**
 * `rail` is the desktop icon-only sidebar, remembered per browser; below
 * 900px the sidebar is an off-canvas drawer instead (`mobileOpen`), closed
 * on every load so it never covers the page until asked for. The remembered
 * rail choice doesn't apply to the drawer, which always shows labels.
 */
export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useSyncExternalStore(subscribeMobile, isMobileNow);

  const setAndStore = useCallback((next) => {
    setCollapsed(next);
    writeCollapsed(next);
  }, []);

  const value = useMemo(
    () => ({
      isMobile,
      rail: collapsed && !isMobile,
      toggleCollapsed: () => setAndStore(!collapsed),
      expand: () => setAndStore(false),
      mobileOpen: mobileOpen && isMobile,
      toggleMobile: () => setMobileOpen((open) => !open),
      closeMobile: () => setMobileOpen(false),
    }),
    [collapsed, isMobile, mobileOpen, setAndStore]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
