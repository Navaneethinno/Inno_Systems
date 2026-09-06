import "./TableSearchBar.css";

export function TableSearchBar({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="tsb">
      <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true">
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path d="m17 17-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
