import { masterEntities, writableEntityKeys, readOnlyEntityKeys } from "../features/masterData/config/masterEntities";
import { systemForms } from "../features/system/config/systemForms";

/**
 * The console's navigation: the sidebar, its search and the topbar's
 * breadcrumbs all read this one tree. A module is { id, label, icon,
 * section } plus either a `path` (a page of its own) or `items`; an item is
 * { label, path, icon? } or { id, label, icon, children } for a nested
 * group. Icons are names from components/icons/icons.js. Paths must match
 * routes/routeTable.js.
 */

const MASTER_ICONS = { module: "layers", menu: "menu", menu_action: "listChecks" };

// The generic system forms are keyed like their routes (/system/user); only
// the sidebar wording and icon differ from the form's own label.
const SYSTEM_FORM_NAV = { user: { label: "Users", icon: "users" } };

export const NAVIGATION = [
  { id: "overview", section: "General", label: "Overview", icon: "dashboard", path: "/" },
  {
    id: "master",
    section: "Platform",
    label: "Master Data",
    icon: "database",
    items: [
      ...writableEntityKeys.map((key) => ({
        label: masterEntities[key].label,
        path: `/master/${key}`,
        icon: MASTER_ICONS[key],
      })),
      {
        id: "reference",
        label: "Reference Data",
        icon: "book",
        children: readOnlyEntityKeys.map((key) => ({ label: masterEntities[key].label, path: `/reference/${key}` })),
      },
    ],
  },
  {
    id: "system",
    section: "Platform",
    label: "System",
    icon: "server",
    // Ordered to match the real setup workflow: an institution needs
    // modules before it's usable, and a profile needs to exist before a
    // user can be assigned one — see the README's "Setting up a new
    // institution, start to finish" walkthrough.
    items: [
      { label: "Institutions", path: "/system/institution", icon: "building" },
      { label: "Institution Modules", path: "/system/institutionModule", icon: "blocks" },
      { label: "Profiles", path: "/system/profile", icon: "idCard" },
      ...Object.keys(systemForms).map((key) => ({
        label: SYSTEM_FORM_NAV[key]?.label ?? systemForms[key].label,
        path: `/system/${key}`,
        icon: SYSTEM_FORM_NAV[key]?.icon ?? "user",
      })),
      { label: "Key Custody", path: "/system/key-custody", icon: "key" },
      { label: "Platform Monitor", path: "/system/monitor", icon: "activity" },
      { label: "Access by Location", path: "/system/access", icon: "globe" },
    ],
  },
  {
    id: "aml",
    section: "Compliance",
    label: "AML",
    icon: "scan",
    items: [
      { label: "Watchlists", path: "/aml/watchlists", icon: "list" },
      { label: "Background Jobs", path: "/aml/jobs", icon: "timer" },
      { label: "Try a Name", path: "/aml/try-name", icon: "userSearch" },
    ],
  },
  {
    id: "security",
    section: "Compliance",
    label: "Security",
    icon: "shield",
    items: [{ label: "Security Events", path: "/security/events", icon: "alert" }],
  },
  {
    id: "expiry",
    section: "Compliance",
    label: "Expiry",
    icon: "hourglass",
    items: [{ label: "Expiring Documents", path: "/expiry/documents", icon: "fileClock" }],
  },
];
