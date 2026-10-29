/**
 * A metric tile: label, big value, optional hint. tone colours the left
 * edge (ok | warn | bad | info). With onClick it becomes a button;
 * `selected` marks it as the active filter.
 * Styles live in src/styles/primitives.css (.stat-card).
 */
export function StatCard({ label, value, hint, tone, onClick, selected = false }) {
  const Tag = onClick ? "button" : "div";
  const classes = ["stat-card", tone && `stat-card--${tone}`, selected && "stat-card--selected"].filter(Boolean).join(" ");
  return (
    <Tag type={onClick ? "button" : undefined} className={classes} onClick={onClick} aria-pressed={onClick ? selected : undefined}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {hint && <span className="stat-card__hint">{hint}</span>}
    </Tag>
  );
}
