import { httpClient } from "../../../api/httpClient";

/**
 * handoff.md documents these as SYSTEM-gated pass-throughs to existing
 * handlers ("use the existing request shape") without giving the actual
 * field names. The payload shapes below are inferred from the
 * `admintabdef.User` fields visible in the login response and from the
 * naming pattern of the master-data endpoints — they are NOT confirmed
 * against the backend. Verify field names with the backend team before
 * relying on these in production.
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
};
