/**
 * Inline banner for an error, success, warning or info message.
 * `action` is an optional { label, onClick } link-button at the end.
 * Styles live in src/styles/primitives.css (.alert).
 */
export function Alert({ tone = "danger", children, action, className = "" }) {
  return (
    <div className={`alert alert--${tone} ${className}`} role={tone === "danger" ? "alert" : "status"}>
      <div className="alert__body">{children}</div>
      {action && (
        <button type="button" className="alert__action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
