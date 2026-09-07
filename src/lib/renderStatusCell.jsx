import { AuthStatusBadge } from "../components/ui/AuthStatusBadge";
import { StatusBadge } from "../components/ui/StatusBadge";

/**
 * Shared "Status" column renderer for System list pages (Profile,
 * Institution, Institution Module, User). The API sends up to three status
 * fields on the same row: `auth_status` (maker-checker workflow — AUTHORIZED
 * / PENDING_* / REJECTED / DEAUTHORIZED), `status_name` (plain text —
 * confirmed live, e.g. "Active"), and a bare numeric `status`. Prefer
 * `auth_status` when present (it's the most informative — it also captures
 * "Active but pending edit approval", which `status_name` alone can't), then
 * `status_name` from the response, then fall back to the boolean `status`.
 */
export function renderStatusCell(row) {
  if (row.auth_status) return <AuthStatusBadge value={row.auth_status} />;
  if (row.status_name) return <AuthStatusBadge value={row.status_name} />;
  if ("status" in row) return <StatusBadge active={Boolean(row.status)} />;
  return "—";
}
