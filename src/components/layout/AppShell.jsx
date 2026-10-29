import { Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
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

function ShellLayout() {
  const { rail, mobileOpen, closeMobile } = useSidebar();

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
