import { httpClient } from "../../../api/httpClient";
import { API } from "../../../api/endpoints";
import { extractOne } from "../../../lib/extractList";

/**
 * Usage (System_Console_Usage.md): how each institution's staff use the
 * admin portal: sign-ins, sessions, screens, actions, errors, users and one
 * user's journey. System token only. Every body takes inst_profile_id,
 * user_id, from / to (YYYY-MM-DD, platform time) and include_system; the
 * paged lists take page / limit. Every reply carries the period it covered.
 */
export const usageService = {
  async view(call, body = {}) {
    const { data: envelope } = await httpClient.post(API.SYSTEM.USAGE.call(call), body);
    return extractOne(envelope.data) ?? {};
  },
};
