import { useState } from "react";
import { DataTable } from "../../../components/ui/DataTable";
import { Select } from "../../../components/ui/Select";
import { Alert } from "../../../components/ui/Alert";
import { LineChart, Panel, Tile, fmtMs, fmtNum, fmtPct, fmtTime, useMonitor } from "./monitorShared";
import { depName, depStatus, depTone } from "./dependencyNames";

const KINDS = [
  ["", "All dependencies"],
  ["SMTP", "Mail (SMTP)"],
  ["FCM", "Push (FCM)"],
  ["SMS", "SMS"],
  ["PROVIDER:", "External providers"],
  ["NETWORK:", "Card networks"],
  ["CREDIT_BUREAU", "Credit bureau"],
];
const matches = (dep, kind) => !kind || (kind.endsWith(":") ? String(dep).startsWith(kind) : dep === kind);

// One dependency as seen by one processor: status, last success and failure,
// failures in a row and latency. Stale (no report for 5 minutes) is greyed.
function DependencyCard({ d, failAfter, series }) {
  const availability = series.map((r) => ({ ...r, availability_pct: r.samples ? (r.up_samples / r.samples) * 100 : null }));
  return (
    <div className={d.stale ? "pm__stale" : undefined} title={d.stale ? "No report for 5 minutes: the processor is down or no longer calls it." : undefined}>
      <Panel
        title={`${depName(d.dependency)} · ${depStatus(d.status)}${d.alerted ? " · alerted" : ""}${d.stale ? " · stale" : ""}`}
        hint={`Seen by ${d.service || "—"} · updated ${fmtTime(d.updated_at)}`}
      >
        <div className="pm__tiles">
          <Tile label="Status" value={depStatus(d.status)} tone={d.stale ? undefined : depTone(d.status)} />
          <Tile label="Failures in a row" value={`${fmtNum(d.consecutive_failures)} / ${fmtNum(failAfter)}`} tone={d.consecutive_failures ? (d.consecutive_failures >= failAfter ? "bad" : "warn") : "ok"} />
          <Tile label="Average latency" value={fmtMs(d.avg_latency_ms)} hint={`max ${fmtMs(d.max_latency_ms)} · last ${fmtMs(d.last_latency_ms)}`} />
          <Tile label="Attempts" value={fmtNum(d.attempts)} hint={`${fmtNum(d.failures)} failed · ${fmtNum(d.timeouts)} timed out`} />
        </div>
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
        <LineChart rows={availability} lines={[{ key: "latency_ms", label: "Latency" }]} format={fmtMs} height={100} />
        <LineChart rows={availability} lines={[{ key: "availability_pct", label: "Availability" }]} format={(v) => fmtPct(v, 0)} height={80} />
      </Panel>
    </div>
  );
}

// System > Platform Monitor > Dependencies: how the platform's outbound
// partners answer (mail, push, SMS, providers, card networks, credit bureau).
export function DependenciesTab({ period, services }) {
  const [service, setService] = useState("");
  const [kind, setKind] = useState("");
  const { data, error } = useMonitor("dependencies", { ...period, ...(service ? { service } : {}), limit: 200 });
  const failAfter = data?.fail_after ?? 3;
  const deps = (data?.dependencies ?? []).filter((d) => matches(d.dependency, kind));
  const seriesOf = (d) => (data?.series ?? []).filter((r) => r.dependency === d.dependency && (!r.service || r.service === d.service));
  const counts = { up: 0, degraded: 0, down: 0, stale: 0 };
  deps.forEach((d) => (d.stale ? counts.stale++ : (counts[d.status] = (counts[d.status] ?? 0) + 1)));
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
        <Tile label="Down (alerted)" value={fmtNum(data?.down ?? 0)} tone={data?.down ? "bad" : "ok"} />
        <Tile label="Degraded" value={fmtNum(counts.degraded)} tone={counts.degraded ? "warn" : "ok"} />
        <Tile label="Up" value={fmtNum(counts.up)} tone="ok" />
        <Tile label="Stale" value={fmtNum(counts.stale)} hint="No report for 5 minutes" />
        <Tile label="Down after" value={`${fmtNum(failAfter)} failures in a row`} />
      </div>
      <div className="pm__filters">
        <Select label="Dependency" value={kind} onChange={(e) => setKind(e.target.value)} options={KINDS.map(([value, label]) => ({ value, label }))} />
        <Select label="Processor" placeholder="All processors" value={service} onChange={(e) => setService(e.target.value)} options={services.map((s) => ({ value: s, label: s }))} />
      </div>
      {!data && !error && <p className="pm__note">Loading…</p>}
      {data && deps.length === 0 && <p className="pm__note">No outbound dependencies reported in this period.</p>}
      <div className="pm__grid">
        {deps.map((d) => (
          <DependencyCard key={`${d.dependency}|${d.service}`} d={d} failAfter={failAfter} series={seriesOf(d)} />
        ))}
      </div>
      <Panel title="Alerts" hint="A dependency goes down after the set number of failures in a row, and recovers on its next success.">
        <DataTable columns={columns} rows={events.map((e, i) => ({ ...e, id: e.id ?? i }))} isLoading={!data && !error} emptyMessage="No dependency alerts in this period." />
      </Panel>
    </>
  );
}
