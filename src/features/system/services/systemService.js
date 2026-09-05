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

  // Dropdown sources for institution/profile pickers. Not documented in
  // the captured reference doc, so unlike everything else in this file
  // these are unverified — no /system prefix, confirmed only by an earlier
  // curl check that this path (without prefix) requires auth ("Please log
  // in again") while the /system-prefixed version returns a generic
  // fallback. Re-verify if either endpoint starts behaving oddly.
  async listActiveInstitutions() {
    const { data: envelope } = await httpClient.post("/institution/profile/get_active", { view: "dropdown" });
    return extractList(envelope.data);
  },

  async listProfiles() {
    const { data: envelope } = await httpClient.post("/profile/getall", { view: "dropdown" });
    return extractList(envelope.data);
  },

  // Confirmed live via curl: /institution/module/get_active requires auth
  // ("Please log in again"), matching the /institution/profile/get_active
  // naming pattern — /system/institution/module/* and /institution/module/
  // {getall,list} all fall through to the generic fallback instead.
  async listInstitutionModules() {
    const { data: envelope } = await httpClient.post("/institution/module/get_active", { view: "dropdown" });
    return extractList(envelope.data);
  },
};
