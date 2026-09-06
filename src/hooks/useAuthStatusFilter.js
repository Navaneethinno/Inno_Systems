import { useMemo, useState } from "react";

const AUTHORIZED = "AUTHORIZED";

function rowTimestamp(row) {
  const raw = row.updated_time ?? row.created_time ?? row.last_login;
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/**
 * The real API rows carry a maker-checker `auth_status` (AUTHORIZED /
 * PENDING / REJECTED / DEAUTHORIZED — 4 raw values), but the UI only needs
 * to ask "is this live, or does it need attention" — so this collapses
 * that down to two tabs: Active (AUTHORIZED) and Pending (everything else),
 * with Pending always sorted latest-first since that's the queue someone
 * has to work through.
 *
 * Returns `hasAuthStatus: false` when the loaded rows don't carry the field
 * at all (some list endpoints only return {id, name}) — callers should
 * skip rendering the filter tabs in that case rather than show a filter
 * that can never do anything.
 */
export function useAuthStatusFilter(rows) {
  const [filter, setFilter] = useState("active");

  const hasAuthStatus = rows.length > 0 && "auth_status" in rows[0];

  const pendingCount = useMemo(
    () => (hasAuthStatus ? rows.filter((r) => r.auth_status !== AUTHORIZED).length : 0),
    [rows, hasAuthStatus]
  );

  const filteredRows = useMemo(() => {
    if (!hasAuthStatus) return rows;

    if (filter === "pending") {
      return rows.filter((r) => r.auth_status !== AUTHORIZED).sort((a, b) => rowTimestamp(b) - rowTimestamp(a));
    }
    return rows.filter((r) => r.auth_status === AUTHORIZED);
  }, [rows, filter, hasAuthStatus]);

  return { filter, setFilter, filteredRows, hasAuthStatus, pendingCount };
}
