import { Glyph } from "./Glyph";

/**
 * "Nothing here yet" / "pick something first" placeholder. `plain` drops
 * the dashed frame (for use inside a card or table frame).
 * Styles live in src/styles/primitives.css (.empty-state).
 */
export function EmptyState({ icon = "inbox", title, message, action, plain = false }) {
  return (
    <div className={`empty-state ${plain ? "empty-state--plain" : ""}`}>
      {icon && (
        <span className="empty-state__icon">
          <Glyph name={icon} size={22} />
        </span>
      )}
      {title && <p className="empty-state__title">{title}</p>}
      {message && <p className="empty-state__text">{message}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
