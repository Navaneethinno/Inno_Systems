import { useState } from "react";
import { DataTable } from "../../../components/ui/DataTable";
import { Select } from "../../../components/ui/Select";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { LineChart, Panel, Tile, fmtMs, fmtNum, fmtPct, fmtTime, useMonitor } from "./monitorShared";
import { depKey, depName, depStatus, depTone, isServerProbe } from "./dependencyNames";

const KINDS = [
  ["", "All dependencies"],
  ["probes", "Server probes"],
  ["partners", "All partners"],
  ["SMTP", "Mail (SMTP)"],
  ["FCM", "Push (FCM)"],
  ["SMS", "SMS"],
  ["PROVIDER", "External providers"],
  ["NETWORK", "Card networks"],
  ["CREDIT_BUREAU", "Credit bureau"],
];
function matches(dep, kind) {
  if (!kind) return true;
  if (kind === "probes") return isServerProbe(dep);
  if (kind === "partners") return !isServerProbe(dep);
  return String(dep).split(":")[0] === kind;
}

const OLD_AFTER_MS = 24 * 60 * 60 * 1000;
// Stale for over a day: kept by the backend, hidden here until asked for.
const isOld = (d) => d.stale && d.updated_at != null && Date.now() - new Date(d.updated_at).getTime() > OLD_AFTER_MS;

// Why a row stopped reporting, from its processor's state in the overview.
function staleReason(d, processors) {
  const p = (processors ?? []).find((x) => x.service === d.service);
  if (p?.up === false) return `No report for 5 minutes: ${d.service} is down.`;
  if (p?.up) return `No report for 5 minutes: ${d.service} is up, and no longer calls it or has not called it since it restarted.`;
  return "No report for 5 minutes.";
}

// One dependency as seen by one processor: status, last success and failure,
// failures in a row and latency. Stale (no report for 5 minutes) is greyed.
// Server probes have no call counters, so they show status and latency only.
function DependencyCard({ d, failAfter, series, alertedOn, processors }) {
  const availability = series.map((r) => ({ ...r, availability_pct: r.samples ? (r.up_samples / r.samples) * 100 : null }));
  const reason = d.stale ? staleReason(d, processors) : null;
  const probe = isServerProbe(d.dependency);
  const alerted = alertedOn > 1 ? ` · alerted on ${fmtNum(alertedOn)} processors` : d.alerted ? " · alerted" : "";
  return (
    <div className={d.stale ? "pm__stale" : undefined} title={reason ?? undefined}>
      <Panel title={`${depName(d.dependency)} · ${depStatus(d.status)}${alerted}${d.stale ? " · stale" : ""}`} hint={`Seen by ${d.service || "—"} · updated ${fmtTime(d.updated_at)}`}>
        <div className="pm__tiles">
          <Tile label="Status" value={depStatus(d.status)} tone={d.stale ? undefined : depTone(d.status)} />
          {probe ? (
            <Tile label="Latency" value={fmtMs(d.latency_ms ?? d.avg_latency_ms ?? d.last_latency_ms)} />
          ) : (
            <>
              <Tile label="Failures in a row" value={`${fmtNum(d.consecutive_failures)} / ${fmtNum(failAfter)}`} tone={d.consecutive_failures ? (d.consecutive_failures >= failAfter ? "bad" : "warn") : "ok"} />
              <Tile label="Average latency" value={fmtMs(d.avg_latency_ms)} hint={`max ${fmtMs(d.max_latency_ms)} · last ${fmtMs(d.last_latency_ms)}`} />
              <Tile label="Attempts" value={fmtNum(d.attempts)} hint={`${fmtNum(d.failures)} failed · ${fmtNum(d.timeouts)} timed out`} />
            </>
          )}
        </div>
        {reason && <p className="pm__note">{reason}</p>}
        {!probe && (
          <dl className="pm__facts">
            <div>
              <dt>Last success</dt>
              <dd>{fmtTime(d.last_success_at)}</dd>
            </div>
            <div>
              <dt>Last failure</dt>
              <dd>
                {fmtTime(d.last_failure_at)}
                {d.last_timeout ? " (timeout)" : ""}
              </dd>
            </div>
            {d.last_error && (
              <div>
                <dt>Reason</dt>
                <dd className="pm__bad">{d.last_error}</dd>
              </div>
            )}
          </dl>
        )}
        <LineChart rows={availability} lines={[{ key: "latency_ms", label: "Latency" }]} format={fmtMs} height={100} />
        <LineChart rows={availability} lines={[{ key: "availability_pct", label: "Availability" }]} format={(v) => fmtPct(v, 0)} height={80} />
      </Panel>
    </div>
  );
}

// System > Platform Monitor > Dependencies: how the platform's outbound
// partners answer (mail, push, SMS, providers, card networks, credit bureau)
// and the server's own probes (Elasticsearch, Redis).
export function DependenciesTab({ period, services, processors }) {
  const [service, setService] = useState("");
  const [kind, setKind] = useState("");
  const [showOld, setShowOld] = useState(false);
  const { data, error } = useMonitor("dependencies", { ...period, ...(service ? { service } : {}), limit: 200 });
  const failAfter = data?.fail_after ?? 3;
  const rows = data?.dependencies ?? [];
  const noPartners = data && !rows.some((d) => !isServerProbe(d.dependency));
  const matching = rows.filter((d) => matches(d.dependency, kind));
  const oldCount = matching.filter(isOld).length;
  const deps = showOld ? matching : matching.filter((d) => !isOld(d));
  const seriesByKey = new Map();
  (data?.series ?? []).forEach((r) => {
    const key = depKey(r);
    if (!seriesByKey.has(key)) seriesByKey.set(key, []);
    seriesByKey.get(key).push(r);
  });
  const alertedOn = (dependency) => rows.filter((d) => d.alerted && d.dependency === dependency).length;
  const counts = { up: 0, degraded: 0, down: 0, stale: 0 };
  matching.forEach((d) => (d.stale ? counts.stale++ : (counts[d.status] = (counts[d.status] ?? 0) + 1)));
  // The server sends these newest first, and DataTable keeps that order.
  const events = (data?.events ?? []).filter((e) => matches(e.dependency, kind));
  const columns = [
    { key: "at", label: "When", render: (e) => <span className="nowrap">{fmtTime(e.at)}</span> },
    { key: "kind", label: "Event", render: (e) => <span className={e.kind === "DEPENDENCY_DOWN" ? "pm__bad mono" : "mono"}>{e.kind === "DEPENDENCY_DOWN" ? "Down" : e.kind === "DEPENDENCY_RECOVERED" ? "Recovered" : e.kind}</span> },
    { key: "dependency", label: "Dependency", render: (e) => depName(e.dependency) },
    { key: "service", label: "Processor", render: (e) => <span className="muted">{e.service || "—"}</span> },
    {
      key: "detail",
      label: "Detail",
      sortable: false,
      render: (e) => {
        const x = e.detail ?? {};
        return (
          <span className="muted">
            {x.consecutive_failures != null ? `${fmtNum(x.consecutive_failures)} failures in a row` : ""}
            {x.last_timeout ? " · timeout" : ""}
            {x.last_error ? ` · ${x.last_error}` : ""}
          </span>
        );
      },
    },
  ];
  return (
    <>
      {error && <Alert>{error}</Alert>}
      <div className="pm__tiles">
        <Tile label="Down (alerted)" value={fmtNum(data?.down ?? 0)} hint="Dependencies, each counted once" tone={data?.down ? "bad" : "ok"} />
        <Tile label="Degraded" value={fmtNum(counts.degraded)} hint="Per dependency and processor" tone={counts.degraded ? "warn" : "ok"} />
        <Tile label="Up" value={fmtNum(counts.up)} hint="Per dependency and processor" tone="ok" />
        <Tile label="Stale" value={fmtNum(counts.stale)} hint={oldCount ? `No report for 5 minutes · ${fmtNum(oldCount)} over 24 hours` : "No report for 5 minutes"} />
        <Tile label="Down after" value={`${fmtNum(failAfter)} failures in a row`} />
      </div>
      <div className="pm__filters">
        <Select label="Dependency" value={kind} onChange={(e) => setKind(e.target.value)} options={KINDS.map(([value, label]) => ({ value, label }))} />
        <Select label="Processor" placeholder="All processors" value={service} onChange={(e) => setService(e.target.value)} options={services.map((s) => ({ value: s, label: s }))} />
        {oldCount > 0 && (
          <Button variant="secondary" onClick={() => setShowOld((v) => !v)}>
            {showOld ? `Hide old (${fmtNum(oldCount)})` : `Show old (${fmtNum(oldCount)})`}
          </Button>
        )}
      </div>
      {!data && !error && <p className="pm__note">Loading…</p>}
      {noPartners && (
        <p className="pm__note">
          No partner rows yet: {service ? `${service} has` : "no processor has"} called mail, push, SMS, a provider, a card network or the credit bureau since the last restart. A partner appears here after its first call. Until then, only the server probes (Elasticsearch and Redis) report.
        </p>
      )}
      {data && deps.length === 0 && rows.length > 0 && (
        <p className="pm__note">{oldCount > 0 ? "Only old stale rows match these filters. Use Show old to see them." : "No dependencies match these filters."}</p>
      )}
      <div className="pm__grid">
        {deps.map((d) => (
          <DependencyCard key={depKey(d)} d={d} failAfter={failAfter} series={seriesByKey.get(depKey(d)) ?? []} alertedOn={alertedOn(d.dependency)} processors={processors} />
        ))}
      </div>
      <Panel title="Alerts" hint="A dependency goes down after the set number of failures in a row, and recovers on its next success.">
        <DataTable columns={columns} rows={events} isLoading={!data && !error} emptyMessage="No dependency alerts in this period." />
      </Panel>
    </>
  );
}
