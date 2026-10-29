import { Icon } from "../../icons/Icon";
import { useSidebar } from "../sidebarContext";

/** Filters every module's pages; on the icon rail it's a button that opens the sidebar. */
export function SidebarSearch({ value, onChange }) {
  const { rail, expand } = useSidebar();

  return (
    <div className="sidebar-search">
      {rail && (
        <button type="button" className="sidebar-search__rail-btn" onClick={expand} title="Search pages" aria-label="Search pages">
          <Icon name="search" />
        </button>
      )}
      <label className="sidebar-search__field sidebar__collapsible">
        <Icon name="search" size={16} className="sidebar-search__icon" />
        <input
          type="search"
          className="sidebar-search__input"
          placeholder="Search pages"
          aria-label="Search pages"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onChange("")}
        />
        {value && (
          <button type="button" className="sidebar-search__clear" onClick={() => onChange("")} aria-label="Clear search">
            <Icon name="close" size={14} />
          </button>
        )}
      </label>
    </div>
  );
}
