import { lazy } from "react";

// Pages are named exports; React.lazy wants a module with a default one.
function lazyPage(load, name) {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}

/**
 * Every page inside the signed-in shell, each loaded on first visit. The
 * fixed /system/* paths outrank /system/:formKey by React Router's route
 * ranking, not by their order here. Sidebar entries for these live in
 * config/navigation.js.
 */
export const SHELL_ROUTES = [
  { path: "/", Component: lazyPage(() => import("../pages/dashboard/DashboardPage"), "DashboardPage") },
  { path: "/master/menu_action", Component: lazyPage(() => import("../features/masterData/components/MenuActionsPage"), "MenuActionsPage") },
  { path: "/master/:entityKey", Component: lazyPage(() => import("../features/masterData/components/MasterCrudPage"), "MasterCrudPage") },
  { path: "/reference/:entityKey", Component: lazyPage(() => import("../features/masterData/components/MasterListPage"), "MasterListPage") },
  { path: "/system/profile", Component: lazyPage(() => import("../features/system/components/ProfileFormPage"), "ProfileFormPage") },
  { path: "/system/institution", Component: lazyPage(() => import("../features/system/components/InstitutionFormPage"), "InstitutionFormPage") },
  {
    path: "/system/institutionModule",
    Component: lazyPage(() => import("../features/system/components/InstitutionModuleFormPage"), "InstitutionModuleFormPage"),
  },
  { path: "/system/:formKey", Component: lazyPage(() => import("../features/system/components/SystemFormPage"), "SystemFormPage") },
  { path: "/system/key-custody", Component: lazyPage(() => import("../features/keys/components/KeyCustodyPage"), "KeyCustodyPage") },
  { path: "/system/monitor", Component: lazyPage(() => import("../features/monitor/components/PlatformMonitorPage"), "PlatformMonitorPage") },
  { path: "/aml/watchlists", Component: lazyPage(() => import("../features/aml/components/WatchlistsPage"), "WatchlistsPage") },
  { path: "/aml/jobs", Component: lazyPage(() => import("../features/aml/components/BackgroundJobsPage"), "BackgroundJobsPage") },
  { path: "/aml/try-name", Component: lazyPage(() => import("../features/aml/components/TryNamePage"), "TryNamePage") },
  { path: "/security/events", Component: lazyPage(() => import("../features/security/components/SecurityEventsPage"), "SecurityEventsPage") },
  { path: "/expiry/documents", Component: lazyPage(() => import("../features/expiry/components/ExpiringDocumentsPage"), "ExpiringDocumentsPage") },
];
