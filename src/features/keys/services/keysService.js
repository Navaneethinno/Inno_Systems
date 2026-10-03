import { httpClient } from "../../../api/httpClient";
import { extractOne } from "../../../lib/extractList";

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
};
