import { httpClient } from "../../../api/httpClient";
import { extractList } from "../../../lib/extractList";

/**
 * CRUD for /system/master/{type}/* and /master/{type}/list.
 *
 * Verified live against the API (curl): add/edit/delete only behave
 * correctly under the /system prefix (/system/master/module/add returns
 * a real "Please log in again" auth response); list is the opposite — it
 * only behaves correctly WITHOUT the prefix (/master/module/list is the
 * real route, /system/master/module/list falls through to an unrelated
 * health-check response). Inconsistent, but that's what the live API does.
 *
 * The list response shape itself still isn't documented — extractList
 * tries a few common envelope shapes; adjust it if a real response
 * doesn't match.
 */
export const masterDataService = {
  // `path` overrides the default /master/{type}/list route for entities
  // that live elsewhere (e.g. password_policy is under /user/, not /master/).
  async list(type, filters = {}, path) {
    const { data: envelope } = await httpClient.post(path ?? `/master/${type}/list`, filters);
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
