import { useAuth } from "../../features/auth/hooks/useAuth";
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
    </div>
  );
}
