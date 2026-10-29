import { useState } from "react";
import { DataTable } from "../../../components/ui/DataTable";
import { Modal } from "../../../components/ui/Modal";
import { Select } from "../../../components/ui/Select";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { Dot, LineChart, MiniTable, Panel, Tile, fmtBytes, fmtDuration, fmtMs, fmtNum, fmtPct, fmtTime, useMonitor } from "./monitorShared";

const Err = ({ error }) => (error ? <div className="mdp__error">{error}</div> : null);
const Sql = ({ text }) => <code className="pm__sql">{text || "—"}</code>;
const used = (total, free) => (total ? ((total - free) / total) * 100 : null);
const tone = (pct, warn = 70, bad = 90) => (pct == null ? undefined : pct >= bad ? "bad" : pct >= warn ? "warn" : "ok");

// 1. Overview: tiles, every processor now, and the last day's events.
export function OverviewTab({ onEvents }) {
  const { data, error } = useMonitor("overview", {});
  const s = data?.server ?? {};
  const db = data?.database ?? {};
  const deps = data?.dependencies ?? [];
  const memPct = used(s.mem_total_bytes, s.mem_avail_bytes);
  const diskPct = used(s.disk_total_bytes, s.disk_free_bytes);
  const dbPct = db.max_connections ? (db.connections / db.max_connections) * 100 : null;
  const columns = [
    { key: "service", label: "Processor", render: (p) => (
        <span className="pm__nowrap">
          <Dot up={p.up} /> {p.service}
          {p.stuck > 0 && <span className="pm__badge pm__badge--bad">{p.stuck} stuck</span>}
        </span>
      ) },
    { key: "uptime_seconds", label: "Uptime", render: (p) => fmtDuration(p.uptime_seconds) },
    { key: "version", label: "Version", render: (p) => <span className="pm__muted">{p.version ?? "—"}</span> },
    { key: "cpu_pct", label: "CPU", render: (p) => fmtPct(p.cpu_pct, 2) },
    { key: "rss_bytes", label: "Memory", render: (p) => fmtBytes(p.rss_bytes) },
    { key: "goroutines", label: "Goroutines", render: (p) => fmtNum(p.goroutines) },
    { key: "db_in_use", label: "DB pool", render: (p) => `${fmtNum(p.db_in_use)} / ${fmtNum(p.db_max_open)}` },
    { key: "requests_5m", label: "Calls 5 min", render: (p) => fmtNum(p.requests_5m) },
    { key: "err_5xx_5m", label: "Errors 5 min", render: (p) => <span className={p.err_5xx_5m ? "pm__bad" : undefined}>{fmtNum((p.err_4xx_5m ?? 0) + (p.err_5xx_5m ?? 0))}{p.err_5xx_5m ? ` (${p.err_5xx_5m} 5xx)` : ""}</span> },
    { key: "p95_ms_5m", label: "p95", render: (p) => fmtMs(p.p95_ms_5m) },
    { key: "restarts_24h", label: "Restarts 24 h", render: (p) => <span className={p.restarts_24h ? "pm__warn" : undefined}>{fmtNum(p.restarts_24h)}</span> },
  ];
  return (
    <>
      <Err error={error} />
      {data && data.collected === false && <div className="mdp__error">The platform hasn&apos;t collected any figures yet.</div>}
      <div className="pm__tiles">
        <Tile label="Processors up" value={data ? `${fmtNum(data.processors_up)} / ${fmtNum(data.processors_total)}` : "…"} tone={data ? (data.processors_up < data.processors_total ? "bad" : "ok") : undefined} />
        <Tile label="Server CPU" value={fmtPct(s.cpu_pct)} hint={s.cpus ? `${s.cpus} CPUs · load ${fmtNum(s.load1, 2)}` : undefined} tone={tone(s.cpu_pct)} />
        <Tile label="Memory used" value={fmtPct(memPct, 0)} hint={s.mem_total_bytes ? `${fmtBytes(s.mem_total_bytes - s.mem_avail_bytes)} of ${fmtBytes(s.mem_total_bytes)}` : undefined} tone={tone(memPct, 80, 92)} />
        <Tile label="Disk used" value={fmtPct(diskPct, 0)} hint={s.disk_total_bytes ? `${fmtBytes(s.disk_free_bytes)} free` : undefined} tone={tone(diskPct, 80, 92)} />
        <Tile label="DB connections" value={`${fmtNum(db.connections)} / ${fmtNum(db.max_connections)}`} hint={`${fmtNum(db.active)} active · ${fmtNum(db.waiting_on_lock)} waiting on a lock`} tone={tone(dbPct)} />
        {deps.map((d) => (
          <Tile key={d.dependency} label={d.dependency === "elasticsearch" ? "Elasticsearch" : d.dependency === "redis" ? "Redis" : d.dependency} value={d.status === "up" ? "Up" : d.status ?? "—"} hint={fmtMs(d.latency_ms)} tone={d.status === "up" ? "ok" : "bad"} />
        ))}
      </div>
      <Panel title="Events in the last 24 hours" hint="Click one to see it in Deadlocks & Stalls.">
        <div className="pm__chips">
          {(data?.events_24h ?? []).length === 0 && <span className="pm__muted">None.</span>}
          {(data?.events_24h ?? []).map((e) => (
            <button key={e.kind} type="button" className="pm__chip" onClick={() => onEvents(e.kind)}>
              <b>{e.kind}</b> ×{fmtNum(e.count)} <span className="pm__muted">· last {fmtTime(e.last_at)}</span>
            </button>
          ))}
        </div>
      </Panel>
      <DataTable columns={columns} rows={data?.processors} isLoading={!data} paginate={false} emptyMessage="No processors reported." />
    </>
  );
}

// 2. Processors: one processor's figures over time and its live state.
export function ProcessorsTab({ period, services }) {
  const [service, setService] = useState("");
  const pick = service || services[0] || "";
  const { data, error } = useMonitor("processors", { ...period, service: pick }, { enabled: Boolean(pick) });
  const p = (data?.processors ?? []).find((x) => x.service === pick) ?? data?.processors?.[0];
  const live = p?.live ?? {};
  return (
    <>
      <Err error={error} />
      <div className="pm__filters">
        <Select label="Processor" value={pick} onChange={(e) => setService(e.target.value)} options={services.map((s) => ({ value: s, label: s }))} />
      </div>
      {live.figures_error && <div className="mdp__error">It answers its health check but not its figures: {live.figures_error}</div>}
      <div className="pm__grid">
        <Panel title="CPU">
          <LineChart rows={p?.series} lines={[{ key: "cpu_pct", label: "CPU %" }]} format={(v) => fmtPct(v, 2)} />
        </Panel>
        <Panel title="Memory">
          <LineChart rows={p?.series} lines={[{ key: "rss_bytes", label: "Resident" }, { key: "heap_bytes", label: "Heap" }]} format={fmtBytes} />
        </Panel>
        <Panel title="Goroutines" hint="A line that keeps rising points to a leak.">
          <LineChart rows={p?.series} lines={[{ key: "goroutines", label: "Goroutines" }, { key: "threads", label: "Threads" }]} />
        </Panel>
        <Panel title="Calls and errors">
          <LineChart rows={p?.series} lines={[{ key: "requests", label: "Calls" }, { key: "err_4xx", label: "4xx" }, { key: "err_5xx", label: "5xx" }]} />
        </Panel>
        <Panel title="Latency">
          <LineChart rows={p?.series} lines={[{ key: "avg_ms", label: "Average" }, { key: "health_ms", label: "Health check" }]} format={fmtMs} />
        </Panel>
        <Panel title="DB pool" hint="Waits above 0 mean the pool is too small.">
          <LineChart rows={p?.series} lines={[{ key: "db_in_use", label: "In use" }, { key: "db_open", label: "Open" }, { key: "db_max_open", label: "Max" }, { key: "db_waits", label: "Waits" }]} />
        </Panel>
      </div>
      {p && !live.figures_error && (
        <div className="pm__grid">
          <Panel title="Now" hint={`Read ${fmtTime(p.live_at)}`}>
            <dl className="pm__facts">
              {[
                ["Version", live.version],
                ["PID", live.pid],
                ["Started", fmtTime(live.started_at)],
                ["In flight", fmtNum(live.in_flight)],
                ["Live-update streams", fmtNum(live.streams)],
                ["Served since start", fmtNum(live.served)],
                ["Goroutines", fmtNum(live.runtime?.goroutines)],
                ["Heap", fmtBytes(live.runtime?.heap_alloc_bytes)],
                ["GC pause total", fmtMs(live.runtime?.gc_pause_total_ms)],
                ["Open files", fmtNum(live.process?.open_files)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Connection pools" hint="Since the processor started.">
            <MiniTable
              rows={live.pools}
              columns={[
                { key: "name", label: "Pool" },
                { key: "in_use", label: "In use", num: true, render: (r) => `${fmtNum(r.in_use)} / ${fmtNum(r.max_open)}` },
                { key: "idle", label: "Idle", num: true },
                { key: "wait_count", label: "Waits", num: true, render: (r) => <span className={r.wait_count ? "pm__warn" : undefined}>{fmtNum(r.wait_count)}</span> },
                { key: "wait_ms", label: "Wait time", num: true, render: (r) => fmtMs(r.wait_ms) },
              ]}
            />
          </Panel>
          <Panel title="Lock contention">
            <MiniTable rows={live.contention} columns={[{ key: "func", label: "Function" }, { key: "where", label: "Where" }, { key: "count", label: "Count", num: true }, { key: "share_pct", label: "Share", num: true, render: (r) => fmtPct(r.share_pct) }]} empty="No contention." />
          </Panel>
          <Panel title="Stuck calls" hint="Calls running over 30 s.">
            <MiniTable rows={Array.isArray(live.stuck) ? live.stuck : []} columns={[{ key: "route", label: "Route" }, { key: "seconds", label: "Running", num: true, render: (r) => fmtDuration(r.seconds ?? r.running_seconds) }]} empty="None." />
          </Panel>
        </div>
      )}
    </>
  );
}

const API_SORTS = [
  ["slowest", "Slowest (p95)"],
  ["busiest", "Busiest"],
  ["errors", "Most errors"],
  ["total_time", "Most total time"],
  ["slower", "Got slower"],
];

// One route: its calls over time, slow calls and the SQL it ran most.
function RouteDetail({ route, period, onClose }) {
  const { data, error } = useMonitor("api", { ...period, route });
  return (
    <Modal title={route} onClose={onClose} width={960}>
      <Err error={error} />
      <div className="pm__grid">
        <Panel title="Calls and errors">
          <LineChart rows={data?.series} lines={[{ key: "calls", label: "Calls" }, { key: "err_4xx", label: "4xx" }, { key: "err_5xx", label: "5xx" }]} />
        </Panel>
        <Panel title="Latency">
          <LineChart rows={data?.series} lines={[{ key: "avg_ms", label: "Average" }, { key: "max_ms", label: "Slowest" }]} format={fmtMs} />
        </Panel>
      </div>
      <Panel title="SQL it ran most">
        <MiniTable rows={data?.queries} columns={[{ key: "shape", label: "Statement", render: (r) => <Sql text={r.shape} /> }, { key: "runs", label: "Runs", num: true, render: (r) => fmtNum(r.runs) }, { key: "total_ms", label: "Total", num: true, render: (r) => fmtMs(r.total_ms) }, { key: "max_ms", label: "Slowest", num: true, render: (r) => fmtMs(r.max_ms) }]} empty="No SQL recorded." />
      </Panel>
      <Panel title="Slow calls" hint="Over 1 s.">
        <MiniTable rows={data?.slow_calls} columns={[{ key: "at", label: "When", render: (r) => fmtTime(r.at) }, { key: "service", label: "Processor" }, { key: "ms", label: "Took", num: true, render: (r) => fmtMs(r.ms) }, { key: "status", label: "Status", render: (r) => r.status ?? r.detail?.status ?? "—" }]} empty="None in this period." />
      </Panel>
    </Modal>
  );
}

// 3. API calls: every route, sortable, filtered by processor and text.
export function ApisTab({ period, services }) {
  const [sort, setSort] = useState("slowest");
  const [service, setService] = useState("");
  const [route, setRoute] = useState("");
  const [open, setOpen] = useState(null);
  const { data, error } = useMonitor("apis", { ...period, sort, limit: 200, service, route });
  const columns = [
    { key: "route", label: "Route", render: (r) => (
        <button type="button" className="pm__link" onClick={() => setOpen(r.route)}>
          {r.route}
        </button>
      ) },
    { key: "service", label: "Processor", render: (r) => <span className="pm__muted">{r.service}</span> },
    { key: "calls", label: "Calls", render: (r) => fmtNum(r.calls) },
    { key: "calls_per_min", label: "Per min", render: (r) => fmtNum(r.calls_per_min, 2) },
    { key: "error_pct", label: "Errors", render: (r) => <span className={r.err_5xx ? "pm__bad" : r.err_4xx ? "pm__warn" : undefined}>{fmtNum(r.err_4xx + r.err_5xx)} · {fmtPct(r.error_pct)}</span> },
    { key: "avg_ms", label: "Average", render: (r) => fmtMs(r.avg_ms) },
    { key: "p95_ms", label: "p95", render: (r) => fmtMs(r.p95_ms) },
    { key: "p99_ms", label: "p99", render: (r) => fmtMs(r.p99_ms) },
    { key: "max_ms", label: "Slowest", render: (r) => fmtMs(r.max_ms) },
    { key: "total_ms", label: "Total time", render: (r) => fmtMs(r.total_ms) },
    { key: "change_pct", label: "vs before", render: (r) => (r.change_pct == null ? "—" : <span className={r.change_pct > 20 ? "pm__bad" : r.change_pct < 0 ? "pm__ok" : undefined}>{r.change_pct > 0 ? "+" : ""}{fmtPct(r.change_pct, 0)}</span>) },
  ];
  return (
    <>
      <Err error={error} />
      <p className="pm__note">The gateway (innoversegateway_15005) shows each call as the outside sees it; the processor rows show the same call inside. Percentiles are estimates.</p>
      <div className="pm__filters">
        <TableSearchBar value={route} onChange={setRoute} placeholder="Filter routes…" />
        <Select label="Processor" placeholder="All processors" value={service} onChange={(e) => setService(e.target.value)} options={services.map((s) => ({ value: s, label: s }))} />
        <Select label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} options={API_SORTS.map(([value, label]) => ({ value, label }))} />
      </div>
      <DataTable columns={columns} rows={(data?.routes ?? []).map((r, i) => ({ ...r, id: `${r.service}:${r.route}:${i}` }))} isLoading={!data} emptyMessage="No calls in this period." />
      {data?.total_routes != null && <p className="pm__note">{fmtNum(data.total_routes)} routes in this period.</p>}
      {open && <RouteDetail route={open} period={period} onClose={() => setOpen(null)} />}
    </>
  );
}

const QUERY_SORTS = [
  ["total_time", "Most total time"],
  ["slowest", "Slowest average"],
  ["runs", "Most runs"],
  ["errors", "Most errors"],
  ["max", "Slowest single run"],
];

function DbOverview({ period }) {
  const { data, error } = useMonitor("database", period);
  const now = data?.now ?? {};
  const tot = data?.totals ?? {};
  return (
    <>
      <Err error={error} />
      <div className="pm__tiles">
        <Tile label="Connections" value={`${fmtNum(now.connections)} / ${fmtNum(now.max_connections)}`} hint={`peak ${fmtNum(tot.peak_connections)}`} />
        <Tile label="Cache hit" value={fmtPct(tot.cache_hit_pct, 2)} hint="aim above 99%" tone={tot.cache_hit_pct == null ? undefined : tot.cache_hit_pct >= 99 ? "ok" : tot.cache_hit_pct >= 95 ? "warn" : "bad"} />
        <Tile label="Deadlocks" value={fmtNum(tot.deadlocks)} tone={tot.deadlocks ? "bad" : "ok"} />
        <Tile label="Commits / rollbacks" value={`${fmtNum(tot.commits)} / ${fmtNum(tot.rollbacks)}`} />
        <Tile label="Temp files" value={fmtNum(tot.temp_files)} hint={fmtBytes(tot.temp_bytes)} tone={tot.temp_files ? "warn" : undefined} />
        <Tile label="Size" value={fmtBytes(now.size_bytes)} hint={tot.growth_bytes != null ? `${tot.growth_bytes >= 0 ? "+" : ""}${fmtBytes(tot.growth_bytes)} in period` : undefined} />
      </div>
      <div className="pm__grid">
        <Panel title="Connections">
          <LineChart rows={data?.series} lines={[{ key: "connections", label: "All" }, { key: "active", label: "Active" }, { key: "idle_in_tx", label: "Idle in transaction" }, { key: "waiting_on_lock", label: "Waiting on a lock" }]} />
        </Panel>
        <Panel title="Longest query and transaction">
          <LineChart rows={data?.series} lines={[{ key: "longest_query_s", label: "Query" }, { key: "longest_tx_s", label: "Transaction" }]} format={(v) => (v == null ? "—" : `${fmtNum(v, 1)} s`)} />
        </Panel>
        <Panel title="Commits and rollbacks">
          <LineChart rows={data?.series} lines={[{ key: "commits", label: "Commits" }, { key: "rollbacks", label: "Rollbacks" }, { key: "deadlocks", label: "Deadlocks" }]} />
        </Panel>
        <Panel title="Cache hit">
          <LineChart rows={data?.series} lines={[{ key: "cache_hit_pct", label: "Cache hit %" }]} format={(v) => fmtPct(v, 2)} />
        </Panel>
      </div>
      <div className="pm__grid">
        <Panel title="By state">
          <MiniTable rows={Object.entries(now.by_state ?? {}).map(([state, count]) => ({ state, count }))} columns={[{ key: "state", label: "State" }, { key: "count", label: "Connections", num: true }]} />
        </Panel>
        <Panel title="By application">
          <MiniTable rows={Object.entries(now.by_application ?? {}).map(([app, count]) => ({ app: app || "(none)", count }))} columns={[{ key: "app", label: "Application" }, { key: "count", label: "Connections", num: true }]} />
        </Panel>
      </div>
      <p className="pm__note">{now.version}</p>
    </>
  );
}

function DbQueries({ period }) {
  const [sort, setSort] = useState("total_time");
  const { data, error } = useMonitor("database_queries", { ...period, sort, limit: 200 });
  const columns = [
    { key: "sql", label: "Statement", sortable: false, render: (r) => <Sql text={r.sql} /> },
    { key: "runs", label: "Runs", render: (r) => fmtNum(r.runs) },
    { key: "total_ms", label: "Total", render: (r) => fmtMs(r.total_ms) },
    { key: "avg_ms", label: "Average", render: (r) => fmtMs(r.avg_ms) },
    { key: "max_ms", label: "Slowest", render: (r) => fmtMs(r.max_ms) },
    { key: "errors", label: "Errors", render: (r) => <span className={r.errors ? "pm__bad" : undefined}>{fmtNum(r.errors)}</span> },
    { key: "route", label: "Last route", render: (r) => <span className="pm__muted">{r.route}</span> },
    { key: "services", label: "Processors", render: (r) => <span className="pm__muted">{r.services}</span> },
  ];
  return (
    <>
      <Err error={error} />
      <p className="pm__note">The main list for optimisation: the top of “Most total time” is where the database spends its time. Literals are shown as ?.</p>
      <div className="pm__filters">
        <Select label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} options={QUERY_SORTS.map(([value, label]) => ({ value, label }))} />
      </div>
      <DataTable columns={columns} rows={(data?.queries ?? []).map((q) => ({ ...q, id: q.shape_id }))} isLoading={!data} emptyMessage="No statements in this period." />
    </>
  );
}

function DbTables() {
  const { data, error } = useMonitor("database_tables", { limit: 50 });
  const t = (r) => `${r.schema}.${r.table}`;
  return (
    <>
      <Err error={error} />
      <p className="pm__note">Counted since the database&apos;s statistics started{data?.counted_since ? ` (${fmtTime(data.counted_since)})` : ""}.</p>
      <Panel title="Read by full scans" hint="Read over and over without an index: candidates for one.">
        <MiniTable rows={data?.full_scans} columns={[{ key: "t", label: "Table", render: t }, { key: "seq_scan", label: "Full scans", num: true, render: (r) => fmtNum(r.seq_scan) }, { key: "idx_scan", label: "Index scans", num: true, render: (r) => fmtNum(r.idx_scan) }, { key: "rows_per_scan", label: "Rows per scan", num: true, render: (r) => fmtNum(r.rows_per_scan) }, { key: "live_rows", label: "Rows", num: true, render: (r) => fmtNum(r.live_rows) }]} empty="None." />
      </Panel>
      <Panel title="Largest tables">
        <MiniTable rows={data?.largest} columns={[{ key: "t", label: "Table", render: t }, { key: "total_bytes", label: "Size", num: true, render: (r) => fmtBytes(r.total_bytes) }, { key: "index_bytes", label: "Indexes", num: true, render: (r) => fmtBytes(r.index_bytes) }, { key: "live_rows", label: "Rows", num: true, render: (r) => fmtNum(r.live_rows) }, { key: "dead_pct", label: "Dead", num: true, render: (r) => fmtPct(r.dead_pct) }, { key: "seq_scan_pct", label: "Full-scan share", num: true, render: (r) => fmtPct(r.seq_scan_pct) }, { key: "last_vacuum", label: "Last vacuum", render: (r) => fmtTime(r.last_vacuum) }, { key: "last_analyze", label: "Last analyse", render: (r) => fmtTime(r.last_analyze) }]} />
      </Panel>
      <div className="pm__grid">
        <Panel title="Dead rows">
          <MiniTable rows={data?.dead_rows} columns={[{ key: "t", label: "Table", render: t }, { key: "dead_rows", label: "Dead rows", num: true, render: (r) => fmtNum(r.dead_rows) }, { key: "dead_pct", label: "Share", num: true, render: (r) => fmtPct(r.dead_pct) }]} empty="None." />
        </Panel>
        <Panel title="Unused indexes" hint="Never used, so they cost on every write.">
          <MiniTable rows={data?.unused_indexes} columns={[{ key: "index", label: "Index", render: (r) => `${r.schema ? `${r.schema}.` : ""}${r.index}` }, { key: "table", label: "Table" }, { key: "bytes", label: "Size", num: true, render: (r) => fmtBytes(r.bytes) }]} empty="None." />
        </Panel>
      </div>
    </>
  );
}

function DbActivity() {
  const { data, error, reload } = useMonitor("database_activity", {});
  return (
    <>
      <Err error={error} />
      <p className="pm__note">
        Read live. <button type="button" className="pm__link" onClick={reload}>Read again</button>
      </p>
      <Panel title="Lock waits" hint="Each one: a session waiting for another to finish.">
        {(data?.lock_waits ?? []).length === 0 ? (
          <p className="pm__empty">Nothing is waiting on a lock.</p>
        ) : (
          <ul className="pm__chains">
            {data.lock_waits.map((w, i) => (
              <li key={i}>
                <p>
                  <b>PID {w.waiting_pid}</b> has waited {fmtNum(w.waiting_seconds, 1)} s for <b>PID {w.blocking_pid}</b> ({w.blocking_state}, transaction open {fmtNum(w.blocking_transaction_seconds, 1)} s)
                  {w.tables ? <span className="pm__muted"> · {Array.isArray(w.tables) ? w.tables.join(", ") : w.tables}</span> : null}
                </p>
                <p className="pm__muted">Waiting:</p>
                <Sql text={w.waiting_sql} />
                <p className="pm__muted">Blocking:</p>
                <Sql text={w.blocking_sql} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Running now">
        <MiniTable rows={data?.running} columns={[{ key: "pid", label: "PID" }, { key: "application", label: "Application" }, { key: "state", label: "State" }, { key: "wait_event_type", label: "Waiting on" }, { key: "query_seconds", label: "Query", num: true, render: (r) => `${fmtNum(r.query_seconds, 1)} s` }, { key: "transaction_seconds", label: "Transaction", num: true, render: (r) => `${fmtNum(r.transaction_seconds, 1)} s` }, { key: "blocked_by", label: "Blocked by", render: (r) => (r.blocked_by?.length ? r.blocked_by.join(", ") : "—") }, { key: "sql", label: "Statement", render: (r) => <Sql text={r.sql} /> }]} empty="Nothing running." />
      </Panel>
      <Panel title="Locks by mode">
        <MiniTable rows={data?.locks} columns={[{ key: "mode", label: "Mode" }, { key: "granted", label: "Granted", render: (r) => (r.granted ? "Yes" : "Waiting") }, { key: "count", label: "Count", num: true }]} />
      </Panel>
    </>
  );
}

const DB_VIEWS = [
  ["overview", "Overview"],
  ["queries", "Queries"],
  ["tables", "Tables"],
  ["activity", "Live activity"],
];

// 4. Database.
export function DatabaseTab({ period }) {
  const [view, setView] = useState("overview");
  return (
    <>
      <div className="pm__subtabs" role="tablist">
        {DB_VIEWS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={view === key} className={`pm__subtab ${view === key ? "pm__subtab--on" : ""}`} onClick={() => setView(key)}>
            {label}
          </button>
        ))}
      </div>
      {view === "overview" && <DbOverview period={period} />}
      {view === "queries" && <DbQueries period={period} />}
      {view === "tables" && <DbTables />}
      {view === "activity" && <DbActivity />}
    </>
  );
}

// 5. Server: load, CPU, memory and disk, and Elasticsearch and Redis.
export function ServerTab({ period }) {
  const { data, error } = useMonitor("server", period);
  const series = (data?.series ?? []).map((r) => ({ ...r, mem_used_bytes: r.mem_total_bytes - r.mem_avail_bytes, disk_used_bytes: r.disk_total_bytes - r.disk_free_bytes }));
  const deps = data?.dependencies ?? [];
  const latency = (name) => (data?.dependency_series ?? []).filter((d) => d.dependency === name);
  return (
    <>
      <Err error={error} />
      <div className="pm__grid">
        <Panel title="Load">
          <LineChart rows={series} lines={[{ key: "load1", label: "1 min" }, { key: "load5", label: "5 min" }, { key: "load15", label: "15 min" }]} format={(v) => fmtNum(v, 2)} />
        </Panel>
        <Panel title="CPU">
          <LineChart rows={series} lines={[{ key: "cpu_pct", label: "CPU %" }, { key: "iowait_pct", label: "I/O wait %" }]} format={(v) => fmtPct(v)} />
        </Panel>
        <Panel title="Memory">
          <LineChart rows={series} lines={[{ key: "mem_used_bytes", label: "Used" }, { key: "swap_used_bytes", label: "Swap used" }]} format={fmtBytes} />
        </Panel>
        <Panel title="Disk">
          <LineChart rows={series} lines={[{ key: "disk_used_bytes", label: "Used" }, { key: "disk_read_bytes", label: "Read" }, { key: "disk_write_bytes", label: "Written" }]} format={fmtBytes} />
        </Panel>
      </div>
      <div className="pm__grid">
        {deps.map((d) => (
          <Panel key={d.dependency} title={`${d.dependency === "elasticsearch" ? "Elasticsearch" : d.dependency === "redis" ? "Redis" : d.dependency} · ${d.status}`} hint={`${fmtMs(d.latency_ms)} · read ${fmtTime(d.at)}`}>
            <LineChart rows={latency(d.dependency)} lines={[{ key: "latency_ms", label: "Latency" }]} format={fmtMs} height={110} />
            {d.dependency === "elasticsearch" ? (
              <>
                <p className="pm__note">
                  Cluster {d.data?.cluster} is {d.data?.cluster_status} · {fmtNum(d.data?.active_shards)} active shards
                </p>
                <MiniTable rows={d.data?.indices} columns={[{ key: "index", label: "Index" }, { key: "health", label: "Health" }, { key: "docs.count", label: "Docs", num: true, render: (r) => fmtNum(r["docs.count"]) }, { key: "store.size", label: "Size", num: true, render: (r) => fmtBytes(r["store.size"]) }]} />
              </>
            ) : (
              <dl className="pm__facts">
                {Object.entries(d.data ?? {})
                  .filter(([, v]) => typeof v !== "object")
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{k.replace(/_/g, " ")}</dt>
                      <dd>{/bytes/.test(k) ? fmtBytes(v) : typeof v === "number" ? fmtNum(v, 2) : String(v)}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </Panel>
        ))}
      </div>
    </>
  );
}

// 6. Throughput: transactions, staff sign-ins and the outbox.
export function ThroughputTab({ period }) {
  const { data, error } = useMonitor("throughput", period);
  return (
    <>
      <Err error={error} />
      <div className="pm__grid">
        <Panel title="Transactions">
          <LineChart rows={data?.transactions} lines={[{ key: "transactions", label: "All" }, { key: "posted", label: "Posted" }, { key: "failed", label: "Failed" }, { key: "reversed", label: "Reversed" }]} />
        </Panel>
        <Panel title="Staff sign-ins">
          <LineChart rows={data?.logins} lines={[{ key: "logins", label: "Sign-ins" }, { key: "not_successful", label: "Failed" }]} />
        </Panel>
      </div>
      <Panel title="Outbox" hint="A waiting count that keeps growing means the sender is behind.">
        <MiniTable rows={data?.outbox} columns={[{ key: "channel", label: "Channel" }, { key: "sent", label: "Sent", num: true, render: (r) => fmtNum(r.sent) }, { key: "failed", label: "Failed", num: true, render: (r) => <span className={r.failed ? "pm__bad" : undefined}>{fmtNum(r.failed)}</span> }, { key: "waiting_now", label: "Waiting now", num: true, render: (r) => <span className={r.waiting_now ? "pm__warn" : undefined}>{fmtNum(r.waiting_now)}</span> }, { key: "oldest_waiting", label: "Oldest waiting", render: (r) => fmtTime(r.oldest_waiting) }]} />
      </Panel>
      <Panel title="By type and channel">
        <MiniTable rows={data?.by_type} columns={[{ key: "txn_type", label: "Type" }, { key: "channel", label: "Channel" }, { key: "transactions", label: "Transactions", num: true, render: (r) => fmtNum(r.transactions) }, { key: "failed_pct", label: "Failed", num: true, render: (r) => <span className={r.failed_pct ? "pm__bad" : undefined}>{fmtPct(r.failed_pct)}</span> }]} empty="No transactions in this period." />
      </Panel>
    </>
  );
}

const STALL_KINDS = [
  ["DEADLOCK", "Postgres broke a deadlock and cancelled this statement"],
  ["LOCK_TIMEOUT", "A statement gave up waiting for a lock"],
  ["STATEMENT_CANCELLED", "A statement was cancelled (timeout or client gone)"],
  ["SERIALISATION_FAILURE", "A transaction conflicted with another"],
  ["LOCK_WAIT", "A session waited on a lock over 5 s"],
  ["IDLE_IN_TRANSACTION", "A transaction left open and idle over 60 s"],
  ["LONG_QUERY", "A statement running over 30 s"],
  ["STUCK_CALL", "A call still running after 30 s"],
  ["HUNG", "The process is there but does not answer"],
  ["DOWN", "Stopped answering"],
  ["RECOVERED", "Answering again"],
  ["RESTART", "A processor started again"],
  ["SLOW_CALL", "A call over 1 s"],
  ["SLOW_QUERY", "A statement over 1 s"],
];
const KIND_MEANING = Object.fromEntries(STALL_KINDS);

// An event's detail, short: its SQL, error or who blocked it.
function EventDetail({ e }) {
  const d = e.detail ?? {};
  return (
    <div className="pm__detail">
      {d.message && <p>{d.message}</p>}
      {d.error && <p className="pm__bad">{d.error}</p>}
      {d.waiting_on && <p>Waiting on {d.waiting_on}{d.query_seconds != null ? ` · query ${fmtNum(d.query_seconds, 1)} s` : ""}</p>}
      {d.previous_pid && <p>PID {d.previous_pid} → {d.pid}</p>}
      {d.status && <p>Status {d.status}</p>}
      {d.sql && <Sql text={d.sql} />}
      {(d.blocked_by ?? []).map((b, i) => (
        <p key={i} className="pm__muted">
          Blocked by PID {b.pid} ({b.state}, transaction {fmtNum(b.transaction_seconds, 1)} s)
        </p>
      ))}
    </div>
  );
}

// 7. Deadlocks & Stalls, and every recorded event (SLOW_CALL, SLOW_QUERY…).
export function StallsTab({ period, services, kind, onKind }) {
  const [service, setService] = useState("");
  const { data, error } = useMonitor("stalls", { ...period, kind, service, limit: 200 });
  const slow = kind === "SLOW_CALL" || kind === "SLOW_QUERY";
  const events = useMonitor("events", { ...period, kind, service }, { enabled: slow });
  const rows = (slow ? events.data?.events : data?.events) ?? [];
  const goroutines = (data?.goroutines ?? []).filter((g) => !service || g.service === service);
  const byService = service ? goroutines : [];
  const columns = [
    { key: "at", label: "When", render: (e) => <span className="pm__nowrap">{fmtTime(e.at)}</span> },
    { key: "kind", label: "Kind", render: (e) => <span className="pm__mono" title={KIND_MEANING[e.kind]}>{e.kind}</span> },
    { key: "service", label: "Processor", render: (e) => <span className="pm__muted">{e.service || "—"}</span> },
    { key: "route", label: "Route", render: (e) => <span className="pm__muted">{e.route || "—"}</span> },
    { key: "ms", label: "Waited / ran", render: (e) => fmtMs(e.ms) },
    { key: "detail", label: "Detail", sortable: false, render: (e) => <EventDetail e={e} /> },
  ];
  return (
    <>
      <Err error={error || events.error} />
      <div className="pm__tiles">
        <Tile label="Postgres deadlocks" value={fmtNum(data?.postgres_deadlocks)} tone={data?.postgres_deadlocks ? "bad" : "ok"} />
        {(data?.counts ?? []).map((c) => (
          <Tile key={c.kind} label={c.kind} value={fmtNum(c.count)} hint={KIND_MEANING[c.kind]} tone={["DEADLOCK", "DOWN", "HUNG", "STUCK_CALL"].includes(c.kind) ? "bad" : "warn"} onClick={() => onKind(kind === c.kind ? "" : c.kind)} />
        ))}
      </div>
      <div className="pm__filters">
        <Select label="Kind" placeholder="All kinds" value={kind} onChange={(e) => onKind(e.target.value)} options={STALL_KINDS.map(([value, meaning]) => ({ value, label: `${value} · ${meaning}` }))} />
        <Select label="Processor" placeholder="All processors" value={service} onChange={(e) => setService(e.target.value)} options={services.map((s) => ({ value: s, label: s }))} />
      </div>
      <DataTable columns={columns} rows={rows.map((e, i) => ({ ...e, id: e.id ?? i }))} isLoading={slow ? !events.data : !data} emptyMessage={kind ? `No ${kind} events in this period.` : "No deadlocks or stalls in this period."} />
      <div className="pm__grid">
        <Panel title="Hot spots" hint="Routes or statements with the most lock trouble.">
          <MiniTable rows={data?.hot_spots} columns={[{ key: "route", label: "Route", render: (r) => r.route || "—" }, { key: "sql", label: "Statement", render: (r) => (r.sql ? <Sql text={r.sql} /> : "—") }, { key: "count", label: "Events", num: true, render: (r) => fmtNum(r.count ?? r.events) }]} empty="None." />
        </Panel>
        <Panel title="Now, per processor">
          <MiniTable rows={(data?.live ?? []).filter((l) => !service || l.service === service)} columns={[{ key: "service", label: "Processor" }, { key: "in_flight", label: "In flight", num: true }, { key: "stuck", label: "Stuck", num: true, render: (r) => <span className={(Array.isArray(r.stuck) ? r.stuck.length : r.stuck) ? "pm__bad" : undefined}>{Array.isArray(r.stuck) ? r.stuck.length : fmtNum(r.stuck ?? 0)}</span> }, { key: "goroutines", label: "Goroutines", num: true }]} />
        </Panel>
      </div>
      {service ? (
        <Panel title={`${service}: goroutines and pool waits`} hint="A goroutine line that keeps rising points to a leak.">
          <LineChart rows={byService} lines={[{ key: "goroutines", label: "Goroutines" }, { key: "pool_waits", label: "Pool waits" }]} />
        </Panel>
      ) : (
        <p className="pm__note">Pick a processor to chart its goroutines and pool waits.</p>
      )}
    </>
  );
}
