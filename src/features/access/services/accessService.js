import { httpClient } from "../../../api/httpClient";
import { API } from "../../../api/endpoints";
import { extractList, extractOne } from "../../../lib/extractList";
import { masterDataService } from "../../masterData/services/masterDataService";

/**
 * Access by Location (System_Console_Access_Policy.md): where each
 * institution's portals (ADMIN, CUSTOMER, MERCHANT) may be used from, by
 * country and IP. System token only. A saved policy applies within 30 s;
 * the System user is never refused.
 */
const call = async (verb, body = {}) => {
  const { data: envelope } = await httpClient.post(API.SYSTEM.ACCESS.call(verb), body);
  return envelope.data;
};

export const accessService = {
  list: async () => extractList(await call("list")),
  get: async (instProfileId) => extractOne(await call("get", { inst_profile_id: instProfileId })),
  // Replaces the portal's whole policy: send every list each time.
  save: async (body) => extractOne(await call("save", body)),
  check: async (body) => extractOne(await call("check", body)),
  refusals: async (body) => extractOne(await call("refusals", body)) ?? { items: [], total: 0 },
  geoip: async () => extractOne(await call("geoip")),
  geoipUpdate: async () => extractOne(await call("geoip_update")),
  // ISO alpha-2 codes from the country master list.
  countries: async () =>
    (await masterDataService.list("country"))
      .map((c) => ({ code: c.alpha2_code ?? c.alpha_2_code ?? c.iso2 ?? "", name: c.country_name ?? c.name ?? "" }))
      .filter((c) => c.code)
      .sort((a, b) => a.name.localeCompare(b.name)),
};
