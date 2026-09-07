import { httpClient } from "../../../api/httpClient";
import { tokenStore } from "../../../lib/tokenStore";
import { env } from "../../../config/env";
import { extractOne } from "../../../lib/extractList";

/**
 * All auth-related network calls live here. Components and hooks never
 * import axios or httpClient directly — they call these functions.
 *
 * Matches SYSTEM_API_GUIDE.md's /system/user/* contract:
 * - login is Basic-auth (app credentials) + JSON body (user credentials)
 * - refresh is Bearer <refresh_token>, no body
 * - both return the shared envelope, `data` always a one-element array
 */
export const authService = {
  async login({ username, password, rememberMe }) {
    const basicAuth = btoa(`${env.systemBasicUser}:${env.systemBasicPassword}`);

    const { data: envelope } = await httpClient.post(
      "/system/user/login",
      { user_name: username, password },
      { headers: { Authorization: `Basic ${basicAuth}` } }
    );

    const { user_details: userDetails, user_session_info: session, full_access: fullAccess } = extractOne(
      envelope.data
    );

    // user_details has no user_fname/mname/lname — that's a urmg.user field,
    // not admintabdef.User (the login response's table). Map only what's
    // actually present per the guide.
    const user = {
      id: userDetails.id,
      username: userDetails.username,
      profileId: userDetails.profile_id,
      profileName: userDetails.profile_name,
      institutionName: userDetails.inst_profile_name,
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
