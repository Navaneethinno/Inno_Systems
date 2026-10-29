import { httpClient } from "../../../api/httpClient";
import { API } from "../../../api/endpoints";
import { extractOne } from "../../../lib/extractList";

/**
 * What the platform's runtime watch has seen (System_Console.md, Security
 * Events). System login's token only. Every filter is optional: kind,
 * severity, search (subject or detail), from / to (YYYY-MM-DD, inclusive),
 * page, limit (up to 200). Returns { items, total, page, limit, by_severity }.
 */
export const securityService = {
  async listEvents(filters) {
    const { data: envelope } = await httpClient.post(API.SYSTEM.SECURITY.EVENTS, filters);
    return extractOne(envelope.data) ?? { items: [], total: 0, by_severity: {} };
  },
};
