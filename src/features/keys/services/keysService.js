import { httpClient } from "../../../api/httpClient";
import { extractList, extractOne } from "../../../lib/extractList";

/**
 * Encryption keys (System only, 3 Oct 2026 handoff). The keys protect PINs,
 * card numbers and card security codes. A key is never shown, only its
 * check value (KCV), which the custodians compare with their records.
 */
export const keysService = {
  // { ready, master_kcv, created, component_waiting, keys: [{ id, purpose,
  //   version, active, kcv, created }], missing: [] }
  async status() {
    const { data: envelope } = await httpClient.post("/system/keys/status", {});
    return extractOne(envelope.data);
  },

  // One of the two master key parts (64 hex characters). The first waits up
  // to 15 minutes for the second; the second completes the ceremony.
  // Returns { component_kcv, complete, master_kcv?, rewrapped_keys,
  // created_keys?, message }.
  async enterComponent(component) {
    const { data: envelope } = await httpClient.post("/system/keys/component", { component });
    return { ...extractOne(envelope.data), message: envelope.message };
  },

  // Makes a new version of a key active; older versions keep working for
  // what they protected. Returns the new key's entry and the message.
  async rotate(purpose) {
    const { data: envelope } = await httpClient.post("/system/keys/rotate", { purpose });
    return { key: extractOne(envelope.data), message: envelope.message };
  },

  // Key custody (System_Console Key Custody handoff). Locks the keys until
  // two custodians unlock them in the admin portal; replies with the status.
  async lock() {
    const { data: envelope } = await httpClient.post("/system/keys/lock", {});
    return { ...extractOne(envelope.data), message: envelope.message };
  },

  // Removes the old storage key file once custodians hold the keys.
  async destroyStorageKey() {
    const { data: envelope } = await httpClient.post("/system/keys/destroy_storage_key", {});
    return { message: envelope.message };
  },

  // Custodians: [{ id, user_id, user_name, inst_profile_name, slot A|B,
  // role PRIMARY|BACKUP, email (masked), narration, added_time }].
  async listCustodians() {
    const { data: envelope } = await httpClient.post("/system/keys/custodian/list", {});
    return extractList(envelope.data);
  },

  // { user_id, slot, role, narration? }
  async addCustodian(body) {
    const { data: envelope } = await httpClient.post("/system/keys/custodian/add", body);
    return { message: envelope.message };
  },

  async removeCustodian(id) {
    const { data: envelope } = await httpClient.post("/system/keys/custodian/remove", { id });
    return { message: envelope.message };
  },

  // The staff users a custodian is picked from, across every institution:
  // [{ user_id, username, inst_profile_name, is_system }]. The System user
  // itself can't be a custodian.
  async listStaffUsers(search = "") {
    const { data: envelope } = await httpClient.post("/user/list", { tab: "active", limit: 100, search });
    return extractList(envelope.data).filter((u) => !u.is_system);
  },

  // Rotation policies: [{ purpose, description, rotate_days, auto_rotate,
  // auto_allowed, active_key, since, due_at, due, last_checked_at, last_rotated_at }].
  async listPolicies() {
    const { data: envelope } = await httpClient.post("/system/keys/policy/list", {});
    return extractList(envelope.data);
  },

  // { purpose, rotate_days 0-3650, auto_rotate }
  async updatePolicy(body) {
    const { data: envelope } = await httpClient.post("/system/keys/policy/update", body);
    return { message: envelope.message };
  },
};
