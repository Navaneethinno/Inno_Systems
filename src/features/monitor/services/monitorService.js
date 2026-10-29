import { httpClient } from "../../../api/httpClient";
import { API } from "../../../api/endpoints";
import { extractOne } from "../../../lib/extractList";

/**
 * Platform Monitor (System_Console_Platform_Monitor.md): how the platform
 * runs, from the figures every processor, the server and the database give
 * once a minute. System login's token only. `view` is one of overview,
 * processors, apis, api, database, database_queries, database_tables,
 * database_activity, server, throughput, stalls, events; the body takes
 * minutes (or from / to), step_minutes, service, route, kind, sort, limit.
 */
export const monitorService = {
  async view(view, body = {}) {
    const { data: envelope } = await httpClient.post(API.SYSTEM.MONITOR.view(view), body);
    return extractOne(envelope.data) ?? {};
  },
};
