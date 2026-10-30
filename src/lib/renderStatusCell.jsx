import { AuthStatusBadge } from "../components/ui/AuthStatusBadge";
import { TonePill } from "../components/ui/StatusBadge";
import { describeStatus, statusCode } from "./statusCodes";

/**
 * Shared "Status" column renderer. Per the backend, `status` is the
 * record's live state and `process_status` the state of its latest change,
 * both as the codes in statusCodes.js: the badge is coloured by `status`'s
 * kind and labelled with the server's `status_name`. When the latest change
 * differs (Active with an edit rejected), it's noted underneath, by its
 * `process_status_name`. Rows without a known code fall back to the text.
 */
export function renderStatusCell(row) {
  const live = describeStatus(row.status, row.status_name);
  const badge = live ? (
    <TonePill tone={live.tone}>{live.label}</TonePill>
  ) : row.status_name || row.auth_status ? (
    <AuthStatusBadge value={row.status_name ?? row.auth_status} />
  ) : (
    "—"
  );

  const change = statusCode(row.process_status);
  if (!live || change == null || change === statusCode(row.status)) return badge;
  const changeLabel = describeStatus(change, row.process_status_name).label;
  return (
    <span className="status-stack">
      {badge}
      <span className="cell-sub">Last change: {changeLabel.toLowerCase()}</span>
    </span>
  );
}
