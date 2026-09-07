/**
 * SYSTEM_API_GUIDE.md claims every envelope's `data` is always a list, but
 * live testing against the deployed API shows that's not true everywhere —
 * e.g. /system/user/login's `data` is a bare object, not a one-element
 * array. So this stays defensive: unwrap whichever shape actually shows up
 * (a real array, or an object with a `list`/`rows`/`items`/`data`/
 * `profile_data`/`user_array` key).
 */
export function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.profile_data)) return payload.profile_data;
  if (Array.isArray(payload?.user_array)) return payload.user_array;
  return [];
}

/**
 * Same envelope, but for endpoints that return a single record. Handles
 * both the guide's documented shape (`data` is `[record]`) and what's
 * actually live for some endpoints (`data` is the record itself, no array).
 */
export function extractOne(payload) {
  if (Array.isArray(payload)) return payload[0];
  if (payload && typeof payload === "object") return payload;
  return undefined;
}
