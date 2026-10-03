import { useCallback, useEffect, useState } from "react";
import { keysService } from "../services/keysService";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { DataTable } from "../../../components/ui/DataTable";
import { StatusPill } from "../../aml/components/StatusPill";
import { formatDateTime } from "../../aml/components/formatAml";
import "../../masterData/components/MasterDataPage.css";
import "../../../components/ui/TextField.css";
import "../../aml/components/Aml.css";
import "./EncryptionKeys.css";

const HEX64 = /^[0-9a-fA-F]{64}$/;

// One master key part. What is typed is never shown again: the field is a
// password box with no "show" switch, and it is emptied as soon as it is sent.
function ComponentEntry({ waiting, onDone }) {
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const valid = HEX64.test(value);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setIsSaving(true);
    setError(null);
    try {
      const reply = await keysService.enterComponent(value);
      setResult(reply);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setValue("");
      setIsSaving(false);
    }
  };

  return (
    <form className="keys__card keys__entry aml__stack" onSubmit={submit} autoComplete="off">
      <div>
        <h2 className="aml__section-title keys__card-title">{waiting ? "Second key part" : "Enter a key part"}</h2>
        <p className="aml__note">
          {waiting
            ? "The first part is in. The second custodian enters theirs within 15 minutes of it."
            : "Two custodians each enter one part of the master key. Done once per environment, or again to replace the master key."}
        </p>
      </div>
      {error && <div className="mdp__error">{error}</div>}
      <div className="tf">
        <label className="tf__label" htmlFor="key-component">
          Key part (64 hex characters)
        </label>
        <div className="tf__control">
          <input
            id="key-component"
            type="password"
            className="tf__input aml__mono"
            value={value}
            maxLength={64}
            spellCheck={false}
            autoComplete="new-password"
            onChange={(e) => setValue(e.target.value.trim())}
          />
        </div>
        <span className="aml__note keys__count">{value.length} / 64</span>
      </div>
      <div className="mdp__header-actions" style={{ justifyContent: "flex-end" }}>
        <Button type="submit" loading={isSaving} disabled={!valid}>
          Send key part
        </Button>
      </div>
      {result && (
        <div className="keys__result">
          <strong>{result.message}</strong>
          <span>
            Part check value <span className="aml__mono">{result.component_kcv}</span>
            {result.complete && (
              <>
                {" "}
                · master check value <span className="aml__mono">{result.master_kcv}</span>
              </>
            )}
          </span>
          {result.created_keys?.length > 0 && <span>Keys created: {result.created_keys.join(", ")}</span>}
          {result.rewrapped_keys > 0 && <span>Keys moved to the new master key: {result.rewrapped_keys}</span>}
        </div>
      )}
    </form>
  );
}

function RotateModal({ purpose, onClose, onRotated }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const rotate = async () => {
    setIsSaving(true);
    setError(null);
    try {
      onRotated(await keysService.rotate(purpose));
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  return (
    <Modal title={`Rotate the ${purpose} key`} onClose={onClose}>
      <div className="aml__stack">
        {error && <div className="mdp__error">{error}</div>}
        <p className="aml__note">
          A new version of the {purpose} key becomes active for everything protected from now on. Older versions keep working for what
          they already protect.
        </p>
        <div className="mdp__header-actions" style={{ justifyContent: "flex-end" }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" loading={isSaving} onClick={rotate}>
            Rotate
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function EncryptionKeysPage() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [rotating, setRotating] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      setState(await keysService.status());
      setError(null);
    } catch (err) {
      setError(err.message);
      setState((prev) => prev ?? {});
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const keys = state?.keys ?? [];
  const columns = [
    { key: "id", label: "Key", render: (k) => <span className="aml__name aml__mono">{k.id}</span> },
    { key: "purpose", label: "Purpose" },
    { key: "version", label: "Version" },
    { key: "active", label: "State", render: (k) => <StatusPill status={k.active ? "ACTIVE" : "RETIRED"} label={k.active ? "Active" : "Older version"} /> },
    { key: "kcv", label: "Check value (KCV)", render: (k) => <span className="aml__mono">{k.kcv}</span> },
    { key: "created", label: "Created", render: (k) => formatDateTime(k.created) },
  ];

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <span className="mdp__eyebrow">Security</span>
          <h1 className="mdp__title">Encryption Keys</h1>
          <p className="mdp__subtitle">The keys that protect PINs, card numbers and card security codes. A key is never shown, only its check value.</p>
        </div>
        <div className="mdp__header-actions">
          <Button variant="secondary" onClick={load}>
            Reload
          </Button>
        </div>
      </div>

      {error && <div className="mdp__error">{error}</div>}
      {notice && <div className="keys__result keys__notice">{notice}</div>}

      {state && (
        <div className="keys__card keys__status">
          <div>
            <span className="keys__label">State</span>
            <StatusPill status={state.ready ? "ACTIVE" : "FAILED"} label={state.ready ? "Ready" : "Not set up"} />
          </div>
          <div>
            <span className="keys__label">Master check value</span>
            <span className="aml__mono keys__kcv">{state.master_kcv || "—"}</span>
          </div>
          <div>
            <span className="keys__label">Created</span>
            <span>{formatDateTime(state.created)}</span>
          </div>
          {state.component_waiting && (
            <div>
              <span className="keys__label">Key ceremony</span>
              <StatusPill status="RUNNING" label="Waiting for the second part" />
            </div>
          )}
          {state.missing?.length > 0 && (
            <div className="keys__missing">
              <span className="keys__label">Missing keys</span>
              <span>{state.missing.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={state ? keys : null}
        isLoading={state === null}
        emptyMessage="No keys yet: enter both key parts to create them."
        actions={(k) =>
          k.active && (
            <button type="button" className="aml__text-btn" onClick={() => setRotating(k.purpose)}>
              Rotate
            </button>
          )
        }
      />

      <ComponentEntry waiting={Boolean(state?.component_waiting)} onDone={load} />

      {rotating && (
        <RotateModal
          purpose={rotating}
          onClose={() => setRotating(null)}
          onRotated={({ message }) => {
            setRotating(null);
            setNotice(message);
            load();
          }}
        />
      )}
    </div>
  );
}
