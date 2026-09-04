import { forwardRef, useState } from "react";
import "./TextField.css";

export const TextField = forwardRef(
  ({ label, error, icon, type = "text", ...rest }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const resolvedType = isPassword && showPassword ? "text" : type;

    return (
      <div className={`tf ${error ? "tf--error" : ""}`}>
        <label className="tf__label" htmlFor={rest.id}>
          {label}
        </label>
        <div className="tf__control">
          {icon === "mail" && (
            <svg className="tf__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M2.5 5.5h15a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="m2.5 6 7.5 5 7.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          {icon === "user" && (
            <svg className="tf__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="6.5" r="3.25" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3.5 17c0-3.31 2.91-6 6.5-6s6.5 2.69 6.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          {icon === "lock" && (
            <svg className="tf__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          )}
          <input ref={ref} type={resolvedType} className="tf__input" {...rest} />
          {isPassword && (
            <button
              type="button"
              className="tf__toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M2 10s3-5.5 8-5.5 8 5.5 8 5.5-3 5.5-8 5.5-8-5.5-8-5.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path
                    d="M9.14 4.6C9.42 4.55 9.7 4.5 10 4.5c5 0 8 5.5 8 5.5a13.5 13.5 0 0 1-2.66 3.35M6.5 6.13C4.2 7.5 2 10 2 10s3 5.5 8 5.5c1.3 0 2.47-.36 3.47-.9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
        {error && <span className="tf__error">{error}</span>}
      </div>
    );
  }
);

TextField.displayName = "TextField";
