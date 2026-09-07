import { httpClient } from "../../../api/httpClient";
import { extractList, extractOne } from "../../../lib/extractList";

/**
 * SYSTEM-gated endpoints. Paths and payload shapes per SYSTEM_API_GUIDE.md.
 * Everything here is under /system — the only exception across the whole
 * API is the master-data /master/{type} endpoints (see masterDataService.js).
 *
 * The backend redeployed on 2026-09-07 (confirmed live): profile add/edit
 * moved onto the guide's documented path, /system/profile/* (no /user/
 * segment) now 404s.
 */
export const systemService = {
  async addProfile(payload) {
    const { data: envelope } = await httpClient.post("/system/user/profile/add", payload);
    return extractOne(envelope.data);
  },

  async editProfile(payload) {
    const { data: envelope } = await httpClient.post("/system/user/profile/edit", payload);
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
  // SYSTEM_API_GUIDE.md, confirmed live by curl — no /system prefix.
  //
  // Confirmed live: /user/list and /user/profile/list paginate at
  // limit=10 by default like every /master/{type} call, silently
  // truncating any list past 10 records — pass a high limit so these
  // dropdown/table sources always return everything.
  async listActiveInstitutions() {
    const { data: envelope } = await httpClient.post("/institution/profile/get_active", { view: "dropdown" });
    return extractList(envelope.data);
  },

  // /profile/getall 404s as of the 2026-09-07 backend redeploy — confirmed
  // live replacement is /user/profile/list.
  async listProfiles() {
    const { data: envelope } = await httpClient.post("/user/profile/list", { view: "dropdown", limit: 1000 });
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
    const { data: envelope } = await httpClient.post("/user/list", { view: "dropdown", limit: 1000 });
    return extractList(envelope.data);
  },
};
