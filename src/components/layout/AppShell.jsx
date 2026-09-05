import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { masterEntities, writableEntityKeys, readOnlyEntityKeys } from "../../features/masterData/config/masterEntities";
import { systemForms } from "../../features/system/config/systemForms";
import logoIcon from "../../assets/logo-icon.png";
import logoWordmark from "../../assets/logo-wordmark.png";
import "./AppShell.css";

export function AppShell() {
  const { user, logout } = useAuth();
  const [referenceOpen, setReferenceOpen] = useState(false);


  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__logo">
          <img src={logoIcon} alt="" className="shell__logo-icon" />
          <img src={logoWordmark} alt="Innovitegra Solutions" className="shell__logo-word" />
        </div>

        <nav className="shell__nav">
          <NavLink to="/" end className={({ isActive }) => `shell__link ${isActive ? "shell__link--active" : ""}`}>
            Overview
          </NavLink>

          <div className="shell__section-label">Master Data</div>
          {writableEntityKeys.map((key) => (
            <NavLink
              key={key}
              to={`/master/${key}`}
              className={({ isActive }) => `shell__link ${isActive ? "shell__link--active" : ""}`}
            >
              {masterEntities[key].label}
            </NavLink>
          ))}

          <button type="button" className="shell__link shell__link--toggle" onClick={() => setReferenceOpen((v) => !v)}>
            Reference Data
            <span className={`shell__chevron ${referenceOpen ? "shell__chevron--open" : ""}`}>›</span>
          </button>
          {referenceOpen && (
            <div className="shell__submenu">
              {readOnlyEntityKeys.map((key) => (
                <NavLink
                  key={key}
                  to={`/reference/${key}`}
                  className={({ isActive }) => `shell__link shell__link--sub ${isActive ? "shell__link--active" : ""}`}
                >
                  {masterEntities[key].label}
                </NavLink>
              ))}
            </div>
          )}

          <div className="shell__section-label">System</div>
          <NavLink to="/system/profile" className={({ isActive }) => `shell__link ${isActive ? "shell__link--active" : ""}`}>
            Add Profile
          </NavLink>
          <NavLink to="/system/institution" className={({ isActive }) => `shell__link ${isActive ? "shell__link--active" : ""}`}>
            Add Institution
          </NavLink>
          {Object.keys(systemForms).map((key) => (
            <NavLink
              key={key}
              to={`/system/${key}`}
              className={({ isActive }) => `shell__link ${isActive ? "shell__link--active" : ""}`}
            >
              Add {systemForms[key].label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="shell__main">
        <header className="shell__header">
          <span className="shell__user">{user?.username}</span>
          <button type="button" className="shell__logout" onClick={logout}>
            Log out
          </button>
        </header>
        <main className="shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
