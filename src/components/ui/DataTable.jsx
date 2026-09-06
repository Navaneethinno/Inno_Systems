import { useMemo, useState } from "react";
import "./DataTable.css";

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
 */
export function DataTable({ columns, rows, actions, isLoading, emptyMessage = "No records found." }) {
  const [sort, setSort] = useState(null); // { key, dir: 1 | -1 }

  const sortedRows = useMemo(() => {
    if (!sort || !rows) return rows;
    return [...rows].sort((a, b) => sort.dir * compareValues(a[sort.key], b[sort.key]));
  }, [rows, sort]);

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
          {sortedRows.map((row, i) => (
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
    </div>
  );
}
