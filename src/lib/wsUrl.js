import { env } from "../config/env";
import { resolveApiPath } from "../api/endpoints";

/**
 * The live-update channels live on the same host as the REST API, just
 * over ws(s) instead of http(s) — see the "Frontend Handoff: Live Menu
 * Updates via WebSocket" doc. `path` is one of the API.LIVE channels: the
 * same resource path REST calls already use, no leading slash; the backend
 * serves "<any-path>/live" generically for every menu/entity.
 */
export function liveChannelUrl(path) {
  const base = env.apiBaseUrl.replace(/^http/, "ws").replace(/\/+$/, "");
  // Same routing rule as REST, so the /config prefix comes from one place.
  const routed = resolveApiPath(`/${path.replace(/^\/+/, "")}`);
  return `${base}${routed}/live`;
}
