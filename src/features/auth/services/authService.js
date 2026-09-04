import { httpClient } from "../../../api/httpClient";
import { tokenStore } from "../../../lib/tokenStore";
import { env } from "../../../config/env";

/**
 * All auth-related network calls live here. Components and hooks never
 * import axios or httpClient directly — they call these functions.
 *
 * Matches the /system/user/* contract from handoff.md:
 * - login is Basic-auth (app credentials) + JSON body (user credentials)
 * - refresh is Bearer <refresh_token>, no body
 * - both return the shared ComposeResponseV1 envelope
 */
export const authService = {
  async login({ username, password, rememberMe }) {
    const basicAuth = btoa(`${env.systemBasicUser}:${env.systemBasicPassword}`);

    const { data: envelope } = await httpClient.post(
      "/system/user/login",
      { user_name: username, password },
      { headers: { Authorization: `Basic ${basicAuth}` } }
    );

    const { user_details: userDetails, user_session_info: session, full_access: fullAccess } = envelope.data;

    const user = {
      id: userDetails.id,
      username: userDetails.username,
      firstName: userDetails.user_fname,
      middleName: userDetails.user_mname,
      lastName: userDetails.user_lname,
      isSystem: userDetails.is_system,
      status: userDetails.status,
      fullAccess: fullAccess,
      lastLogin: session.last_login,
    };

    tokenStore.setSession({
      jwtToken: session.jwt_token,
      refreshToken: session.refresh_token,
      user,
      persist: Boolean(rememberMe),
    });

    return user;
  },

  logout() {
    tokenStore.clear();
  },

  getStoredUser() {
    return tokenStore.getUser();
  },

  isAuthenticated() {
    return Boolean(tokenStore.getAccessToken());
  },
};
