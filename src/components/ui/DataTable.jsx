import { useEffect, useMemo, useState } from "react";
import "./DataTable.css";

const PAGE_SIZE = 10;

function compareValues(a, b) {
  const an = Number(a);
  const bn = Number(b);
  if (a != null && b != null && !Number.isNaN(an) && !Number.isNaN(bn) && a !== "" && b !== "") {
    return an - bn;
  }
  return String(a ?? "").localeCompare(String(b ?? ""));
}

/**
 * Generic read/write table: `columns` describes what to render,
 * `actions` (optional) renders edit/delete buttons per row.
 *
 * Every column is sortable by its underlying row[col.key] value (click the
 * header to toggle asc/desc) — pass `sortable: false` on a column to opt out.
 *
 * Paginates 10 rows at a time. `pagination` (optional) is the API's own
 * `{ totalRecords, totalPages, currentPage, limit }` envelope field — when
 * given, its `totalRecords` is shown instead of `rows.length` (the two only
 * differ if a caller passed a partial/pre-paged `rows` array).
 */
export function DataTable({ columns, rows, actions, isLoading, emptyMessage = "No records found.", pagination }) {
  const [sort, setSort] = useState(null); // { key, dir: 1 | -1 }
  const [page, setPage] = useState(1);

  const sortedRows = useMemo(() => {
    if (!sort || !rows) return rows;
    return [...rows].sort((a, b) => sort.dir * compareValues(a[sort.key], b[sort.key]));
  }, [rows, sort]);

  const totalRecords = pagination?.totalRecords ?? rows?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil((sortedRows?.length ?? 0) / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const pageRows = useMemo(() => {
    if (!sortedRows) return sortedRows;
    const start = (page - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  const toggleSort = (col) => {
    if (col.sortable === false) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 1 };
      if (prev.dir === 1) return { key: col.key, dir: -1 };
      return null;
    });
  };

  if (isLoading) {
    return <div className="dt__state">Loading…</div>;
  }

  if (!rows || rows.length === 0) {
    return <div className="dt__state">{emptyMessage}</div>;
  }

  return (
    <div className="dt__scroll">
      <table className="dt">
        <thead>
          <tr>
            {columns.map((col) => {
              const isSortable = col.sortable !== false;
              const isSorted = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  className={`${col.narrow || col.key === "id" ? "dt__narrow" : ""} ${isSortable ? "dt__sortable" : ""}`}
                  onClick={isSortable ? () => toggleSort(col) : undefined}
                >
                  <span className="dt__th-inner">
                    {col.label}
                    {isSortable && (
                      <svg
                        className={`dt__sort-icon ${isSorted ? "dt__sort-icon--active" : ""}`}
                        viewBox="0 0 12 16"
                        width="10"
                        height="13"
                        aria-hidden="true"
                      >
                        {(!isSorted || sort.dir === 1) && (
                          <path
                            d="M6 1.5 10 6H2z"
                            fill={isSorted && sort.dir === 1 ? "currentColor" : "currentColor"}
                            opacity={isSorted && sort.dir === 1 ? 1 : 0.4}
                          />
                        )}
                        {(!isSorted || sort.dir === -1) && (
                          <path
                            d="M6 14.5 2 10h8z"
                            fill="currentColor"
                            opacity={isSorted && sort.dir === -1 ? 1 : 0.4}
                          />
                        )}
                      </svg>
                    )}
                  </span>
                </th>
              );
            })}
            {actions && <th className="dt__actions-head">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map((col) => (
                <td key={col.key} className={col.narrow || col.key === "id" ? "dt__narrow" : undefined}>
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

      {totalPages > 1 && (
        <div className="dt__pagination">
          <span className="dt__pagination-summary">
            Page {page} of {totalPages} · {totalRecords} record{totalRecords === 1 ? "" : "s"}
          </span>
          <span className="dt__pagination-controls">
            <button
              type="button"
              className="dt__pagination-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="dt__pagination-btn dt__pagination-btn--primary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
