import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { masterEntities, writableEntityKeys, readOnlyEntityKeys } from "../../features/masterData/config/masterEntities";
import { systemForms } from "../../features/system/config/systemForms";
import { ThemeToggle } from "../ui/ThemeToggle";
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
          <NavLink to="/system/institutionModule" className={({ isActive }) => `shell__link ${isActive ? "shell__link--active" : ""}`}>
            Add Institution Module
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
          <div className="shell__header-brand">
            <img src={logoIcon} alt="" className="shell__header-logo" />
            <span className="shell__header-brand-text">Innovitegra</span>
          </div>

          <span className="shell__brand">
            <span className="shell__brand-system">System</span> <span className="shell__brand-console">Console</span>
          </span>

          <div className="shell__header-right">
            <ThemeToggle />

            <span className="shell__divider" aria-hidden="true" />

            <span className="shell__profile">
              <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true" className="shell__profile-icon">
                <circle cx="10" cy="6.5" r="3.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3.5 17c0-3.31 2.91-6 6.5-6s6.5 2.69 6.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="shell__user">{user?.username}</span>
            </span>

            <button type="button" className="shell__logout" onClick={logout}>
              <svg viewBox="0 0 20 20" fill="none" width="15" height="15" aria-hidden="true">
                <path
                  d="M7.5 17.5h-3a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1h3M13 14l4-4-4-4M17 10H7.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Log out
            </button>
          </div>
        </header>
        <main className="shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
