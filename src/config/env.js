export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  appName: "Innovitegra Solutions",
  tokenStorageKey: "innovitegra_access_token",
  refreshStorageKey: "innovitegra_refresh_token",
  userStorageKey: "innovitegra_user",

  // POST /system/user/login requires a fixed Basic-auth header on top of the
  // user_name/password body. These identify the *client application*, not
  // the person logging in — set them via env, never hardcode the real
  // password in source.
  systemBasicUser: import.meta.env.VITE_SYSTEM_BASIC_USER ?? "webadmin",
  systemBasicPassword: import.meta.env.VITE_SYSTEM_BASIC_PASSWORD ?? "",
};
