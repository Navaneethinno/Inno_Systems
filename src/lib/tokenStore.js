import { env } from "../config/env";

/**
 * Thin wrapper around persistence so the storage mechanism (localStorage
 * today) can change later without touching the API layer or auth service.
 */
export const tokenStore = {
  getAccessToken() {
    return localStorage.getItem(env.tokenStorageKey);
  },
  getRefreshToken() {
    return localStorage.getItem(env.refreshStorageKey);
  },
  setTokens(accessToken, refreshToken) {
    localStorage.setItem(env.tokenStorageKey, accessToken);
    if (refreshToken) localStorage.setItem(env.refreshStorageKey, refreshToken);
  },
  clear() {
    localStorage.removeItem(env.tokenStorageKey);
    localStorage.removeItem(env.refreshStorageKey);
  },
};
