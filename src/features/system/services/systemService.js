import { httpClient } from "../../../api/httpClient";
import { extractList, extractOne } from "../../../lib/extractList";

/**
 * SYSTEM-gated endpoints. Paths and payload shapes per SYSTEM_API_GUIDE.md
 * (supersedes the earlier handoff docs where they disagree — e.g. profile
 * add/edit live under /system/user/profile/*, not /system/profile/*).
 * Everything here is under /system — the only exception across the whole
 * API is the master-data /list endpoints (see masterDataService.js).
 */
export const systemService = {
  // FLAG: SYSTEM_API_GUIDE.md documents these under /system/user/profile/*,
  // but that path returns the "Config processor is alive" fallback on the
  // deployed API (confirmed live via curl) — /system/profile/* (no /user/
  // segment) is what's actually live there right now. Same pattern as
  // before: the guide describes an environment ahead of what's deployed.
  // Switch these two paths once the backend catches up.
  async addProfile(payload) {
    const { data: envelope } = await httpClient.post("/system/profile/add", payload);
    return extractOne(envelope.data);
  },

  async editProfile(payload) {
    const { data: envelope } = await httpClient.post("/system/profile/edit", payload);
    return extractOne(envelope.data);
  },

  async addUser(payload) {
    const { data: envelope } = await httpClient.post("/system/user/add", payload);
    return extractOne(envelope.data);
  },

  async addInstitution(payload) {
    const { data: envelope } = await httpClient.post("/system/institution/add", payload);
    return extractOne(envelope.data);
  },

  // Batch endpoint: one call assigns N modules to an institution. It's all
  // or nothing server-side (one bad entry fails the whole request), and the
  // response is one row per assigned module, not a single record.
  async addInstitutionModules({ instProfileId, modules }) {
    const { data: envelope } = await httpClient.post("/system/institution/module/add", {
      inst_profile_id: instProfileId,
      modules,
    });
    return extractList(envelope.data);
  },

  // Dropdown sources for institution/profile pickers. Not documented in
  // SYSTEM_API_GUIDE.md, so unlike everything else in this file these are
  // unverified — no /system prefix, confirmed only by an earlier curl check
  // that this path (without prefix) requires auth ("Please log in again")
  // while the /system-prefixed version returns a generic fallback.
  // Re-verify if either endpoint starts behaving oddly.
  async listActiveInstitutions() {
    const { data: envelope } = await httpClient.post("/institution/profile/get_active", { view: "dropdown" });
    return extractList(envelope.data);
  },

  async listProfiles() {
    const { data: envelope } = await httpClient.post("/profile/getall", { view: "dropdown" });
    return extractList(envelope.data);
  },

  // Confirmed live: /institution/module/get_active requires auth ("Please
  // log in again" without a token), matching the /institution/profile/
  // get_active naming pattern — /system/institution/module/* and
  // /institution/module/{getall,list} all fall through to the generic
  // fallback instead. Unlike the other dropdown sources, this one also
  // requires `inst_profile_id` in the request (confirmed live: omitting it
  // returns "Field 'inst_profile_id' is required in request") — it lists
  // modules for one institution, not all institutions' modules at once.
  async listInstitutionModules(instProfileId) {
    const { data: envelope } = await httpClient.post("/institution/module/get_active", {
      view: "dropdown",
      inst_profile_id: instProfileId,
    });
    return extractList(envelope.data);
  },

  // Confirmed live via curl: /user/list requires auth ("Please log in
  // again"), i.e. a real route.
  async listUsers() {
    const { data: envelope } = await httpClient.post("/user/list", { view: "dropdown" });
    return extractList(envelope.data);
  },
};
