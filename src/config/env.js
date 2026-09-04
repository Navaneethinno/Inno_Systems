export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "https://innoverse-api.innovitegra.in",
  appName: "Innovitegra Solutions",
  tokenStorageKey: "innovitegra_access_token",
  refreshStorageKey: "innovitegra_refresh_token",
  userStorageKey: "innovitegra_user",

  // POST /system/user/login requires a fixed Basic-auth header on top of the
  // user_name/password body. These identify the *client application*, not
  // the person logging in (per handoff.md: hardcoded to system/123456 on
  // the backend) — still overridable via env if that ever changes.
  systemBasicUser: import.meta.env.VITE_SYSTEM_BASIC_USER ?? "system",
  systemBasicPassword: import.meta.env.VITE_SYSTEM_BASIC_PASSWORD ?? "123456",
};
