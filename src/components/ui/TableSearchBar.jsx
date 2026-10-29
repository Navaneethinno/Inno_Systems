import { Glyph } from "./Glyph";
import "./TableSearchBar.css";

export function TableSearchBar({ value, onChange, placeholder = "Search…", autoFocus }) {
  return (
    <div className="tsb">
      <Glyph name="search" size={16} className="tsb__icon" />
      <input
        type="search"
        className="tsb__input"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="tsb__clear" aria-label="Clear search" onClick={() => onChange("")}>
          <Glyph name="close" size={14} />
        </button>
      )}
    </div>
  );
}
