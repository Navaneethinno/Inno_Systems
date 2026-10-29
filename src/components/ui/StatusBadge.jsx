import "./StatusBadge.css";

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

/**
 * A status pill in one of the four tones (active | pending | rejected |
 * inactive) with any label — for states that aren't a plain Active/Inactive
 * (job runs, severities, expiry states).
 */
export function TonePill({ tone = "inactive", children }) {
  return <span className={`dt__status dt__status--${tone}`}>{children}</span>;
}
