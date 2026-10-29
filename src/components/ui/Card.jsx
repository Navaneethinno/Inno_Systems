/**
 * A surface panel. With `title` (and optional `subtitle`/`actions`) it gets
 * a header row and a padded body; without, `padded` pads the whole card.
 * Styles live in src/styles/primitives.css (.card).
 */
export function Card({ title, subtitle, actions, padded = true, className = "", children, as: Tag = "section", ...rest }) {
  const hasHeader = Boolean(title || actions);
  return (
    <Tag className={`card ${!hasHeader && padded ? "card--padded" : ""} ${className}`} {...rest}>
      {hasHeader && (
        <div className="card__header">
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      {hasHeader ? <div className={padded ? "card__body" : undefined}>{children}</div> : children}
    </Tag>
  );
}
