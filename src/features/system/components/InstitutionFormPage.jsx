import { useEffect, useState } from "react";
import { systemService } from "../services/systemService";
import { masterDataService } from "../../masterData/services/masterDataService";
import { rowLabel, rowValue, rowCode } from "../../../lib/rowLabel";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { renderStatusCell } from "../../../lib/renderStatusCell";
import { EntityManagerPage } from "./EntityManagerPage";
import "./SystemFormPage.css";
import "./ProfileFormPage.css";

// Per SYSTEM_API_GUIDE.md's example, values are uppercase (e.g. "MOBILE").
const LOGIN_IDENTIFIERS = ["USERNAME", "EMAIL", "MOBILE"];

const initialState = {
  code: "",
  name: "",
  type: "",
  timezone: "",
  languages: {}, // code -> bool, sent as a flat array — no default/supported split anymore
  date_format: "YYYY-MM-DD",
  has_branch: false,
  max_branches_allowed: "",
  kyc_enabled: false,
  total_kyc_levels: "",
  allow_downgrade_kyc: false,
  auto_approve_kyc_level: false,
  identifiers: { USERNAME: false, EMAIL: true, MOBILE: true },
  primary_login_identifier: "MOBILE",
  is_login_pin_enabled: false,
  login_pin_length: 6,
  login_pin_type: "NUMERIC",
  allow_biometric_login: false,
  is_txn_pin_enabled: false,
  txn_pin_length: 4,
  is_same_login_txn_pin_allowed: false,
};

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="mdp__checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

// Maps a full institution record (from listInstitutions/institution/profile/
// list) back into the form's state shape — language/allowed_login_identifiers
// come back as flat arrays, converted to the {code: true} maps the checkboxes
// use. Defensive against the one legacy bootstrap row that stores these as
// a bare {} instead of an array.
function stateFromRow(row) {
  const toMap = (arr) => Object.fromEntries((Array.isArray(arr) ? arr : []).map((v) => [v, true]));
  return {
    ...initialState,
    code: row.code ?? "",
    name: row.name ?? "",
    type: row.type ?? "",
    timezone: row.timezone ?? "",
    languages: toMap(row.language),
    date_format: row.date_format ?? "YYYY-MM-DD",
    has_branch: Boolean(row.has_branch),
    max_branches_allowed: row.max_branches_allowed ?? "",
    kyc_enabled: Boolean(row.kyc_enabled),
    total_kyc_levels: row.total_kyc_levels ?? "",
    allow_downgrade_kyc: Boolean(row.allow_downgrade_kyc),
    auto_approve_kyc_level: Boolean(row.auto_approve_kyc_level),
    identifiers: { USERNAME: false, EMAIL: false, MOBILE: false, ...toMap(row.allowed_login_identifiers) },
    primary_login_identifier: row.primary_login_identifier ?? "MOBILE",
    is_login_pin_enabled: Boolean(row.is_login_pin_enabled),
    login_pin_length: row.login_pin_length ?? 0,
    login_pin_type: row.login_pin_type || "NUMERIC",
    allow_biometric_login: Boolean(row.allow_biometric_login),
    is_txn_pin_enabled: Boolean(row.is_txn_pin_enabled),
    txn_pin_length: row.txn_pin_length ?? 0,
    is_same_login_txn_pin_allowed: Boolean(row.is_same_login_txn_pin_allowed),
  };
}

function InstitutionForm({ row, onSuccess, onCancel }) {
  const isEdit = Boolean(row);
  const [values, setValues] = useState(() => (isEdit ? stateFromRow(row) : initialState));
  const [institutionTypes, setInstitutionTypes] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    masterDataService
      .list("institution_type")
      .then((rows) => !cancelled && setInstitutionTypes(rows))
      .catch(() => !cancelled && setInstitutionTypes([]));

    masterDataService
      .list("language")
      .then((rows) => {
        if (cancelled) return;
        setLanguages(rows);
        // Only default-select a language when adding — editing should show
        // exactly what the institution already has, not force English on.
        if (isEdit) return;
        const codes = rows.map(rowCode);
        const fallback = codes.includes("en") ? "en" : codes[0];
        if (fallback) setValues((prev) => ({ ...prev, languages: { ...prev.languages, [fallback]: true } }));
      })
      .catch(() => !cancelled && setLanguages([]));

    return () => {
      cancelled = true;
    };
    // isEdit is fixed for this component instance's lifetime (a new modal
    // mounts per row), so this still only runs once.
  }, [isEdit]);

  const set = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const toggleIdentifier = (id, checked) =>
    setValues((prev) => ({ ...prev, identifiers: { ...prev.identifiers, [id]: checked } }));
  const toggleLanguage = (code, checked) =>
    setValues((prev) => ({ ...prev, languages: { ...prev.languages, [code]: checked } }));

  const selectedIdentifiers = LOGIN_IDENTIFIERS.filter((id) => values.identifiers[id]);
  const selectedLanguageCodes = Object.keys(values.languages).filter((code) => values.languages[code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      // Per SYSTEM_API_GUIDE.md: language and allowed_login_identifiers are
      // flat string arrays, not nested {default, supported} / {identifiers}
      // objects — and the identifier values are uppercase.
      const payload = {
        code: values.code,
        name: values.name,
        type: Number(values.type) || 0,
        timezone: values.timezone,
        language: selectedLanguageCodes,
        date_format: values.date_format,
        has_branch: values.has_branch,
        max_branches_allowed: Math.max(0, Number(values.max_branches_allowed) || 0),
        kyc_enabled: values.kyc_enabled,
        total_kyc_levels: Math.max(0, Number(values.total_kyc_levels) || 0),
        allow_downgrade_kyc: values.allow_downgrade_kyc,
        auto_approve_kyc_level: values.auto_approve_kyc_level,
        allowed_login_identifiers: selectedIdentifiers,
        primary_login_identifier: values.primary_login_identifier,
        is_login_pin_enabled: values.is_login_pin_enabled,
        login_pin_length: Math.max(0, Number(values.login_pin_length) || 0),
        login_pin_type: values.login_pin_type,
        allow_biometric_login: values.allow_biometric_login,
        is_txn_pin_enabled: values.is_txn_pin_enabled,
        txn_pin_length: Math.max(0, Number(values.txn_pin_length) || 0),
        is_same_login_txn_pin_allowed: values.is_same_login_txn_pin_allowed,
      };

      if (isEdit) {
        await systemService.editInstitution({ id: rowValue(row), ...payload });
      } else {
        await systemService.addInstitution(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="sfp__form ifp__form" onSubmit={handleSubmit}>
      {error && <div className="mdp__error">{error}</div>}

      <div className="ifp__grid">
        <TextField label="Code" required value={values.code} onChange={(e) => set("code", e.target.value)} />
        <TextField label="Name" required value={values.name} onChange={(e) => set("name", e.target.value)} />
        <Select
          label="Type"
          placeholder="Select institution type"
          required
          options={institutionTypes.map((row) => ({ value: rowValue(row), label: rowLabel(row) }))}
          value={values.type}
          onChange={(e) => set("type", e.target.value)}
        />
        <TextField
          label="Timezone"
          placeholder="Asia/Kolkata"
          value={values.timezone}
          onChange={(e) => set("timezone", e.target.value)}
        />
      </div>

      <h2 className="pfp__section-title">Languages</h2>
      <div className="ifp__checks">
        {languages.map((row) => {
          const code = rowCode(row);
          return (
            <Checkbox
              key={code}
              label={rowLabel(row)}
              checked={Boolean(values.languages[code])}
              onChange={(v) => toggleLanguage(code, v)}
            />
          );
        })}
      </div>

      <h2 className="pfp__section-title">Branches &amp; KYC</h2>
      <div className="ifp__grid">
        <TextField
          label="Date format"
          value={values.date_format}
          onChange={(e) => set("date_format", e.target.value)}
        />
        <TextField
          label="Max branches allowed"
          type="number"
          value={values.max_branches_allowed}
          onChange={(e) => set("max_branches_allowed", e.target.value)}
        />
        <TextField
          label="Total KYC levels"
          type="number"
          value={values.total_kyc_levels}
          onChange={(e) => set("total_kyc_levels", e.target.value)}
        />
      </div>
      <div className="ifp__checks">
        <Checkbox label="Has branches" checked={values.has_branch} onChange={(v) => set("has_branch", v)} />
        <Checkbox label="KYC enabled" checked={values.kyc_enabled} onChange={(v) => set("kyc_enabled", v)} />
        <Checkbox
          label="Allow KYC downgrade"
          checked={values.allow_downgrade_kyc}
          onChange={(v) => set("allow_downgrade_kyc", v)}
        />
        <Checkbox
          label="Auto-approve KYC level"
          checked={values.auto_approve_kyc_level}
          onChange={(v) => set("auto_approve_kyc_level", v)}
        />
      </div>

      <h2 className="pfp__section-title">Login identifiers</h2>
      <div className="ifp__checks">
        {LOGIN_IDENTIFIERS.map((id) => (
          <Checkbox
            key={id}
            label={id[0] + id.slice(1).toLowerCase()}
            checked={values.identifiers[id]}
            onChange={(v) => toggleIdentifier(id, v)}
          />
        ))}
      </div>
      <Select
        label="Primary login identifier"
        options={selectedIdentifiers.map((id) => ({ value: id, label: id[0] + id.slice(1).toLowerCase() }))}
        value={values.primary_login_identifier}
        onChange={(e) => set("primary_login_identifier", e.target.value)}
      />

      <h2 className="pfp__section-title">Login &amp; transaction PIN</h2>
      <div className="ifp__checks">
        <Checkbox
          label="Login PIN enabled"
          checked={values.is_login_pin_enabled}
          onChange={(v) => set("is_login_pin_enabled", v)}
        />
        <Checkbox
          label="Allow biometric login"
          checked={values.allow_biometric_login}
          onChange={(v) => set("allow_biometric_login", v)}
        />
        <Checkbox
          label="Transaction PIN enabled"
          checked={values.is_txn_pin_enabled}
          onChange={(v) => set("is_txn_pin_enabled", v)}
        />
        <Checkbox
          label="Allow same login/txn PIN"
          checked={values.is_same_login_txn_pin_allowed}
          onChange={(v) => set("is_same_login_txn_pin_allowed", v)}
        />
      </div>
      <div className="ifp__grid">
        <TextField
          label="Login PIN length"
          type="number"
          value={values.login_pin_length}
          onChange={(e) => set("login_pin_length", e.target.value)}
        />
        <Select
          label="Login PIN type"
          options={[
            { value: "NUMERIC", label: "Numeric" },
            { value: "ALPHANUMERIC", label: "Alphanumeric" },
          ]}
          value={values.login_pin_type}
          onChange={(e) => set("login_pin_type", e.target.value)}
        />
        <TextField
          label="Transaction PIN length"
          type="number"
          value={values.txn_pin_length}
          onChange={(e) => set("txn_pin_length", e.target.value)}
        />
      </div>

      <div className="pfp__form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving}>
          {isEdit ? "Save Changes" : "Create Institution"}
        </Button>
      </div>
    </form>
  );
}

export function InstitutionFormPage() {
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await systemService.deleteInstitution({ id: rowValue(deleteTarget) });
      setDeleteTarget(null);
      bumpRefresh();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <EntityManagerPage
        key={refreshKey}
        title="Institutions"
        eyebrow="Registry"
        subtitle="Institutions created via the system API."
        addLabel="Add Institution"
        columns={[
          { key: "id", label: "ID", render: (row) => rowValue(row) ?? "—" },
          { key: "name", label: "Name", render: (row) => rowLabel(row) },
          { key: "auth_status", label: "Status", narrow: true, render: renderStatusCell },
        ]}
        loadRows={() => systemService.listInstitutions()}
        renderForm={({ onSuccess, onCancel }) => <InstitutionForm onSuccess={onSuccess} onCancel={onCancel} />}
        actions={(row) => (
          <>
            <button className="dt__icon-btn" onClick={() => setEditTarget(row)} aria-label="Edit">
              ✎
            </button>
            <button className="dt__icon-btn dt__icon-btn--danger" onClick={() => setDeleteTarget(row)} aria-label="Delete">
              🗑
            </button>
          </>
        )}
      />

      {editTarget && (
        <Modal title="Edit Institution" onClose={() => setEditTarget(null)} width={780}>
          <InstitutionForm
            row={editTarget}
            onSuccess={() => {
              setEditTarget(null);
              bumpRefresh();
            }}
            onCancel={() => setEditTarget(null)}
          />
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete Institution"
          onClose={() => setDeleteTarget(null)}
          width={400}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
                Delete
              </Button>
            </>
          }
        >
          {deleteError && <div className="mdp__error">{deleteError}</div>}
          <p>
            Are you sure you want to delete <strong>{rowLabel(deleteTarget)}</strong>?
          </p>
        </Modal>
      )}
    </>
  );
}
