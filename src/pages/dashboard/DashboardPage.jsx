import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { masterEntities, writableEntityKeys, readOnlyEntityKeys } from "../../features/masterData/config/masterEntities";
import { systemForms } from "../../features/system/config/systemForms";
import "./DashboardPage.css";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="dash">
      <div className="dash__welcome">
        <span className="dash__badge">Signed in</span>
        <h1 className="dash__title">Welcome, {user?.username}</h1>
        <p className="dash__desc">You're authenticated as a system user with full access.</p>

        <dl className="dash__meta">
          <div>
            <dt>Username</dt>
            <dd>{user?.username}</dd>
          </div>
          <div>
            <dt>Profile</dt>
            <dd>{user?.profileName ?? "—"}</dd>
          </div>
          <div>
            <dt>Institution</dt>
            <dd>{user?.institutionName ?? "—"}</dd>
          </div>
          <div>
            <dt>Last login</dt>
            <dd>{user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : "—"}</dd>
          </div>
          <div>
            <dt>Access level</dt>
            <dd>{user?.fullAccess ? "Full access" : "Restricted"}</dd>
          </div>
        </dl>
      </div>

      <section className="dash__section">
        <h2 className="dash__section-title">Master Data</h2>
        <div className="dash__tiles">
          {writableEntityKeys.map((key) => (
            <Link key={key} to={`/master/${key}`} className="dash__tile">
              <span className="dash__tile-label">{masterEntities[key].label}</span>
              <span className="dash__tile-hint">Add, edit, delete</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dash__section">
        <h2 className="dash__section-title">System</h2>
        <div className="dash__tiles">
          <Link to="/system/profile" className="dash__tile">
            <span className="dash__tile-label">Add Profile</span>
            <span className="dash__tile-hint">Menu &amp; action access</span>
          </Link>
          <Link to="/system/institution" className="dash__tile">
            <span className="dash__tile-label">Add Institution</span>
            <span className="dash__tile-hint">Create new record</span>
          </Link>
          {Object.keys(systemForms).map((key) => (
            <Link key={key} to={`/system/${key}`} className="dash__tile">
              <span className="dash__tile-label">Add {systemForms[key].label}</span>
              <span className="dash__tile-hint">Create new record</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="dash__section">
        <h2 className="dash__section-title">Reference Data</h2>
        <div className="dash__tiles dash__tiles--compact">
          {readOnlyEntityKeys.map((key) => (
            <Link key={key} to={`/reference/${key}`} className="dash__tile dash__tile--compact">
              {masterEntities[key].label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
