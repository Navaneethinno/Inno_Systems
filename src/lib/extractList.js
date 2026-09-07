/**
 * Per SYSTEM_API_GUIDE.md: every envelope's `data` is *always* a list, even
 * for a single record — empty list if there's nothing. Older captures
 * showed a few other shapes (a bare object, or an object with a
 * `profile_data`/`user_array` key), so those are kept as a defensive
 * fallback in case an endpoint hasn't been updated to match the guide.
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

/** Same envelope, but for endpoints that return a single record — unwraps data[0]. */
export function extractOne(payload) {
  return extractList(payload)[0];
}
