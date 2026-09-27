import { useCallback, useEffect, useState } from "react";
import { amlService } from "../services/amlService";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { TextField } from "../../../components/ui/TextField";
import { DataTable } from "../../../components/ui/DataTable";
import { formatDateTime, formatNumber } from "./formatAml";
import { StatusPill } from "./StatusPill";
import "../../masterData/components/MasterDataPage.css";
import "./Aml.css";

// Jobs flip `running` and re-screening runs finish on their own — while
// anything is in flight, re-read both tables every few seconds.
const POLL_MS = 5000;
const MAX_INTERVAL = 10080; // 7 days, the server's limit

function formatInterval(minutes) {
  if (!minutes) return "—";
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"}`;
  if (minutes % 60 === 0) return `${minutes / 60} h`;
  return `${minutes} min`;
}

function IntervalModal({ job, onSaved, onClose }) {
  const [value, setValue] = useState(String(job.interval_minutes ?? ""));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_INTERVAL) {
      setError(`Interval must be a whole number between 1 and ${MAX_INTERVAL} minutes.`);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      onSaved(await amlService.setJob({ code: job.code, interval_minutes: minutes }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal title={`Interval — ${job.name}`} onClose={onClose}>
      <form className="aml__stack" onSubmit={handleSubmit}>
        {error && <div className="mdp__error">{error}</div>}
        <TextField
          label="Run every (minutes)"
          type="number"
          min={1}
          max={MAX_INTERVAL}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className="aml__note">Between 1 and {MAX_INTERVAL} (7 days). The new interval counts from the last run.</p>
        <div className="mdp__header-actions" style={{ justifyContent: "flex-end" }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSaving}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function BackgroundJobsPage() {
  const [jobs, setJobs] = useState(null);
  const [runs, setRuns] = useState(null);
  const [error, setError] = useState(null);
  const [busyCode, setBusyCode] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const [jobsResult, runsResult] = await Promise.allSettled([
      amlService.listJobs(),
      amlService.listRescreenRuns(20),
    ]);
    setJobs(jobsResult.status === "fulfilled" ? jobsResult.value : (prev) => prev ?? []);
    setRuns(runsResult.status === "fulfilled" ? runsResult.value : (prev) => prev ?? []);
    const failed = [jobsResult, runsResult].find((r) => r.status === "rejected");
    setError(failed ? failed.reason.message : null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const anyRunning = jobs?.some((j) => j.running) || runs?.some((r) => r.status === "RUNNING");
  useEffect(() => {
    if (!anyRunning) return undefined;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [anyRunning, load]);

  const replaceJob = (updated) => {
    if (updated?.code) setJobs((prev) => prev.map((j) => (j.code === updated.code ? updated : j)));
  };

  const toggleJob = async (job) => {
    setBusyCode(job.code);
    setError(null);
    try {
      replaceJob(await amlService.setJob({ code: job.code, enabled: !job.enabled }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyCode(null);
    }
  };

  const jobColumns = [
    {
      key: "name",
      label: "Job",
      render: (j) => (
        <>
          <span className="aml__name">{j.name}</span>
          <span className="aml__sub aml__mono">{j.code}</span>
        </>
      ),
    },
    { key: "interval_minutes", label: "Interval", render: (j) => formatInterval(j.interval_minutes) },
    {
      key: "last_status",
      label: "Last status",
      render: (j) => (
        <>
          {j.running ? <StatusPill status="RUNNING" /> : <StatusPill status={j.last_status} />}
          {j.last_error && <span className="aml__row-error">{j.last_error}</span>}
        </>
      ),
    },
    { key: "last_started_at", label: "Last started", render: (j) => formatDateTime(j.last_started_at) },
    { key: "last_finished_at", label: "Last finished", render: (j) => formatDateTime(j.last_finished_at) },
    { key: "next_run_at", label: "Next run", render: (j) => (j.enabled ? formatDateTime(j.next_run_at) : "Off") },
    {
      key: "enabled",
      label: "On/off",
      render: (j) => (
        <button
          type="button"
          role="switch"
          aria-checked={!!j.enabled}
          aria-label={`${j.enabled ? "Switch off" : "Switch on"} ${j.name}`}
          className={`aml__switch ${j.enabled ? "aml__switch--on" : ""}`}
          disabled={busyCode === j.code}
          onClick={() => toggleJob(j)}
        />
      ),
    },
  ];

  const runColumns = [
    { key: "id", label: "#", narrow: true },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <>
          <StatusPill status={r.status} />
          {r.error && <span className="aml__row-error">{r.error}</span>}
        </>
      ),
    },
    { key: "triggered_by", label: "Triggered by" },
    { key: "started_at", label: "Started", render: (r) => formatDateTime(r.started_at) },
    { key: "finished_at", label: "Finished", render: (r) => formatDateTime(r.finished_at) },
    { key: "institutions", label: "Institutions", render: (r) => formatNumber(r.institutions) },
    { key: "customers", label: "Customers", render: (r) => formatNumber(r.customers) },
    { key: "screened", label: "Screened", render: (r) => formatNumber(r.screened) },
    { key: "changed", label: "Changed", render: (r) => formatNumber(r.changed) },
    { key: "errors", label: "Errors", render: (r) => formatNumber(r.errors) },
    {
      key: "indices",
      label: "List versions",
      sortable: false,
      render: (r) =>
        r.indices?.length ? (
          <span className="aml__mono" title={r.indices.join("\n")}>
            {r.indices.length} version{r.indices.length === 1 ? "" : "s"}
          </span>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <span className="mdp__eyebrow">AML</span>
          <h1 className="mdp__title">Background Jobs</h1>
          <p className="mdp__subtitle">The scheduled jobs that keep watchlists and ongoing screening up to date.</p>
        </div>
        <div className="mdp__header-actions">
          <Button variant="secondary" onClick={load}>
            Reload
          </Button>
        </div>
      </div>

      {error && <div className="mdp__error">{error}</div>}

      <DataTable
        columns={jobColumns}
        rows={jobs}
        isLoading={jobs === null}
        emptyMessage="No jobs."
        actions={(j) => (
          <button type="button" className="aml__text-btn" onClick={() => setEditing(j)}>
            Change interval
          </button>
        )}
      />

      <h2 className="aml__section-title">Re-screening Runs</h2>
      <p className="aml__note" style={{ marginBottom: 12 }}>
        Ongoing Re-Screening runs after every list change and re-screens only when the searched list versions changed.
        Hover “List versions” to see which ones a run used.
      </p>
      <DataTable columns={runColumns} rows={runs} isLoading={runs === null} emptyMessage="No re-screening runs yet." />

      {editing && (
        <IntervalModal
          job={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            replaceJob(updated);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
