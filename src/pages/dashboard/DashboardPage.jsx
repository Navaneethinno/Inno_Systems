import { useAuth } from "../../features/auth/hooks/useAuth";
import "./DashboardPage.css";

export function DashboardPage() {
  const { user } = useAuth();

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username;

  return (
    <div className="dash">
      <div className="dash__card">
        <span className="dash__badge">Signed in</span>
        <h1 className="dash__title">Welcome, {displayName}</h1>
        <p className="dash__desc">You're authenticated as a system user with full access.</p>

        <dl className="dash__meta">
          <div>
            <dt>Username</dt>
            <dd>{user?.username}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd>{user?.id}</dd>
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
