import { env } from "../config/env";

/**
 * Thin wrapper around persistence so the storage mechanism can change later
 * without touching the API layer or auth service.
 *
 * "Remember me" writes to localStorage (survives closing the tab); an
 * unchecked login writes to sessionStorage (cleared when the tab closes).
 * Reads check both, since we don't know which one was used at write time.
 */
function read(key) {
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

export const tokenStore = {
  getAccessToken() {
    return read(env.tokenStorageKey);
  },
  getRefreshToken() {
    return read(env.refreshStorageKey);
  },
  getUser() {
    const raw = read(env.userStorageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setSession({ jwtToken, refreshToken, user, persist }) {
    const storage = persist ? localStorage : sessionStorage;
    storage.setItem(env.tokenStorageKey, jwtToken);
    if (refreshToken) storage.setItem(env.refreshStorageKey, refreshToken);
    if (user) storage.setItem(env.userStorageKey, JSON.stringify(user));
  },
  updateTokens({ jwtToken, refreshToken }) {
    const storage = localStorage.getItem(env.tokenStorageKey) ? localStorage : sessionStorage;
    if (jwtToken) storage.setItem(env.tokenStorageKey, jwtToken);
    if (refreshToken) storage.setItem(env.refreshStorageKey, refreshToken);
  },
  clear() {
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(env.tokenStorageKey);
      storage.removeItem(env.refreshStorageKey);
      storage.removeItem(env.userStorageKey);
    }
  },
};
