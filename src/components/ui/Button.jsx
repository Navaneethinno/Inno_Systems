import "./Button.css";

export function Button({ loading, fullWidth, children, disabled, className = "", ...rest }) {
  return (
    <button
      className={`btn ${fullWidth ? "btn--full" : ""} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="btn__spinner" aria-hidden="true" />}
      <span className={loading ? "btn__label--loading" : ""}>{children}</span>
    </button>
  );
}
