import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { Icon } from "../icons/Icon";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (user?.username ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="user-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="user-menu__avatar" aria-hidden="true">
          {initial}
        </span>
        <span className="user-menu__name">{user?.username}</span>
        <Icon name="chevronDown" size={14} className={`user-menu__chevron ${open ? "user-menu__chevron--open" : ""}`} />
      </button>

      {open && (
        <div className="user-menu__panel" role="menu">
          <div className="user-menu__head">
            <span className="user-menu__avatar user-menu__avatar--lg" aria-hidden="true">
              {initial}
            </span>
            <span className="user-menu__who">
              <span className="user-menu__who-name">{user?.username}</span>
              <span className="user-menu__who-meta">{user?.profileName ?? "System user"}</span>
              {user?.institutionName && <span className="user-menu__who-meta">{user.institutionName}</span>}
            </span>
          </div>
          <button type="button" role="menuitem" className="user-menu__logout" onClick={logout}>
            <Icon name="logout" size={16} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
