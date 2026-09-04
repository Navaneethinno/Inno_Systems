import { httpClient } from "../../../api/httpClient";
import { tokenStore } from "../../../lib/tokenStore";

/**
 * All auth-related network calls live here. Components and hooks never
 * import axios or httpClient directly — they call these functions.
 */
export const authService = {
  async login(payload) {
    const { data } = await httpClient.post("/auth/login", payload);
    tokenStore.setTokens(data.accessToken, payload.rememberMe ? data.refreshToken : undefined);
    return data.user;
  },

  async logout() {
    try {
      await httpClient.post("/auth/logout");
    } finally {
      tokenStore.clear();
    }
  },

  async getCurrentUser() {
    const { data } = await httpClient.get("/auth/me");
    return data;
  },

  isAuthenticated() {
    return Boolean(tokenStore.getAccessToken());
  },
};
