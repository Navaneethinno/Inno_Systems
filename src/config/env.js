export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1",
  appName: "Innovitegra Solutions",
  tokenStorageKey: "innovitegra_access_token",
  refreshStorageKey: "innovitegra_refresh_token",
};
