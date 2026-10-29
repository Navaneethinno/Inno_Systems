import { NavLink } from "react-router-dom";
import { Icon } from "../../icons/Icon";
import { useSidebar } from "../sidebarContext";

/** A page link. Nested entries without an icon get a small dot on the tree line. */
export function SidebarItem({ item, depth = 0 }) {
  const { closeMobile } = useSidebar();

  return (
    <NavLink
      to={item.path}
      end
      title={item.label}
      onClick={closeMobile}
      className={({ isActive }) =>
        ["sidebar-item", `sidebar-item--depth-${depth}`, isActive && "sidebar-item--active"].filter(Boolean).join(" ")
      }
    >
      {item.icon ? (
        <Icon name={item.icon} size={depth === 0 ? 18 : 16} className="sidebar-item__icon" />
      ) : (
        <span className="sidebar-item__dot" aria-hidden="true" />
      )}
      <span className="sidebar-item__label sidebar__collapsible">{item.label}</span>
    </NavLink>
  );
}
