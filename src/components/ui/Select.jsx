import { forwardRef } from "react";
import "./TextField.css";

export const Select = forwardRef(({ label, error, options, placeholder, ...rest }, ref) => {
  return (
    <div className={`tf ${error ? "tf--error" : ""}`}>
      {label && (
        <label className="tf__label" htmlFor={rest.id}>
          {label}
        </label>
      )}
      <div className="tf__control">
        <select ref={ref} className="tf__input tf__select" {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error && <span className="tf__error">{error}</span>}
    </div>
  );
});

Select.displayName = "Select";
