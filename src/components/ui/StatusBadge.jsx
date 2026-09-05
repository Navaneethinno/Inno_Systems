import "./DataTable.css";

/**
 * The single "Active"/"Inactive" pill used everywhere a row's status is
 * shown — tables, detail views, wherever. Don't hand-roll this inline;
 * import it, so the look can't drift between pages.
 */
export function StatusBadge({ active }) {
  return (
    <span className={`dt__status ${active ? "dt__status--active" : "dt__status--inactive"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}
