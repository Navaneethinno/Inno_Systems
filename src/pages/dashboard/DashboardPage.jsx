import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { NAVIGATION } from "../../config/navigation";
import { Icon } from "../../components/icons/Icon";
import { Glyph } from "../../components/ui/Glyph";
import "./DashboardPage.css";

function greeting(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// A module's pages, flattened (nested groups such as Reference Data list
// their children).
function pagesOf(module) {
  if (module.path) return [{ label: module.label, path: module.path }];
  return (module.items ?? []).flatMap((item) => (item.children ? item.children : [item]));
}

export function DashboardPage() {
  const { user } = useAuth();
  const modules = NAVIGATION.filter((module) => module.id !== "overview");
  const [expanded, setExpanded] = useState({});
  const initials = String(user?.username ?? "?").slice(0, 2).toUpperCase();

  const facts = [
    ["Profile", user?.profileName ?? "—"],
    ["Institution", user?.institutionName ?? "—"],
    ["Last login", user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"],
    ["Access level", user?.fullAccess ? "Full access" : "Restricted"],
  ];

  return (
    <div className="page">
      <section className="dash__hero">
        <div className="dash__hero-glow" aria-hidden="true" />
        <div className="dash__hero-grid" aria-hidden="true" />

        <div className="dash__hero-main">
          <span className="dash__avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="dash__hero-text">
            <span className="dash__badge">Signed in</span>
            <h1 className="dash__title">
              {greeting(new Date().getHours())}, {user?.username}
            </h1>
            <p className="dash__desc">You&apos;re authenticated as a system user. Pick up where you left off below.</p>
          </div>
        </div>

        <dl className="dash__facts">
          {facts.map(([label, value]) => (
            <div key={label} className="dash__fact">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section">
        <div className="dash__section-head">
          <h2 className="section-title">Modules</h2>
          <p className="note">Everything the System Console manages, one click away.</p>
        </div>

        <div className="dash__modules">
          {modules.map((module) => {
            const pages = pagesOf(module);
            const isExpanded = Boolean(expanded[module.id]);
            const shown = isExpanded ? pages : pages.slice(0, 6);
            return (
              <article key={module.id} className="card card--interactive dash__module">
                <Link to={pages[0]?.path ?? "/"} className="dash__module-head">
                  <span className="dash__module-icon">
                    <Icon name={module.icon} size={20} />
                  </span>
                  <span className="dash__module-text">
                    <span className="dash__module-section">{module.section}</span>
                    <span className="dash__module-title">{module.label}</span>
                  </span>
                  <span className="dash__module-count">
                    {pages.length} page{pages.length === 1 ? "" : "s"}
                  </span>
                </Link>
                <ul className="dash__links">
                  {shown.map((page) => (
                    <li key={page.path}>
                      <Link to={page.path} className="dash__link">
                        {page.label}
                        <Glyph name="arrowRight" size={14} className="dash__link-arrow" />
                      </Link>
                    </li>
                  ))}
                  {pages.length > 6 && (
                    <li>
                      <button
                        type="button"
                        className="dash__more"
                        aria-expanded={isExpanded}
                        onClick={() => setExpanded((prev) => ({ ...prev, [module.id]: !isExpanded }))}
                      >
                        {isExpanded ? "Show fewer" : `Show all ${pages.length} pages`}
                      </button>
                    </li>
                  )}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
