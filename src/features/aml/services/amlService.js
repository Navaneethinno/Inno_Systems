import { httpClient } from "../../../api/httpClient";
import { extractList } from "../../../lib/extractList";

/**
 * System-only AML endpoints (01_System_AML_Watchlists_and_Jobs.md). All
 * POST, all under /aml/system/ — no /config prefix (see httpClient.js).
 * Only the System login's token is accepted; anything else gets 403.
 */
export const amlService = {
  async listWatchlists() {
    const { data: envelope } = await httpClient.post("/aml/system/watchlist/list", {});
    return extractList(envelope.data);
  },

  // Returns { watchlist, loading, message }. `loading: true` means the list
  // had never been loaded and is now loading in the background.
  async setWatchlistEnabled(code, enabled) {
    const { data: envelope } = await httpClient.post("/aml/system/watchlist/set_enabled", { code, enabled });
    return { ...(envelope.data ?? {}), message: envelope.message };
  },

  // No codes → refresh every switched-on list. 202 = started in background.
  async refreshWatchlists(codes) {
    const { data: envelope } = await httpClient.post("/aml/system/watchlist/refresh", codes?.length ? { codes } : {});
    return envelope;
  },

  async listWatchlistVersions(code, limit = 20) {
    const { data: envelope } = await httpClient.post("/aml/system/watchlist/versions", { code, limit });
    return extractList(envelope.data);
  },

  async listJobs() {
    const { data: envelope } = await httpClient.post("/aml/system/job/list", {});
    return extractList(envelope.data);
  },

  // Send either field or both; interval_minutes must be 1–10080.
  async setJob(payload) {
    const { data: envelope } = await httpClient.post("/aml/system/job/set", payload);
    return envelope.data;
  },

  async listRescreenRuns(limit = 20) {
    const { data: envelope } = await httpClient.post("/aml/system/rescreen/runs", { limit });
    return extractList(envelope.data);
  },
};
