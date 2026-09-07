import { httpClient } from "../../../api/httpClient";
import { extractList, extractOne } from "../../../lib/extractList";

/**
 * CRUD for /system/master/{type}/* and /master/{type}.
 *
 * Verified live against the API (curl): add/edit/delete only behave
 * correctly under the /system prefix (/system/master/module/add returns
 * a real "Please log in again" auth response). List used to be
 * /master/{type}/list; confirmed live (2026-09-07) that the backend
 * dropped the /list suffix — every /master/{type}/list now 404s, while
 * plain /master/{type} (list of paths shared by the backend team)
 * returns the real data. Inconsistent with add/edit/delete's shape,
 * but that's what's live.
 *
 * `data` is a list for these endpoints — a one-element array for
 * add/edit/delete, unwrapped here via extractOne.
 */
export const masterDataService = {
  // `path` overrides the default /master/{type} route for entities that
  // live elsewhere (e.g. password_policy is under /user/, not /master/).
  async list(type, filters = {}, path) {
    const { data: envelope } = await httpClient.post(path ?? `/master/${type}`, filters);
    return extractList(envelope.data);
  },

  async add(type, payload) {
    const { data: envelope } = await httpClient.post(`/system/master/${type}/add`, payload);
    return extractOne(envelope.data);
  },

  async edit(type, payload) {
    const { data: envelope } = await httpClient.post(`/system/master/${type}/edit`, payload);
    return extractOne(envelope.data);
  },

  async remove(type, id) {
    const { data: envelope } = await httpClient.post(`/system/master/${type}/delete`, { id });
    return extractOne(envelope.data);
  },
};
