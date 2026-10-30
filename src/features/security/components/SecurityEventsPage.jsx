import { useEffect, useState } from "react";
import { securityService } from "../services/securityService";
import { Button } from "../../../components/ui/Button";
import { DataTable } from "../../../components/ui/DataTable";
import { Select } from "../../../components/ui/Select";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { TextField } from "../../../components/ui/TextField";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Alert } from "../../../components/ui/Alert";
import { StatCard } from "../../../components/ui/StatCard";
import { TonePill } from "../../../components/ui/StatusBadge";
import { LOCAL_ZONE, formatDateTime, formatNumber } from "../../aml/components/formatAml";

const LIMIT = 50;

// Browsers line-break at hyphens, which split ISO timestamps in the
// detail text mid-value; each word stays whole and lines break at spaces.
const unbrokenWords = (text) =>
  text.split(/(\s+)/).map((part, i) => (part.trim() ? <span key={i} className="nowrap">{part}</span> : part));
const SEVERITIES = ["HIGH", "MEDIUM", "LOW", "INFO"];
// Reuses the status-pill tones: HIGH red, MEDIUM amber, the rest grey.
const TONES = { HIGH: "rejected", MEDIUM: "pending" };
// The same severities as stat-card edge colours.
const TILE_TONES = { HIGH: "bad", MEDIUM: "warn", LOW: "info" };
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
  return <TonePill tone={TONES[value] ?? "inactive"}>{value}</TonePill>;
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
    { key: "occurred_at", label: "Time", render: (r) => <span className="nowrap">{formatDateTime(r.occurred_at)}</span> },
    { key: "severity", label: "Severity", render: (r) => <SeverityPill value={r.severity} /> },
    {
      key: "kind",
      label: "Kind",
      render: (r) => (
        <span className="mono" title={MEANING[r.kind]}>
          {r.kind}
        </span>
      ),
    },
    { key: "subject", label: "Subject", render: (r) => <span className="mono cell-wrap">{r.subject || "—"}</span> },
    { key: "detail", label: "Detail", render: (r) => <span className="cell-wrap">{r.detail ? unbrokenWords(r.detail) : "—"}</span> },
    { key: "repeats", label: "Repeats", render: (r) => (r.repeats > 1 ? `×${formatNumber(r.repeats)}` : "—") },
    { key: "inst_profile_name", label: "Institution", render: (r) => r.inst_profile_name || "—" },
    { key: "source", label: "Source", render: (r) => <span className="mono">{r.source || "—"}</span> },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Security"
        title="Security Events"
        subtitle={`What the platform's runtime watch has seen, newest first. Events appear within about a minute. Times are ${LOCAL_ZONE}.`}
        actions={
          <Button variant="secondary" onClick={() => setVersion((v) => v + 1)} icon="refresh">
            Reload
          </Button>
        }
      />

      {error && result?.items?.length > 0 && <Alert>{error}</Alert>}

      {/* Counts for the current filters; a tile filters by its severity, a
          second click clears it. */}
      <div className="stat-grid">
        {SEVERITIES.map((s) => (
          <StatCard
            key={s}
            label={s}
            value={formatNumber(counts[s] ?? 0)}
            hint={filters.severity === s ? "Filtering · click to clear" : "Click to filter"}
            tone={TILE_TONES[s]}
            selected={filters.severity === s}
            onClick={() => filterBy((f) => ({ ...f, severity: f.severity === s ? "" : s }))}
          />
        ))}
      </div>

      <div className="filter-bar">
        <TableSearchBar value={search} onChange={setSearch} placeholder="Search subject or detail…" />
        <Select label="Kind" placeholder="All kinds" value={filters.kind} onChange={set("kind")} options={KINDS.map(([value, meaning]) => ({ value, label: `${value} · ${meaning}` }))} />
        <Select label="Severity" placeholder="All" value={filters.severity} onChange={set("severity")} options={SEVERITIES.map((s) => ({ value: s, label: s }))} />
        <TextField label="From" type="date" value={filters.from} max={filters.to || undefined} onChange={set("from")} />
        <TextField label="To" type="date" value={filters.to} min={filters.from || undefined} onChange={set("to")} />
        {filtered && (
          <Button
            variant="ghost"
            icon="close"
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
        error={error}
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
