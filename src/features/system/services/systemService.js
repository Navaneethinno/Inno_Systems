import { httpClient } from "../../../api/httpClient";
import { extractList } from "../../../lib/extractList";

/**
 * SYSTEM-gated endpoints, per handoff.md's sample payloads. Everything
 * here is under /system — the only exception across the whole API is
 * the master-data /list endpoints (see masterDataService.js).
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

  // Dropdown sources for institution/profile pickers. These are named
  // get_active/getall, not /list, so — unlike the master-data /list
  // endpoints — they stay under /system.
  async listActiveInstitutions() {
    const { data: envelope } = await httpClient.post("/system/institution/profile/get_active", { view: "dropdown" });
    return extractList(envelope.data);
  },

  async listProfiles() {
    const { data: envelope } = await httpClient.post("/system/profile/getall", { view: "dropdown" });
    return extractList(envelope.data);
  },
};
