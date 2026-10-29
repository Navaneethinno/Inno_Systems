import { useCallback, useEffect, useState } from "react";
import { keysService } from "../services/keysService";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { DataTable } from "../../../components/ui/DataTable";
import { Select } from "../../../components/ui/Select";
import { TextField } from "../../../components/ui/TextField";
import { StatusPill } from "../../aml/components/StatusPill";
import { formatDateTime } from "../../aml/components/formatAml";
import { ConfirmModal, KeysTab, RotateNote } from "./KeysTab";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Alert } from "../../../components/ui/Alert";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SkeletonList } from "../../../components/ui/Skeleton";
import "./EncryptionKeys.css";

const TABS = [
  ["keys", "Keys"],
  ["custodians", "Custodians"],
  ["rotation", "Rotation"],
];

// SYSTEM › Key Custody: the platform's keys (check values only), who holds
// the master key components (slot A / slot B custodians), and how often
// each key changes.
export function KeyCustodyPage() {
  const [tab, setTab] = useState("keys");
  return (
    <div className="page">
      <PageHeader
        eyebrow="System"
        title="Key Custody"
        subtitle="The keys that protect PINs, card numbers and card security codes, the custodians who unlock them, and their rotation. A key is never shown, only its check value."
      />
      <div className="tabs" role="tablist" aria-label="Key Custody">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`tabs__tab ${tab === key ? "tabs__tab--active" : ""}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      <div className="stack" role="tabpanel">
        {tab === "keys" && <KeysTab />}
        {tab === "custodians" && <CustodiansTab />}
        {tab === "rotation" && <RotationTab />}
      </div>
    </div>
  );
}

// Slot A and slot B, each with its custodians (a primary and a backup).
function CustodiansTab() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [notice, setNotice] = useState(null);
  const load = useCallback(async () => {
    try {
      setRows(await keysService.listCustodians());
      setError(null);
    } catch (err) {
      setError(err.message);
      setRows((prev) => prev ?? []);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const done = ({ message }) => {
    setAdding(null);
    setRemoving(null);
    setNotice(message);
    load();
  };
  const slots = ["A", "B"].map((slot) => [slot, (rows ?? []).filter((c) => c.slot === slot)]);
  const short = slots.some(([, list]) => list.length < 2);
  const noEmail = (rows ?? []).filter((c) => !c.email);
  return (
    <>
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {rows && short && <Alert tone="warning">Each slot needs a primary and a backup.</Alert>}
      {noEmail.length > 0 && (
        <Alert tone="warning">No email for {noEmail.map((c) => c.user_name).join(", ")}: they cannot be called when the keys lock.</Alert>
      )}
      {!rows ? (
        <SkeletonList count={2} height={140} />
      ) : (
        <div className="keys__slots">
          {slots.map(([slot, list]) => (
            <div key={slot} className="card keys__slot">
              <div className="keys__slot-head">
                <span className="keys__slot-badge">{slot}</span>
                <h2 className="section-title">Slot {slot}</h2>
                <Button variant="secondary" size="sm" icon="plus" onClick={() => setAdding(slot)}>
                  Add custodian
                </Button>
              </div>
              {list.length === 0 && <EmptyState plain icon="alert" message={`Nobody holds slot ${slot}.`} />}
              {list.map((c) => (
                <div key={c.id} className="keys__custodian">
                  <div>
                    <span className="cell-title">{c.user_name}</span>
                    <span className="cell-sub">{[c.inst_profile_name, c.email || "no email"].join(" · ")}</span>
                    {c.narration && <span className="cell-sub">{c.narration}</span>}
                  </div>
                  <div className="keys__badges">
                    <StatusPill status={c.role === "PRIMARY" ? "ACTIVE" : "RETIRED"} label={c.role === "PRIMARY" ? "Primary" : "Backup"} />
                    <button type="button" className="text-btn" onClick={() => setRemoving(c)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {adding && <AddCustodianModal slot={adding} onClose={() => setAdding(null)} onDone={done} />}
      {removing && (
        <ConfirmModal title={`Remove ${removing.user_name} from slot ${removing.slot}`} confirmLabel="Remove" run={() => keysService.removeCustodian(removing.id)} onClose={() => setRemoving(null)} onDone={done}>
          <p className="note">If they leave the bank, their slot&apos;s component should be replaced (a new key ceremony).</p>
        </ConfirmModal>
      )}
    </>
  );
}

function AddCustodianModal({ slot, onClose, onDone }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ user_id: "", role: "PRIMARY", narration: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  // Searched on the server: the first 100 matches.
  useEffect(() => {
    const timer = setTimeout(() => {
      keysService
        .listStaffUsers(search.trim())
        .then(setUsers)
        .catch((err) => setError(err.message));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      onDone(await keysService.addCustodian({ user_id: Number(form.user_id), slot, role: form.role, ...(form.narration.trim() ? { narration: form.narration.trim() } : {}) }));
    } catch (err) {
      setError(err.message);
      setIsSaving(false);
    }
  };
  return (
    <Modal title={`Add a slot ${slot} custodian`} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        {error && <Alert>{error}</Alert>}
        <TextField label="Find a user" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Username" />
        <Select
          label="Staff user"
          placeholder="Choose a user"
          value={form.user_id}
          onChange={set("user_id")}
          options={users.map((u) => ({ value: String(u.user_id), label: [u.username, u.inst_profile_name].filter(Boolean).join(" · ") }))}
        />
        <Select label="Role" value={form.role} onChange={set("role")} options={[{ value: "PRIMARY", label: "Primary" }, { value: "BACKUP", label: "Backup" }]} />
        <TextField label="Note (optional)" value={form.narration} onChange={set("narration")} placeholder="Treasury head" />
        <p className="note">Nobody may hold both slots. The custodian enters their component in the admin portal.</p>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSaving} disabled={!form.user_id}>
            Add
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Each key's rotation period and Auto switch; Rotate now for a data key.
function RotationTab() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [rotating, setRotating] = useState(null);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const load = useCallback(async () => {
    try {
      setRows(await keysService.listPolicies());
      setError(null);
    } catch (err) {
      setError(err.message);
      setRows((prev) => prev ?? []);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const update = async (body) => {
    setBusy(body.purpose);
    setError(null);
    try {
      setNotice((await keysService.updatePolicy(body)).message);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };
  const columns = [
    {
      key: "purpose",
      label: "Key",
      render: (p) => (
        <>
          <span className="cell-title mono">{p.purpose}</span>
          <span className="cell-sub">{p.description}</span>
        </>
      ),
    },
    { key: "active_key", label: "Active version", render: (p) => <span className="mono">{p.active_key || "—"}</span> },
    { key: "since", label: "In use since", render: (p) => formatDateTime(p.since) },
    { key: "rotate_days", label: "Rotation period", render: (p) => (Number(p.rotate_days) === 0 ? "By hand only" : `${p.rotate_days} days`) },
    {
      key: "due_at",
      label: "Next due",
      render: (p) => (
        <span className="keys__badges">
          {Number(p.rotate_days) === 0 ? "—" : formatDateTime(p.due_at)}
          {p.due && <StatusPill status="FAILED" label="Due" />}
        </span>
      ),
    },
    {
      key: "auto_rotate",
      label: "Auto",
      render: (p) => (
        <button
          type="button"
          role="switch"
          aria-checked={!!p.auto_rotate}
          aria-label={`Auto rotation for ${p.purpose}`}
          title={p.auto_allowed ? "Rotated by the nightly job when due" : "This key cannot rotate by itself"}
          className={`switch ${p.auto_rotate ? "switch--on" : ""}`}
          disabled={!p.auto_allowed || busy === p.purpose}
          onClick={() => update({ purpose: p.purpose, rotate_days: Number(p.rotate_days), auto_rotate: !p.auto_rotate })}
        />
      ),
    },
  ];
  return (
    <>
      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      <p className="note">
        The nightly job (KEY_ROTATION, 02:30) rotates the keys set to Auto when due, and reports the others. A new master key is a custodians&apos; ceremony.
      </p>
      <DataTable
        columns={columns}
        rows={rows}
        isLoading={rows === null}
        emptyMessage="No rotation policies."
        actions={(p) => (
          <>
            <button type="button" className="text-btn" onClick={() => setEditing(p)}>
              Change period
            </button>
            {p.purpose !== "MASTER" && (
              <button type="button" className="text-btn" onClick={() => setRotating(p.purpose)}>
                Rotate now
              </button>
            )}
          </>
        )}
      />
      {editing && <PeriodModal policy={editing} busy={busy === editing.purpose} onClose={() => setEditing(null)} onSave={(days) => update({ purpose: editing.purpose, rotate_days: days, auto_rotate: Boolean(editing.auto_rotate) })} />}
      {rotating && (
        <ConfirmModal
          title={`Rotate the ${rotating} key`}
          confirmLabel="Rotate"
          run={() => keysService.rotate(rotating)}
          onClose={() => setRotating(null)}
          onDone={({ message }) => {
            setRotating(null);
            setNotice(message);
            load();
          }}
        >
          <RotateNote purpose={rotating} />
        </ConfirmModal>
      )}
    </>
  );
}

function PeriodModal({ policy, busy, onClose, onSave }) {
  const [days, setDays] = useState(String(policy.rotate_days ?? 0));
  const n = Number(days);
  const valid = days !== "" && Number.isInteger(n) && n >= 0 && n <= 3650;
  return (
    <Modal title={`Rotation period · ${policy.purpose}`} onClose={onClose}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(n);
        }}
      >
        <TextField label="Rotate every (days)" type="number" min={0} max={3650} value={days} onChange={(e) => setDays(e.target.value)} error={valid ? null : "0 to 3650 days"} />
        <p className="note">0 means by hand only.</p>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy} disabled={!valid}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
