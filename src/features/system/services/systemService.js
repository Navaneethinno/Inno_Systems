import { httpClient } from "../../../api/httpClient";
import { extractList, extractOne } from "../../../lib/extractList";

/**
 * SYSTEM-gated endpoints. Paths and payload shapes per System_API_Requests.md.
 * Everything here is under /system — the only exception across the whole
 * API is the master-data /master/{type} endpoints (see masterDataService.js).
 *
 * Confirmed live (2026-09-08): institution add/edit/delete moved from
 * /system/institution/* to /system/institution/profile/* — the old
 * /system/institution/add now 404s.
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

  // Confirmed live: works with just profile_id (inst_profile_id is
  // documented as required too — sent when known, doesn't hurt).
  async deleteProfile({ profileId, instProfileId, narration }) {
    const { data: envelope } = await httpClient.post("/system/user/profile/delete", {
      profile_id: profileId,
      inst_profile_id: instProfileId,
      del_narration: narration,
    });
    return extractOne(envelope.data);
  },

  async addUser(payload) {
    const { data: envelope } = await httpClient.post("/system/user/add", payload);
    return extractOne(envelope.data);
  },

  async editUser(payload) {
    const { data: envelope } = await httpClient.post("/system/user/edit", payload);
    return extractOne(envelope.data);
  },

  async deleteUser({ userId, narration }) {
    const { data: envelope } = await httpClient.post("/system/user/delete", { user_id: userId, narration });
    return extractOne(envelope.data);
  },

  async addInstitution(payload) {
    const { data: envelope } = await httpClient.post("/system/institution/profile/add", payload);
    return extractOne(envelope.data);
  },

  async editInstitution(payload) {
    const { data: envelope } = await httpClient.post("/system/institution/profile/edit", payload);
    return extractOne(envelope.data);
  },

  async deleteInstitution({ id, narration }) {
    const { data: envelope } = await httpClient.post("/system/institution/profile/delete", { id, narration });
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

  // Confirmed live: omitting module_id on edit silently zeroes it out on
  // the stored record instead of leaving it unchanged (unlike every other
  // edit endpoint here, where an omitted field keeps its stored value) —
  // always pass the row's current module_id, not just the fields that changed.
  async editInstitutionModule(payload) {
    const { data: envelope } = await httpClient.post("/system/institution/module/edit", payload);
    return extractOne(envelope.data);
  },

  async deleteInstitutionModule({ id, narration }) {
    const { data: envelope } = await httpClient.post("/system/institution/module/delete", { id, narration });
    return extractOne(envelope.data);
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

  // Full institution records (code, type, timezone, language, KYC/PIN
  // settings, ...) — confirmed live that get_active's dropdown view strips
  // everything down to {id, name}, so the Institutions table (and edit-form
  // prefill) uses this instead.
  async listInstitutions() {
    const { data: envelope } = await httpClient.post("/institution/profile/list", { limit: 1000 });
    return extractList(envelope.data);
  },

  // /profile/getall 404s as of the 2026-09-07 backend redeploy — confirmed
  // live replacement is /user/profile/list.
  async listProfiles() {
    const { data: envelope } = await httpClient.post("/user/profile/list", { view: "dropdown", limit: 1000 });
    return extractList(envelope.data);
  },

  // The list endpoint above doesn't include menu_actions — confirmed live
  // that /user/profile/get (no /system prefix) does, needed to prefill the
  // Edit form's menu/action checkboxes with what's actually assigned today.
  async getProfile(profileId) {
    const { data: envelope } = await httpClient.post("/user/profile/get", { profile_id: profileId });
    return extractOne(envelope.data);
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
