import { useMemo, useState } from "react";
import { DataTable } from "./DataTable";
import "./FullscreenTableModal.css";

function rowMatches(row, query) {
  return Object.values(row).some((v) => {
    if (v == null || typeof v === "object") return false;
    return String(v).toLowerCase().includes(query);
  });
}

/**
 * Full-viewport version of a table: a search box that filters across every
 * raw field on each row (not just what's visibly rendered) plus the same
 * sortable DataTable, so a list with thousands of rows is still scannable —
 * type a few characters instead of scrolling.
 */
export function FullscreenTableModal({ title, columns, rows, actions, onClose }) {
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => rowMatches(row, q));
  }, [rows, query]);

  return (
    <div className="ftm__overlay" onMouseDown={onClose}>
      <div className="ftm__panel" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="ftm__header">
          <div>
            <h2 className="ftm__title">{title}</h2>
            <p className="ftm__count">
              {filteredRows.length} of {rows.length} record{rows.length === 1 ? "" : "s"}
            </p>
          </div>
          <button type="button" className="ftm__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ftm__toolbar">
          <div className="ftm__search">
            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="m17 17-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search all columns…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="ftm__body">
          <DataTable columns={columns} rows={filteredRows} actions={actions} emptyMessage="No matching records." />
        </div>
      </div>
    </div>
  );
}
