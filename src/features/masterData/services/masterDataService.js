import { httpClient } from "../../../api/httpClient";

/**
 * Generic CRUD for everything under /system/master/{type}/*.
 *
 * handoff.md only gives concrete add/edit/delete payloads for module, menu,
 * and menu_action — the list endpoint path/method and the shape of list
 * responses aren't documented for any of them. This assumes the same POST
 * convention as every other endpoint in the spec and a handful of common
 * envelope shapes for the returned rows; verify against a real response
 * once the backend is reachable with real credentials and adjust
 * `extractList` if it doesn't match.
 */
function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export const masterDataService = {
  async list(type, filters = {}) {
    const { data: envelope } = await httpClient.post(`/system/master/${type}/list`, filters);
    return extractList(envelope.data);
  },

  async add(type, payload) {
    const { data: envelope } = await httpClient.post(`/system/master/${type}/add`, payload);
    return envelope.data;
  },

  async edit(type, payload) {
    const { data: envelope } = await httpClient.post(`/system/master/${type}/edit`, payload);
    return envelope.data;
  },

  async remove(type, id) {
    const { data: envelope } = await httpClient.post(`/system/master/${type}/delete`, { id });
    return envelope.data;
  },
};
