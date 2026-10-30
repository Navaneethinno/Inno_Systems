import { AuthStatusBadge } from "../components/ui/AuthStatusBadge";
import { StatusBadge } from "../components/ui/StatusBadge";

/**
 * Shared "Status" column renderer. The API sends up to three status fields
 * on a row: `status` (numeric: 1 Active, 9 Draft, …) with its label
 * `status_name`, which say whether the record is live; and `auth_status`
 * (AUTHORIZED / AUTH WAIT / EDIT_DEAUTH / …), which describes only its
 * latest change. Per the backend, the live state comes from `status`: an
 * institution whose last edit was rejected is still Active. So the badge
 * shows `status_name`, and a latest change that isn't authorized is noted
 * beneath it.
 */
export function renderStatusCell(row) {
  const change = row.auth_status && String(row.auth_status).toUpperCase() !== "AUTHORIZED" ? row.auth_status : null;
  const live = row.status_name ? (
    <AuthStatusBadge value={row.status_name} />
  ) : "status" in row ? (
    <StatusBadge active={Number(row.status) === 1} />
  ) : row.auth_status ? (
    <AuthStatusBadge value={row.auth_status} />
  ) : (
    "—"
  );
  // Skip the note when it only repeats the status (a draft whose change is "DRAFT").
  if (!change || !row.status_name || String(change).toUpperCase() === String(row.status_name).toUpperCase()) return live;
  return (
    <span className="status-stack">
      {live}
      <span className="cell-sub">Last change: {String(change).replace(/_/g, " ").toLowerCase()}</span>
    </span>
  );
}
