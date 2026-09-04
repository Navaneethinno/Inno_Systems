import { httpClient } from "../../../api/httpClient";
import { extractList } from "../../../lib/extractList";

/**
 * SYSTEM-gated creation endpoints, per handoff.md's sample payloads.
 * These stay under /system (confirmed live, unlike the /master/* list
 * endpoints — see masterDataService.js).
 */
export const systemService = {
  async addProfile(payload) {
    const { data: envelope } = await httpClient.post("/system/profile/add", payload);
    return envelope.data;
  },

  async addUser(payload) {
    const { data: envelope } = await httpClient.post("/system/user/add", payload);
    return envelope.data;
  },

  async addInstitution(payload) {
    const { data: envelope } = await httpClient.post("/system/institution/add", payload);
    return envelope.data;
  },

  async addInstitutionModule(payload) {
    const { data: envelope } = await httpClient.post("/system/institution/module/add", payload);
    return envelope.data;
  },

  // Dropdown sources for institution/profile pickers — not under /system,
  // matching the same pattern as the master-data /list endpoints.
  async listActiveInstitutions() {
    const { data: envelope } = await httpClient.post("/institution/profile/get_active", { view: "dropdown" });
    return extractList(envelope.data);
  },

  async listProfiles() {
    const { data: envelope } = await httpClient.post("/profile/getall", { view: "dropdown" });
    return extractList(envelope.data);
  },
};
