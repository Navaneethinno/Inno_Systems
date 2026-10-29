import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { PageHeader } from "../../../components/ui/PageHeader";
import { useMonitor } from "./monitorShared";
import { ApisTab, DatabaseTab, OverviewTab, ProcessorsTab, ServerTab, StallsTab, ThroughputTab } from "./MonitorTabs";
import "./PlatformMonitor.css";

const TABS = [
  ["overview", "Overview"],
  ["processors", "Processors"],
  ["apis", "API calls"],
  ["database", "Database"],
  ["server", "Server"],
  ["throughput", "Throughput"],
  ["stalls", "Deadlocks & Stalls"],
];
const PERIODS = [
  [60, "Last hour"],
  [360, "Last 6 hours"],
  [1440, "Last 24 hours"],
  [10080, "Last 7 days"],
  [43200, "Last 30 days"],
];
// The period each tab opens on, as the handoff suggests.
const DEFAULT_MINUTES = { processors: 360, apis: 60, database: 1440, server: 1440, throughput: 1440, stalls: 1440 };

// SYSTEM > Platform Monitor: how the platform runs (processors, calls,
// database, server, throughput, deadlocks and stalls). Refreshes every
// minute; the figures are collected once a minute.
export function PlatformMonitorPage() {
  const [tab, setTab] = useState("overview");
  const [minutes, setMinutes] = useState({});
  const [stallKind, setStallKind] = useState("");
  const [nonce, setNonce] = useState(0);
  // The processors' names, for every tab's processor picker.
  const overview = useMonitor("overview", {});
  const services = (overview.data?.processors ?? []).map((p) => p.service).sort();
  const period = { minutes: minutes[tab] ?? DEFAULT_MINUTES[tab] ?? 60 };
  const props = { period, services };
  return (
    <div className="page">
      <PageHeader
        eyebrow="System"
        title="Platform Monitor"
        subtitle="How the platform runs, and where to optimise. Figures are collected once a minute and this page refreshes every minute."
        actions={
          <>
            {tab !== "overview" && (
              <Select aria-label="Period" value={String(period.minutes)} onChange={(e) => setMinutes((m) => ({ ...m, [tab]: Number(e.target.value) }))} options={PERIODS.map(([value, label]) => ({ value: String(value), label }))} />
            )}
            <Button variant="secondary" onClick={() => setNonce((n) => n + 1)} icon="refresh">
              Reload
            </Button>
          </>
        }
      />
      <div className="tabs" role="tablist" aria-label="Platform Monitor">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`tabs__tab ${tab === key ? "tabs__tab--active" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {/* Reload remounts the tab, so it reads its figures again. */}
      <div key={`${tab}:${nonce}`} className="pm__body" role="tabpanel">
        {tab === "overview" && (
          <OverviewTab
            onEvents={(kind) => {
              setStallKind(kind);
              setTab("stalls");
            }}
          />
        )}
        {tab === "processors" && <ProcessorsTab {...props} />}
        {tab === "apis" && <ApisTab {...props} />}
        {tab === "database" && <DatabaseTab {...props} />}
        {tab === "server" && <ServerTab {...props} />}
        {tab === "throughput" && <ThroughputTab {...props} />}
        {tab === "stalls" && <StallsTab {...props} kind={stallKind} onKind={setStallKind} />}
      </div>
    </div>
  );
}
