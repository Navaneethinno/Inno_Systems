/**
 * Response shapes for list endpoints aren't consistently documented across
 * the API, so this tries the common ones an envelope's `data` might use.
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
