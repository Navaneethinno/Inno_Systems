/**
 * One entry per /master/{type} entity.
 *
 * `writable: true` means add/edit/delete are documented in handoff.md and
 * get a full CRUD page. Everything else only has a confirmed /list
 * endpoint, so it gets a read-only table instead of guessing at write
 * payloads the backend hasn't specified.
 */
export const masterEntities = {
  module: {
    label: "Modules",
    writable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "status", label: "Active", type: "status" },
    ],
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "status", label: "Status", status: true },
    ],
  },
  menu: {
    label: "Menus",
    writable: true,
    fields: [
      { name: "menu_name", label: "Menu name", type: "text", required: true },
      { name: "module_id", label: "Module", type: "select", optionsFrom: "module", required: true },
      {
        name: "parent_menu_id",
        label: "Parent menu",
        type: "select",
        optionsFrom: "menu",
        // Only menus that belong to the module picked above can be a parent.
        dependsOn: "module_id",
        filterBy: (row, values) => String(row.module_id) === String(values.module_id),
      },
      { name: "priority", label: "Priority", type: "number" },
      { name: "status", label: "Active", type: "status" },
    ],
    columns: [
      { key: "id", label: "ID" },
      { key: "menu_name", label: "Name" },
      // The API returns module_name/parent_menu_name directly on the row —
      // fall back to a lookup against the module/menu lists if a given
      // response doesn't include it.
      { key: "module_id", label: "Module", lookup: "module", nameKey: "module_name" },
      { key: "parent_menu_id", label: "Parent Menu", lookup: "menu", nameKey: "parent_menu_name", emptyIfZero: true },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status", status: true },
    ],
  },
  menu_action: {
    label: "Menu Actions",
    writable: true,
    fields: [
      { name: "menu_id", label: "Menu", type: "select", optionsFrom: "menu", required: true },
      { name: "action_id", label: "Action", type: "select", optionsFrom: "action", required: true },
      { name: "priority", label: "Priority", type: "number" },
      { name: "status", label: "Active", type: "status" },
    ],
    columns: [
      { key: "id", label: "ID" },
      { key: "menu_id", label: "Menu", lookup: "menu", nameKey: "menu_name" },
      { key: "action_id", label: "Action", lookup: "action", nameKey: "action_name" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status", status: true },
    ],
  },

  // Read-only reference data — list endpoint only, per handoff.
  institution_type: { label: "Institution Types", writable: false },
  action: { label: "Actions", writable: false },
  channel: { label: "Channels", writable: false },
  country: { label: "Countries", writable: false },
  currency: { label: "Currencies", writable: false },
  ownership: { label: "Ownership Types", writable: false },
  party_type: { label: "Party Types", writable: false },
  status: { label: "Statuses", writable: false },
  acct_prod_type: { label: "Account Product Types", writable: false },
  transaction: { label: "Transactions", writable: false },
  acct_dormancy_action: { label: "Account Dormancy Actions", writable: false },
  acct_operation_mode: { label: "Account Operation Modes", writable: false },
  frequency: { label: "Frequencies", writable: false },
  acct_sequence: { label: "Account Sequences", writable: false },
  residency_type: { label: "Residency Types", writable: false },
  kyc_data_field: { label: "KYC Data Fields", writable: false },
  kyc_process: { label: "KYC Processes", writable: false },
  kyc_document_type: { label: "KYC Document Types", writable: false },
};

export const writableEntityKeys = Object.keys(masterEntities).filter((k) => masterEntities[k].writable);
export const readOnlyEntityKeys = Object.keys(masterEntities).filter((k) => !masterEntities[k].writable);
