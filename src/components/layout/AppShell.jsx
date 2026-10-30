import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { NAVIGATION } from "../../config/navigation";
import { env } from "../../config/env";
import { findTrail } from "../../lib/navTree";
import { SidebarProvider } from "./SidebarProvider";
import { useSidebar } from "./sidebarContext";
import { Sidebar } from "./Sidebar/Sidebar";
import { Topbar } from "./Topbar";
import { PageLoader } from "./PageLoader";
import "./AppShell.css";

export function AppShell() {
  return (
    <SidebarProvider>
      <ShellLayout />
    </SidebarProvider>
  );
}

// The tab title names the current page, from the same tree as the breadcrumbs.
function useDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = findTrail(NAVIGATION, pathname).at(-1)?.label ?? "Page not found";
    document.title = `${page} · System Console · ${env.appName}`;
  }, [pathname]);
}

function ShellLayout() {
  const { rail, mobileOpen, closeMobile } = useSidebar();
  useDocumentTitle();

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && closeMobile();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, closeMobile]);

  const modifiers = [rail && "shell--rail", mobileOpen && "shell--drawer-open"].filter(Boolean).join(" ");

  return (
    <div className={`shell ${modifiers}`}>
      <Sidebar />
      <div className="shell__overlay" onClick={closeMobile} aria-hidden="true" />
      <div className="shell__main">
        <Topbar />
        <main className="shell__content">
          {/* Inside the shell, so the sidebar and topbar stay put while a page's code loads. */}
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
