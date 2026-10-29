import { Glyph } from "./Glyph";
import "./IconButton.css";

/**
 * Square icon-only button (row edit/delete, close). `label` is the
 * accessible name and tooltip; tone="danger" tints it red on hover.
 */
export function IconButton({ icon, label, tone, size = 16, className = "", ...rest }) {
  return (
    <button
      type="button"
      className={`icon-btn ${tone ? `icon-btn--${tone}` : ""} ${className}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Glyph name={icon} size={size} />
    </button>
  );
}
