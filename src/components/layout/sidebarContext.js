import { createContext, useContext } from "react";

export const SidebarContext = createContext(null);

/** { isMobile, rail, toggleCollapsed, expand, mobileOpen, toggleMobile, closeMobile } — see SidebarProvider. */
export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
