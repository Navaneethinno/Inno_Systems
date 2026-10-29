import { Glyph } from "./Glyph";
import "./Button.css";

/**
 * variant: primary | secondary | ghost | danger
 * size: sm | md (default) | lg
 * icon / iconRight: a Glyph name ("plus", "refresh", …) or any node.
 */
export function Button({
  loading,
  fullWidth,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  children,
  disabled,
  className = "",
  ...rest
}) {
  const renderIcon = (value) => (typeof value === "string" ? <Glyph name={value} /> : value);
  const classes = ["btn", `btn--${variant}`, `btn--${size}`, fullWidth && "btn--full", className].filter(Boolean).join(" ");

  return (
    <button className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="btn__spinner" aria-hidden="true" /> : icon && renderIcon(icon)}
      {children != null && children !== false && (
        <span className={`btn__label ${loading ? "btn__label--loading" : ""}`}>{children}</span>
      )}
      {!loading && iconRight && renderIcon(iconRight)}
    </button>
  );
}
