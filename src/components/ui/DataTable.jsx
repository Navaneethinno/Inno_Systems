import { useEffect, useMemo, useState } from "react";
import { Glyph } from "./Glyph";
import { EmptyState } from "./EmptyState";
import "./DataTable.css";

const PAGE_SIZE = 10;
const SKELETON_ROWS = 5;

function compareValues(a, b) {
  const an = Number(a);
  const bn = Number(b);
  if (a != null && b != null && !Number.isNaN(an) && !Number.isNaN(bn) && a !== "" && b !== "") {
    return an - bn;
  }
  return String(a ?? "").localeCompare(String(b ?? ""));
}

// Page buttons to show: always the first and last, the current page and
// one either side, with null marking a gap ("…").
function pageWindow(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}

function SortIcon({ dir }) {
  return (
    <svg className={`dt__sort-icon ${dir ? "dt__sort-icon--active" : ""}`} viewBox="0 0 12 16" width="9" height="12" aria-hidden="true">
      <path d="M6 1.5 10 6H2z" fill="currentColor" opacity={dir === 1 ? 1 : dir ? 0.25 : 0.45} />
      <path d="M6 14.5 2 10h8z" fill="currentColor" opacity={dir === -1 ? 1 : dir ? 0.25 : 0.45} />
    </svg>
  );
}

/**
 * Generic read/write table: `columns` describes what to render,
 * `actions` (optional) renders edit/delete buttons per row.
 *
 * Every column is sortable by its underlying row[col.key] value (click the
 * header to toggle asc/desc) — pass `sortable: false` on a column to opt out.
 *
 * Paginates 10 rows at a time by default, in one of two modes:
 *
 * - **Client mode** (default): `rows` holds the whole dataset and DataTable
 *   slices it into pages of 10 itself.
 * - **Server mode**: pass `page` (the current page number) and `onPageChange`
 *   — `rows` is then treated as just that one page's worth (already fetched
 *   from the API), `pagination` (the API's own
 *   `{ totalRecords, totalPages, currentPage, limit }` envelope field) drives
 *   the page count, and the page buttons call `onPageChange(nextPage)`
 *   instead of paging in place. This is the real pattern for a large
 *   backend-paged list (e.g. Countries/Currencies) instead of fetching
 *   everything up front.
 *
 * Pass `paginate={false}` to render every row on one page instead — used by
 * the "View all" fullscreen modal, whose whole point is showing everything
 * at once. `density="compact"` tightens the row padding.
 *
 * `error` (a load failure's message) replaces the "No records" state with an
 * error state when there are no rows to show, so a failed load never reads
 * as an empty list.
 */
export function DataTable({
  columns,
  rows,
  actions,
  isLoading,
  emptyMessage = "No records found.",
  pagination,
  paginate = true,
  page: controlledPage,
  onPageChange,
  density = "comfortable",
  error,
}) {
  const [sort, setSort] = useState(null); // { key, dir: 1 | -1 }
  const [internalPage, setInternalPage] = useState(1);
  const isServerPaged = typeof onPageChange === "function";
  const page = isServerPaged ? controlledPage : internalPage;

  const sortedRows = useMemo(() => {
    if (!sort || !rows) return rows;
    return [...rows].sort((a, b) => sort.dir * compareValues(a[sort.key], b[sort.key]));
  }, [rows, sort]);

  const totalRecords = pagination?.totalRecords ?? rows?.length ?? 0;
  const totalPages = !paginate
    ? 1
    : isServerPaged
      ? Math.max(1, pagination?.totalPages ?? 1)
      : Math.max(1, Math.ceil((sortedRows?.length ?? 0) / PAGE_SIZE));

  useEffect(() => {
    if (!isServerPaged) setInternalPage(1);
  }, [rows, isServerPaged]);

  const pageRows = useMemo(() => {
    if (!sortedRows) return sortedRows;
    if (!paginate || isServerPaged) return sortedRows; // already just this page's rows
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page, paginate, isServerPaged]);

  const goToPage = (next) => {
    const clamped = Math.min(totalPages, Math.max(1, next));
    if (clamped === page) return;
    if (isServerPaged) onPageChange(clamped);
    else setInternalPage(clamped);
  };

  const toggleSort = (col) => {
    if (col.sortable === false) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 1 };
      if (prev.dir === 1) return { key: col.key, dir: -1 };
      return null;
    });
  };

  const isNarrow = (col) => col.narrow || col.key === "id";

  const head = (
    <thead>
      <tr>
        {columns.map((col) => {
          const isSortable = col.sortable !== false && !isLoading;
          const dir = sort?.key === col.key ? sort.dir : 0;
          return (
            <th
              key={col.key}
              scope="col"
              className={`${isNarrow(col) ? "dt__narrow" : ""} ${isSortable ? "dt__sortable" : ""}`}
              aria-sort={dir === 1 ? "ascending" : dir === -1 ? "descending" : undefined}
              onClick={isSortable ? () => toggleSort(col) : undefined}
            >
              <span className="dt__th-inner">
                {col.label}
                {isSortable && <SortIcon dir={dir} />}
              </span>
            </th>
          );
        })}
        {actions && (
          <th scope="col" className="dt__actions-head">
            Actions
          </th>
        )}
      </tr>
    </thead>
  );

  if (isLoading) {
    return (
      <div className={`dt__frame dt--${density}`} aria-busy="true">
        <div className="dt__scroll">
          <table className="dt">
            {head}
            <tbody>
              {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <tr key={i} className="dt__skeleton-row">
                  {columns.map((col) => (
                    <td key={col.key}>
                      <span className="skeleton dt__skeleton" style={{ width: `${isNarrow(col) ? 40 : 55 + ((i * 17) % 35)}%` }} />
                    </td>
                  ))}
                  {actions && (
                    <td className="dt__actions">
                      <span className="skeleton dt__skeleton dt__skeleton--action" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className={`dt__frame ${error ? "dt__frame--error" : ""}`}>
        {error ? (
          <EmptyState plain icon="alert" title="Couldn't load these records" message={error} />
        ) : (
          <EmptyState plain icon="inbox" message={emptyMessage} />
        )}
      </div>
    );
  }

  const pageSize = isServerPaged ? (pagination?.limit ?? pageRows.length) : PAGE_SIZE;
  const firstShown = paginate ? (page - 1) * pageSize + 1 : 1;
  const lastShown = firstShown + pageRows.length - 1;

  return (
    <div className={`dt__frame dt--${density}`}>
      <div className="dt__scroll">
        <table className="dt">
          {head}
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={row.id ?? i}>
                {columns.map((col) => (
                  <td key={col.key} className={isNarrow(col) ? "dt__narrow" : undefined}>
                    {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                  </td>
                ))}
                {actions && (
                  <td className="dt__actions">
                    <span className="dt__actions-inner">{actions(row)}</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="dt__pagination" aria-label="Pagination">
          <span className="dt__pagination-summary">
            Showing <b>{firstShown.toLocaleString()}</b>–<b>{lastShown.toLocaleString()}</b> of{" "}
            <b>{totalRecords.toLocaleString()}</b> record{totalRecords === 1 ? "" : "s"}
          </span>
          <span className="dt__pagination-controls">
            <button
              type="button"
              className="dt__page-btn dt__page-btn--nav"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              aria-label="Previous page"
            >
              <Glyph name="chevronLeft" size={15} />
              <span className="dt__page-btn-text">Prev</span>
            </button>
            {pageWindow(page, totalPages).map((p, i) =>
              p === null ? (
                <span key={`gap-${i}`} className="dt__page-gap" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`dt__page-btn ${p === page ? "dt__page-btn--current" : ""}`}
                  aria-current={p === page ? "page" : undefined}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              className="dt__page-btn dt__page-btn--nav"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              aria-label="Next page"
            >
              <span className="dt__page-btn-text">Next</span>
              <Glyph name="chevronRight" size={15} />
            </button>
          </span>
        </nav>
      )}
    </div>
  );
}
