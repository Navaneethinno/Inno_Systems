import { httpClient } from "../../../api/httpClient";
import { API } from "../../../api/endpoints";
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
    const { data: envelope } = await httpClient.post(API.PROFILE.ADD, payload);
    return extractOne(envelope.data);
  },

  async editProfile(payload) {
    const { data: envelope } = await httpClient.post(API.PROFILE.EDIT, payload);
    return extractOne(envelope.data);
  },

  // Confirmed live: works with just profile_id (inst_profile_id is
  // documented as required too — sent when known, doesn't hurt).
  async deleteProfile({ profileId, instProfileId, narration }) {
    const { data: envelope } = await httpClient.post(API.PROFILE.DELETE, {
      profile_id: profileId,
      inst_profile_id: instProfileId,
      del_narration: narration,
    });
    return extractOne(envelope.data);
  },

  async addUser(payload) {
    const { data: envelope } = await httpClient.post(API.USER.ADD, payload);
    return extractOne(envelope.data);
  },

  async editUser(payload) {
    const { data: envelope } = await httpClient.post(API.USER.EDIT, payload);
    return extractOne(envelope.data);
  },

  async deleteUser({ userId, narration }) {
    const { data: envelope } = await httpClient.post(API.USER.DELETE, { user_id: userId, narration });
    return extractOne(envelope.data);
  },

  async addInstitution(payload) {
    const { data: envelope } = await httpClient.post(API.INSTITUTION.ADD, payload);
    return extractOne(envelope.data);
  },

  async editInstitution(payload) {
    const { data: envelope } = await httpClient.post(API.INSTITUTION.EDIT, payload);
    return extractOne(envelope.data);
  },

  async deleteInstitution({ id, narration }) {
    const { data: envelope } = await httpClient.post(API.INSTITUTION.DELETE, { id, narration });
    return extractOne(envelope.data);
  },

  // Batch endpoint: one call assigns N modules to an institution. It's all
  // or nothing server-side (one bad entry fails the whole request), and the
  // response is one row per assigned module, not a single record.
  async addInstitutionModules({ instProfileId, modules }) {
    const { data: envelope } = await httpClient.post(API.INSTITUTION_MODULE.ADD, {
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
    const { data: envelope } = await httpClient.post(API.INSTITUTION_MODULE.EDIT, payload);
    return extractOne(envelope.data);
  },

  async deleteInstitutionModule({ id, narration }) {
    const { data: envelope } = await httpClient.post(API.INSTITUTION_MODULE.DELETE, { id, narration });
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
    const { data: envelope } = await httpClient.post(API.INSTITUTION.GET_ACTIVE, { view: "dropdown" });
    return extractList(envelope.data);
  },

  // Full institution records (code, type, timezone, language, KYC/PIN
  // settings, ...) — confirmed live that get_active's dropdown view strips
  // everything down to {id, name}, so the Institutions table (and edit-form
  // prefill) uses this instead.
  async listInstitutions() {
    const { data: envelope } = await httpClient.post(API.INSTITUTION.LIST, { limit: 1000 });
    return extractList(envelope.data);
  },

  // /profile/getall 404s as of the 2026-09-07 backend redeploy — confirmed
  // live replacement is /user/profile/list.
  async listProfiles() {
    const { data: envelope } = await httpClient.post(API.PROFILE.LIST, { view: "dropdown", limit: 1000 });
    return extractList(envelope.data);
  },

  // The list endpoint above doesn't include menu_actions — confirmed live
  // that /user/profile/get (no /system prefix) does, needed to prefill the
  // Edit form's menu/action checkboxes with what's actually assigned today.
  async getProfile(profileId) {
    const { data: envelope } = await httpClient.post(API.PROFILE.GET, { profile_id: profileId });
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
  // An institution's expiry rules (one settings document): the System user
  // sets only the module subscriptions' grace (days a module keeps working
  // after its end date). Self applies at once.
  async getExpiryRules(instProfileId) {
    const { data: envelope } = await httpClient.post(API.EXPIRY.RULE_GET, { inst_profile_id: instProfileId });
    return extractOne(envelope.data);
  },
  async setModuleGrace(instProfileId, rules, graceDays) {
    const next = rules.map((r) => (r.kind === "MODULE_SUBSCRIPTION" ? { ...r, grace_days: graceDays } : r));
    const { data: envelope } = await httpClient.post(API.EXPIRY.RULE_EDIT, { inst_profile_id: instProfileId, rules: next });
    return { message: envelope.message };
  },

  async listInstitutionModules(instProfileId) {
    // The full records (dates, module_id, statuses): the dropdown view has
    // only id and name. An institution has a handful of modules.
    const { data: envelope } = await httpClient.post(API.INSTITUTION_MODULE.LIST, {
      inst_profile_id: instProfileId,
      page: 1,
      limit: 200,
    });
    return extractList(envelope.data);
  },

  // Confirmed live via curl: /user/list requires auth ("Please log in
  // again"), i.e. a real route.
  async listUsers() {
    const { data: envelope } = await httpClient.post(API.USER.LIST, { view: "dropdown", limit: 1000 });
    return extractList(envelope.data);
  },
};
