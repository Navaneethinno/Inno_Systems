import "./DataTable.css";

/**
 * Generic read/write table: `columns` describes what to render,
 * `actions` (optional) renders edit/delete buttons per row.
 */
export function DataTable({ columns, rows, actions, isLoading, emptyMessage = "No records found." }) {
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
            {columns.map((col) => (
              <th key={col.key} className={col.narrow || col.key === "id" ? "dt__narrow" : undefined}>
                {col.label}
              </th>
            ))}
            {actions && <th className="dt__actions-head">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
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
