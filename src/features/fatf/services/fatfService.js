import { httpClient } from "../../../api/httpClient";
import { API } from "../../../api/endpoints";
import { extractList } from "../../../lib/extractList";
import { masterDataService } from "../../masterData/services/masterDataService";

/**
 * FATF lists (System_Console FATF handoff): the countries on the FATF lists,
 * platform-wide, kept current by System after each plenary. System token only.
 */
const call = async (verb, body = {}) => {
  const { data: envelope } = await httpClient.post(API.SYSTEM.FATF.call(verb), body);
  return envelope.data;
};

export const fatfService = {
  list: async () => extractList(await call("list")),
  add: (body) => call("add", body),
  edit: (body) => call("edit", body),
  remove: (id) => call("delete", { id }),
  countries: async () =>
    (await masterDataService.list("country"))
      .map((c) => ({ id: c.id ?? c.country_id, name: c.country_name ?? c.name ?? "" }))
      .filter((c) => c.id != null && c.name)
      .sort((a, b) => a.name.localeCompare(b.name)),
};
