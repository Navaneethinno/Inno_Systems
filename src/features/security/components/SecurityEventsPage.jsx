import { useEffect, useState } from "react";
import { securityService } from "../services/securityService";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { Select } from "../../../components/ui/Select";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { TextField } from "../../../components/ui/TextField";
import { formatDateTime, formatNumber } from "../../aml/components/formatAml";
import "../../masterData/components/MasterDataPage.css";
import "../../aml/components/Aml.css";
import "./SecurityEvents.css";

const LIMIT = 50;
const SEVERITIES = ["HIGH", "MEDIUM", "LOW", "INFO"];
// Reuses the DataTable status-pill tones: HIGH red, MEDIUM amber, the rest grey.
const TONES = { HIGH: "rejected", MEDIUM: "pending" };
const KINDS = [
  ["FILE_CHANGED", "A configuration or security file changed"],
  ["FILE_ADDED", "A watched file appeared"],
  ["FILE_REMOVED", "A watched file disappeared"],
  ["BINARY_CHANGED", "A service binary changed (normal during a deploy)"],
  ["UNSIGNED_CALL", "A service was called without a valid internal signature"],
  ["UNSIGNED_CONTROL", "A stop / debug-level message without a valid signature"],
  ["RATE_LIMITED", "A client went over its rate limit"],
  ["LOGIN_BURST", "Many failed sign-ins"],
  ["KEY_CEREMONY", "A key ceremony step, custodian or rotation change"],
  ["KEY_ROTATED", "A data key rotated"],
  ["BASELINE_TAKEN", "The watch started watching"],
  ["KEYS_LOCKED", "The keys are locked; the custodians are emailed"],
  ["KEYS_UNLOCKED", "Two custodians unlocked the keys"],
  ["UNLOCK_REFUSED", "An unlock component was refused: watch for repeats"],
  ["KEY_ROTATION_DUE", "A key is past its rotation period"],
  ["MODULE_EXPIRING", "A module subscription ends soon, has ended and is in grace, or was renewed"],
  ["MODULE_CUT_OFF", "A module subscription is past its end and its grace: the module has stopped"],
  ["LICENCE_EXPIRING", "An institution's licence or the platform licence expires soon (repeats daily)"],
];
const MEANING = Object.fromEntries(KINDS);
const EMPTY = { kind: "", severity: "", search: "", from: "", to: "" };

function SeverityPill({ value }) {
  return <span className={`dt__status dt__status--${TONES[value] ?? "inactive"}`}>{value}</span>;
}

export function SecurityEventsPage() {
  const [filters, setFilters] = useState(EMPTY);
  // The search box waits 400 ms after typing stops.
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  // A new filter starts again from page 1.
  const filterBy = (change) => {
    setFilters(change);
    setPage(1);
  };

  useEffect(() => {
    if (search === filters.search) return undefined;
    const timer = setTimeout(() => filterBy((f) => ({ ...f, search })), 400);
    return () => clearTimeout(timer);
  }, [search, filters.search]);

  useEffect(() => {
    let cancelled = false;
    const body = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    securityService
      .listEvents({ ...body, page, limit: LIMIT })
      .then((data) => !cancelled && (setResult(data), setError(null)))
      .catch((err) => !cancelled && (setResult((prev) => prev ?? { items: [], total: 0, by_severity: {} }), setError(err.message)));
    return () => {
      cancelled = true;
    };
  }, [filters, page, version]);

  const set = (key) => (e) => filterBy((f) => ({ ...f, [key]: e.target.value }));
  const total = result?.total ?? 0;
  const counts = result?.by_severity ?? {};
  const filtered = Object.entries(filters).some(([, v]) => v);

  const columns = [
    { key: "occurred_at", label: "Time", render: (r) => <span className="sec__nowrap">{formatDateTime(r.occurred_at)}</span> },
    { key: "severity", label: "Severity", render: (r) => <SeverityPill value={r.severity} /> },
    {
      key: "kind",
      label: "Kind",
      render: (r) => (
        <span className="aml__mono" title={MEANING[r.kind]}>
          {r.kind}
        </span>
      ),
    },
    { key: "subject", label: "Subject", render: (r) => <span className="aml__mono sec__wrap">{r.subject || "—"}</span> },
    { key: "detail", label: "Detail", render: (r) => <span className="sec__wrap">{r.detail || "—"}</span> },
    { key: "repeats", label: "Repeats", render: (r) => (r.repeats > 1 ? `×${formatNumber(r.repeats)}` : "—") },
    { key: "inst_profile_name", label: "Institution", render: (r) => r.inst_profile_name || "—" },
    { key: "source", label: "Source", render: (r) => <span className="aml__mono">{r.source || "—"}</span> },
  ];

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <span className="mdp__eyebrow">Security</span>
          <h1 className="mdp__title">Security Events</h1>
          <p className="mdp__subtitle">What the platform&apos;s runtime watch has seen, newest first. Events appear within about a minute.</p>
        </div>
        <div className="mdp__header-actions">
          <Button variant="secondary" onClick={() => setVersion((v) => v + 1)}>
            Reload
          </Button>
        </div>
      </div>

      {error && <div className="mdp__error">{error}</div>}

      {/* Counts for the current filters; a tile filters by its severity, a
          second click clears it. */}
      <div className="sec__tiles">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filters.severity === s}
            className={`sec__tile sec__tile--${TONES[s] ?? "inactive"} ${filters.severity === s ? "sec__tile--on" : ""}`}
            onClick={() => filterBy((f) => ({ ...f, severity: f.severity === s ? "" : s }))}
          >
            <span className="sec__tile-label">{s}</span>
            <span className="sec__tile-count">{formatNumber(counts[s] ?? 0)}</span>
          </button>
        ))}
      </div>

      <div className="sec__filters">
        <TableSearchBar value={search} onChange={setSearch} placeholder="Search subject or detail…" />
        <Select label="Kind" placeholder="All kinds" value={filters.kind} onChange={set("kind")} options={KINDS.map(([value, meaning]) => ({ value, label: `${value} · ${meaning}` }))} />
        <Select label="Severity" placeholder="All" value={filters.severity} onChange={set("severity")} options={SEVERITIES.map((s) => ({ value: s, label: s }))} />
        <TextField label="From" type="date" value={filters.from} max={filters.to || undefined} onChange={set("from")} />
        <TextField label="To" type="date" value={filters.to} min={filters.from || undefined} onChange={set("to")} />
        {filtered && (
          <Button
            variant="secondary"
            onClick={() => {
              setSearch("");
              filterBy(EMPTY);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={result?.items}
        isLoading={result === null}
        emptyMessage={filtered ? "No events match these filters." : "No security events yet."}
        page={page}
        onPageChange={setPage}
        pagination={{ totalRecords: total, totalPages: Math.ceil(total / LIMIT), currentPage: page, limit: LIMIT }}
      />
    </div>
  );
}
