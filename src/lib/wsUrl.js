import { env } from "../config/env";

/**
 * The live-update channels live on the same host as the REST API, just
 * over ws(s) instead of http(s) — see the "Frontend Handoff: Live Menu
 * Updates via WebSocket" doc. `path` is the same resource path REST calls
 * already use (e.g. "master/menu", no leading slash); the backend serves
 * "<any-path>/live" generically for every menu/entity.
 */
export function liveChannelUrl(path) {
  const base = env.apiBaseUrl.replace(/^http/, "ws").replace(/\/+$/, "");
  const clean = path.replace(/^\/+/, "");
  // Same routing rule as REST: everything but master/* sits under /config.
  const routed = clean.startsWith("master") || clean.startsWith("config") ? clean : `config/${clean}`;
  return `${base}/${routed}/live`;
}
