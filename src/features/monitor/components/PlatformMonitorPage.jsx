import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { useMonitor } from "./monitorShared";
import { ApisTab, DatabaseTab, OverviewTab, ProcessorsTab, ServerTab, StallsTab, ThroughputTab } from "./MonitorTabs";
import "../../masterData/components/MasterDataPage.css";
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
    <div className="mdp pm">
      <div className="mdp__header">
        <div>
          <span className="mdp__eyebrow">System</span>
          <h1 className="mdp__title">Platform Monitor</h1>
          <p className="mdp__subtitle">How the platform runs, and where to optimise. Figures are collected once a minute and this page refreshes every minute.</p>
        </div>
        <div className="mdp__header-actions">
          {tab !== "overview" && (
            <Select aria-label="Period" value={String(period.minutes)} onChange={(e) => setMinutes((m) => ({ ...m, [tab]: Number(e.target.value) }))} options={PERIODS.map(([value, label]) => ({ value: String(value), label }))} />
          )}
          <Button variant="secondary" onClick={() => setNonce((n) => n + 1)}>
            Reload
          </Button>
        </div>
      </div>
      <div className="pm__tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`pm__tab ${tab === key ? "pm__tab--on" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {/* Reload remounts the tab, so it reads its figures again. */}
      <div key={`${tab}:${nonce}`}>
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
