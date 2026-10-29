import { httpClient } from "../../../api/httpClient";
import { API } from "../../../api/endpoints";
import { extractList } from "../../../lib/extractList";

/**
 * Expiring Documents across every institution (System login's token). The
 * standard list: tab (all, EXPIRING, IN_GRACE, EXPIRED, VALID), search, page,
 * limit and filters { inst_profile_id, kind, party, within_days }. Each row:
 * { id, inst_profile_name, kind, subject_type, party_name, label, reference
 * (masked), expires_on, days_left, state, action_taken, holds }.
 */
export const expiryService = {
  async listDocuments(body) {
    const { data: envelope } = await httpClient.post(API.EXPIRY.DOCUMENTS_LIST, body);
    return { rows: extractList(envelope.data), pagination: envelope.pagination ?? null };
  },
};
