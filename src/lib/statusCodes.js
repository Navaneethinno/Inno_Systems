/**
 * The backend's status codes (round 4 answer). `status` is a record's live
 * state and `process_status` the state of its latest change; both use these
 * codes. `kind` picks the badge colour; `label` is only a fallback, since
 * rows carry the server's own names in status_name / process_status_name.
 */
export const STATUS_CODES = {
  1: { label: "Active", kind: "live" },
  2: { label: "Add waiting for approval", kind: "pending" },
  3: { label: "Edit waiting for approval", kind: "pending" },
  4: { label: "Delete waiting for approval", kind: "pending" },
  5: { label: "Add rejected", kind: "rejected" },
  6: { label: "Edit rejected", kind: "rejected" },
  7: { label: "Delete rejected", kind: "rejected" },
  8: { label: "Deleted", kind: "ended" },
  9: { label: "Draft", kind: "draft" },
  11: { label: "Deactivate waiting for approval", kind: "pending" },
  12: { label: "Deactivate rejected", kind: "rejected" },
  13: { label: "Inactive", kind: "inactive" },
  14: { label: "Reactivate waiting for approval", kind: "pending" },
  15: { label: "Reactivate rejected", kind: "rejected" },
  16: { label: "Pending review", kind: "pending" },
  17: { label: "Rejected", kind: "rejected" },
};

// An edit waiting for approval: a second edit is refused until it's decided.
export const EDIT_WAITING = 3;

// Badge tone (StatusBadge.css) for each kind.
const TONE = { live: "active", pending: "pending", rejected: "rejected", inactive: "inactive", ended: "inactive", draft: "draft" };

export function statusCode(value) {
  const n = Number(value);
  return Number.isInteger(n) && STATUS_CODES[n] ? n : null;
}

/** { label, tone } for a code, or null when it isn't one of the known codes. */
export function describeStatus(code, name) {
  const known = STATUS_CODES[statusCode(code)];
  if (!known) return null;
  return { label: name || known.label, tone: TONE[known.kind] };
}

// While a change waits for approval the backend refuses any other request on
// the record (edit, delete, deactivate, reactivate): workflow.invalid_status.
const WAITING_CODES = new Set([2, 3, 4, 11, 14]);

/** The waiting change's label when `row` has one, else null. */
export function waitingChange(row) {
  const code = statusCode(row?.process_status);
  if (!WAITING_CODES.has(code)) return null;
  return row.process_status_name || STATUS_CODES[code].label;
}
