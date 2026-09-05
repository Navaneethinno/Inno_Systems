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

    // Real login response (captured live) doesn't carry user_fname/mname/lname
    // on user_details at all — those only ever showed up in handoff.md's
    // sample admintabdef.User shape, not an actual response. Map only the
    // fields that are actually present.
    const user = {
      id: userDetails.id,
      username: userDetails.username,
      profileId: userDetails.profile_id,
      profileName: userDetails.profile_name,
      institutionName: userDetails.institution_name,
      isSystem: userDetails.is_system,
      status: userDetails.status,
      authStatus: userDetails.auth_status,
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
