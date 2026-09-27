import { useCallback, useEffect, useRef, useState } from "react";
import { amlService } from "../services/amlService";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { DataTable } from "../../../components/ui/DataTable";
import { formatBytes, formatDateTime, formatNumber } from "./formatAml";
import { StatusPill } from "./StatusPill";
import "../../masterData/components/MasterDataPage.css";
import "./Aml.css";

// After a refresh or a first-time load starts in the background, re-read the
// list every few seconds for a while so the new version shows up on its own.
const POLL_MS = 5000;
const POLL_FOR_MS = 3 * 60 * 1000;

function VersionsModal({ watchlist, onClose }) {
  const [versions, setVersions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    amlService
      .listWatchlistVersions(watchlist.code, 20)
      .then(setVersions)
      .catch((err) => setError(err.message));
  }, [watchlist.code]);

  const columns = [
    { key: "id", label: "#", narrow: true },
    { key: "status", label: "Status", render: (v) => <StatusPill status={v.status} /> },
    { key: "record_count", label: "Records", render: (v) => formatNumber(v.record_count) },
    { key: "skipped_count", label: "Skipped", render: (v) => formatNumber(v.skipped_count) },
    { key: "file_size", label: "Size", render: (v) => formatBytes(v.file_size) },
    { key: "triggered_by", label: "Triggered by" },
    { key: "started_at", label: "Started", render: (v) => formatDateTime(v.started_at) },
    { key: "finished_at", label: "Finished", render: (v) => formatDateTime(v.finished_at) },
    {
      key: "index_name",
      label: "Index / error",
      render: (v) => (
        <>
          <span className="aml__mono">{v.index_name || "—"}</span>
          {v.error && <span className="aml__row-error">{v.error}</span>}
        </>
      ),
    },
  ];

  return (
    <Modal title={`History — ${watchlist.name}`} onClose={onClose} width={1100}>
      {error && <div className="mdp__error">{error}</div>}
      <DataTable columns={columns} rows={versions} isLoading={!versions && !error} emptyMessage="No versions yet." />
    </Modal>
  );
}

function EnableConfirmModal({ watchlist, onConfirm, onClose, isSaving }) {
  return (
    <Modal
      title={`Switch on ${watchlist.name}?`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={isSaving}>
            Switch on
          </Button>
        </>
      }
    >
      <div className="aml__stack">
        <p className="aml__note">
          <strong>Licence:</strong> {watchlist.licence_note}
        </p>
        <p className="aml__note">
          Screening searches this list as soon as it is loaded. If it has never been loaded, loading runs in the
          background and can take a few minutes.
        </p>
      </div>
    </Modal>
  );
}

export function WatchlistsPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyCode, setBusyCode] = useState(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);
  const [confirmEnable, setConfirmEnable] = useState(null);
  const pollUntil = useRef(0);

  const load = useCallback(async () => {
    try {
      setRows(await amlService.listWatchlists());
      setError(null);
    } catch (err) {
      setError(err.message);
      setRows((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (Date.now() < pollUntil.current) load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const startPolling = () => {
    pollUntil.current = Date.now() + POLL_FOR_MS;
  };

  const setEnabled = async (watchlist, enabled) => {
    setBusyCode(watchlist.code);
    setError(null);
    setNotice(null);
    try {
      const result = await amlService.setWatchlistEnabled(watchlist.code, enabled);
      if (result.watchlist) {
        setRows((prev) => prev.map((r) => (r.code === watchlist.code ? result.watchlist : r)));
      }
      if (result.loading) {
        setNotice(`${watchlist.name} is loading in the background — this can take a few minutes.`);
        startPolling();
      } else if (result.message) {
        setNotice(result.message);
      }
      setConfirmEnable(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyCode(null);
    }
  };

  const onToggle = (watchlist) => {
    // Lists that start off (OpenSanctions) need a commercial licence — make
    // the admin read the licence note before switching one on.
    if (!watchlist.enabled && watchlist.licence_note) setConfirmEnable(watchlist);
    else setEnabled(watchlist, !watchlist.enabled);
  };

  const refresh = async (codes) => {
    const single = codes?.[0];
    if (single) setBusyCode(single);
    else setRefreshingAll(true);
    setError(null);
    setNotice(null);
    try {
      const envelope = await amlService.refreshWatchlists(codes);
      setNotice(envelope.message || "Refresh started in the background.");
      startPolling();
    } catch (err) {
      setError(err.message || (err.status === 409 ? "A refresh is already running." : "Refresh failed."));
    } finally {
      setBusyCode(null);
      setRefreshingAll(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (w) => (
        <>
          <span className="aml__name">{w.name}</span>
          <span className="aml__sub aml__mono">{w.code}</span>
          {w.last_error && <span className="aml__row-error">{w.last_error}</span>}
        </>
      ),
    },
    { key: "category", label: "Category" },
    { key: "publisher", label: "Publisher" },
    {
      key: "record_count",
      label: "Records",
      render: (w) => (w.active_version ? formatNumber(w.active_version.record_count) : "Not loaded"),
    },
    {
      key: "loaded_at",
      label: "Loaded",
      render: (w) =>
        !w.active_version ? (
          "Not loaded"
        ) : w.active_version.status === "LOADING" ? (
          <StatusPill status="LOADING" />
        ) : (
          formatDateTime(w.active_version.finished_at)
        ),
    },
    { key: "last_checked_at", label: "Last checked", render: (w) => formatDateTime(w.last_checked_at) },
    {
      key: "enabled",
      label: "On/off",
      render: (w) => (
        <span className="aml__switch-cell">
          <button
            type="button"
            role="switch"
            aria-checked={!!w.enabled}
            aria-label={`${w.enabled ? "Switch off" : "Switch on"} ${w.name}`}
            className={`aml__switch ${w.enabled ? "aml__switch--on" : ""}`}
            disabled={busyCode === w.code}
            onClick={() => onToggle(w)}
          />
          {w.licence_note && (
            <span className="aml__licence" title={w.licence_note}>
              Licence
            </span>
          )}
        </span>
      ),
    },
  ];

  // Flatten nested fields so DataTable's column sort works on them.
  const tableRows = rows?.map((w) => ({
    ...w,
    record_count: w.active_version?.record_count ?? null,
    loaded_at: w.active_version?.finished_at ?? "",
  }));

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <span className="mdp__eyebrow">AML</span>
          <h1 className="mdp__title">Watchlists</h1>
          <p className="mdp__subtitle">Sanctions, PEP and crime lists customers are screened against.</p>
        </div>
        <div className="mdp__header-actions">
          <Button variant="secondary" onClick={load}>
            Reload
          </Button>
          <Button onClick={() => refresh()} loading={refreshingAll}>
            Refresh all now
          </Button>
        </div>
      </div>

      {error && <div className="mdp__error">{error}</div>}
      {notice && <div className="mdp__success">{notice}</div>}

      <DataTable
        columns={columns}
        rows={tableRows}
        isLoading={rows === null}
        emptyMessage="No watchlists."
        actions={(w) => (
          <>
            <button
              type="button"
              className="aml__text-btn"
              disabled={!w.enabled || busyCode === w.code}
              title={w.enabled ? "Check the publisher for a new version" : "Switch the list on first"}
              onClick={() => refresh([w.code])}
            >
              Refresh
            </button>
            <button type="button" className="aml__text-btn" onClick={() => setHistoryFor(w)}>
              History
            </button>
          </>
        )}
      />

      {historyFor && <VersionsModal watchlist={historyFor} onClose={() => setHistoryFor(null)} />}
      {confirmEnable && (
        <EnableConfirmModal
          watchlist={confirmEnable}
          isSaving={busyCode === confirmEnable.code}
          onConfirm={() => setEnabled(confirmEnable, true)}
          onClose={() => setConfirmEnable(null)}
        />
      )}
    </div>
  );
}
