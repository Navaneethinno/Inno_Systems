import { Link } from "react-router-dom";
import logoIcon from "../../../assets/logo-icon.png";
import logoWordmark from "../../../assets/logo-wordmark.png";

export function SidebarBrand() {
  return (
    <Link to="/" className="sidebar-brand" aria-label="Innovitegra System Console — Overview">
      <img src={logoIcon} alt="" className="sidebar-brand__icon" />
      <span className="sidebar-brand__text sidebar__collapsible">
        <img src={logoWordmark} alt="" className="sidebar-brand__wordmark" />
        <span className="sidebar-brand__tag">System Console</span>
      </span>
    </Link>
  );
}
