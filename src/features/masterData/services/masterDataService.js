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
// The backend paginates every /master/{type} (and /user/list-shaped) call
// at limit=10 by default — silently truncating any caller that expects the
// whole table (a dropdown source, or a page that does its own client-side
// paging via DataTable). Request a limit well above any known table's size
// so the full list always comes back in one call.
const FULL_LIST_LIMIT = 1000;

export const masterDataService = {
  // `path` overrides the default /master/{type} route for entities that
  // live elsewhere (e.g. password_policy is under /user/, not /master/).
  async list(type, filters = {}, path) {
    const { data: envelope } = await httpClient.post(path ?? `/master/${type}`, { limit: FULL_LIST_LIMIT, ...filters });
    return extractList(envelope.data);
  },

  // Real server-side pagination — sends { page, limit } as-is (confirmed
  // live: page=2 returns a genuinely different slice, not just a re-sort of
  // the same first page) and returns the API's own pagination envelope
  // ({ totalRecords, totalPages, currentPage, limit }) alongside just that
  // page's rows, for DataTable's server-paged mode (`page`/`onPageChange`).
  async listWithPagination(type, { page = 1, limit = 10 } = {}, path) {
    const { data: envelope } = await httpClient.post(path ?? `/master/${type}`, { page, limit });
    return { rows: extractList(envelope.data), pagination: envelope.pagination };
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
