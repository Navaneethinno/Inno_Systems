// Fail loudly at startup rather than silently falling back to a hardcoded
// URL/credential baked into the bundle — every deployment (local, preview,
// prod) must supply its own via .env / the host's env var settings.
function requireEnv(key) {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}. See .env.example.`);
  }
  return value;
}

export const env = {
  apiBaseUrl: requireEnv("VITE_API_BASE_URL"),
  appName: "Innovitegra Solutions",
  tokenStorageKey: "innovitegra_access_token",
  refreshStorageKey: "innovitegra_refresh_token",
  userStorageKey: "innovitegra_user",

  // POST /system/user/login requires a fixed Basic-auth header on top of the
  // user_name/password body — these identify the *client application*, not
  // the person logging in. Per-environment (dev/staging/prod may each issue
  // their own app credentials), so never hardcoded here.
  systemBasicUser: requireEnv("VITE_SYSTEM_BASIC_USER"),
  systemBasicPassword: requireEnv("VITE_SYSTEM_BASIC_PASSWORD"),
};
