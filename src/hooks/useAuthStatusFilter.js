import { useMemo, useState } from "react";

const ACTIVE_VALUES = new Set(["AUTHORIZED", "ACTIVE"]);

function rowTimestamp(row) {
  const raw = row.updated_time ?? row.created_time ?? row.last_login;
  const t = raw ? Date.parse(raw) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Whether a row is live, read the same way as renderStatusCell: by
 * `status_name` (the backend: `auth_status` only describes the latest
 * change), falling back to `auth_status` for rows without one.
 */
function statusOf(row) {
  return String(row.status_name ?? row.auth_status ?? "").toUpperCase();
}

export const isActiveRow = (row) => ACTIVE_VALUES.has(statusOf(row));

/**
 * The real API rows carry a maker-checker `auth_status` (AUTHORIZED /
 * PENDING_ADD / PENDING_EDIT / PENDING_DELETE / REJECTED / DEAUTHORIZED —
 * however many raw values the backend uses), but the *filter* only needs
 * three tabs: All, Active (authorized), and Pending (everything else,
 * always sorted latest-first since that's the queue someone has to work
 * through). The raw value itself is still shown as-is in the status
 * column (see AuthStatusBadge) — this hook only simplifies the filter.
 *
 * Returns `hasAuthStatus: false` when no loaded row carries the field
 * (some list endpoints only return {id, name}) — callers should skip
 * rendering the filter/search bar in that case.
 */
export function useAuthStatusFilter(rows) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const hasAuthStatus = rows.some((r) => r.auth_status != null);

  const activeCount = useMemo(() => (hasAuthStatus ? rows.filter(isActiveRow).length : 0), [rows, hasAuthStatus]);
  const pendingCount = hasAuthStatus ? rows.length - activeCount : 0;

  const statusFiltered = useMemo(() => {
    if (!hasAuthStatus || filter === "all") return rows;
    if (filter === "pending") {
      return rows.filter((r) => !isActiveRow(r)).sort((a, b) => rowTimestamp(b) - rowTimestamp(a));
    }
    return rows.filter(isActiveRow);
  }, [rows, filter, hasAuthStatus]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return statusFiltered;
    return statusFiltered.filter((row) =>
      Object.values(row).some((v) => v != null && typeof v !== "object" && String(v).toLowerCase().includes(q))
    );
  }, [statusFiltered, query]);

  return {
    filter,
    setFilter,
    query,
    setQuery,
    filteredRows,
    hasAuthStatus,
    activeCount,
    pendingCount,
    totalCount: rows.length,
  };
}
