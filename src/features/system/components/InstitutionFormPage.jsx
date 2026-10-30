import { useEffect, useState } from "react";
import { systemService } from "../services/systemService";
import { masterDataService } from "../../masterData/services/masterDataService";
import { rowLabel, rowValue, rowCode } from "../../../lib/rowLabel";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Alert } from "../../../components/ui/Alert";
import { renderStatusCell } from "../../../lib/renderStatusCell";
import { EntityManagerPage } from "./EntityManagerPage";
import { RowActions } from "./RowActions";
import { API } from "../../../api/endpoints";
import { identifierCodes, identifierObject, languageCodes, languageObject } from "../../../lib/institutionShape";
import { statusCode } from "../../../lib/statusCodes";

// Per SYSTEM_API_GUIDE.md's example, values are uppercase (e.g. "MOBILE").
const LOGIN_IDENTIFIERS = ["USERNAME", "EMAIL", "MOBILE"];

const initialState = {
  code: "",
  name: "",
  type: "",
  timezone: "",
  languages: {}, // code -> bool; sent as { default, supported }
  default_language: "",
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
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

// Maps a full institution record (from /institution/profile/list) back into
// the form's state shape; see lib/institutionShape.js for the stored shapes.
function stateFromRow(row) {
  const toMap = (arr) => Object.fromEntries(arr.map((v) => [v, true]));
  return {
    ...initialState,
    code: row.code ?? "",
    name: row.name ?? "",
    type: row.type ?? "",
    timezone: row.timezone ?? "",
    languages: toMap(languageCodes(row.language)),
    default_language: row.language?.default ?? "",
    date_format: row.date_format ?? "YYYY-MM-DD",
    has_branch: Boolean(row.has_branch),
    max_branches_allowed: row.max_branches_allowed ?? "",
    kyc_enabled: Boolean(row.kyc_enabled),
    total_kyc_levels: row.total_kyc_levels ?? "",
    allow_downgrade_kyc: Boolean(row.allow_downgrade_kyc),
    auto_approve_kyc_level: Boolean(row.auto_approve_kyc_level),
    identifiers: { USERNAME: false, EMAIL: false, MOBILE: false, ...toMap(identifierCodes(row.allowed_login_identifiers)) },
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

  // A draft stays with its maker until submitted (backend round 6): adding
  // can save one (is_draft), an edit keeps it a draft, and Submit saves the
  // edit then calls /institution/profile/submit, which for the System user
  // makes it active at once.
  const isDraft = isEdit && statusCode(row.status) === 9;

  const handleSubmit = async (e, { asDraft = false } = {}) => {
    e?.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      // The stored shapes, as the backend asks: language as
      // { default, supported } and login identifiers as lowercase flags.
      const payload = {
        code: values.code,
        name: values.name,
        type: Number(values.type) || 0,
        timezone: values.timezone,
        language: languageObject(selectedLanguageCodes, values.default_language),
        date_format: values.date_format,
        has_branch: values.has_branch,
        max_branches_allowed: Math.max(0, Number(values.max_branches_allowed) || 0),
        kyc_enabled: values.kyc_enabled,
        total_kyc_levels: Math.max(0, Number(values.total_kyc_levels) || 0),
        allow_downgrade_kyc: values.allow_downgrade_kyc,
        auto_approve_kyc_level: values.auto_approve_kyc_level,
        allowed_login_identifiers: identifierObject(selectedIdentifiers),
        primary_login_identifier: values.primary_login_identifier,
        is_login_pin_enabled: values.is_login_pin_enabled,
        login_pin_length: Math.max(0, Number(values.login_pin_length) || 0),
        login_pin_type: values.login_pin_type,
        allow_biometric_login: values.allow_biometric_login,
        is_txn_pin_enabled: values.is_txn_pin_enabled,
        txn_pin_length: Math.max(0, Number(values.txn_pin_length) || 0),
        is_same_login_txn_pin_allowed: values.is_same_login_txn_pin_allowed,
        ...(asDraft || isDraft ? { is_draft: true } : {}),
      };

      if (isEdit) {
        await systemService.editInstitution({ id: rowValue(row), ...payload });
        if (isDraft && !asDraft) await systemService.submitInstitution(rowValue(row));
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
    <form className="stack" onSubmit={handleSubmit}>
      {error && <Alert>{error}</Alert>}

      <section className="form-section">
        <h2 className="form-section__title">Identity</h2>
        <div className="form-grid">
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
      </section>

      <section className="form-section">
        <h2 className="form-section__title">Languages</h2>
        <div className="check-group">
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
        {selectedLanguageCodes.length > 1 && (
          <Select
            label="Default language"
            options={languages
              .filter((r) => values.languages[rowCode(r)])
              .map((r) => ({ value: rowCode(r), label: rowLabel(r) }))}
            value={selectedLanguageCodes.includes(values.default_language) ? values.default_language : selectedLanguageCodes[0]}
            onChange={(e) => set("default_language", e.target.value)}
          />
        )}
      </section>

      <section className="form-section">
        <h2 className="form-section__title">Branches &amp; KYC</h2>
        <div className="form-grid">
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
        <div className="check-group">
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
      </section>

      <section className="form-section">
        <h2 className="form-section__title">Login identifiers</h2>
        <div className="check-group">
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
      </section>

      <section className="form-section">
        <h2 className="form-section__title">Login &amp; transaction PIN</h2>
        <div className="check-group">
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
        <div className="form-grid">
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
      </section>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {(!isEdit || isDraft) && (
          <Button type="button" variant="secondary" disabled={isSaving} onClick={(e) => handleSubmit(e, { asDraft: true })}>
            Save as draft
          </Button>
        )}
        <Button type="submit" loading={isSaving}>
          {isDraft ? "Submit" : isEdit ? "Save Changes" : "Create Institution"}
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
        addLabel="Add Institution"
        formWidth={780}
        columns={[
          { key: "id", label: "ID", render: (row) => rowValue(row) ?? "—" },
          { key: "name", label: "Name", render: (row) => rowLabel(row) },
          { key: "auth_status", label: "Status", narrow: true, render: renderStatusCell },
        ]}
        listPath={API.INSTITUTION.LIST}
        livePath={API.LIVE.INSTITUTION}
        renderForm={({ onSuccess, onCancel }) => <InstitutionForm onSuccess={onSuccess} onCancel={onCancel} />}
        actions={(row) => (
          <RowActions row={row} onEdit={setEditTarget} onDelete={setDeleteTarget} />
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
          {deleteError && <Alert>{deleteError}</Alert>}
          <p>
            Delete <strong>{rowLabel(deleteTarget)}</strong>?
          </p>
          {/* The System user's deletes skip approval; the backend refuses one
              for an institution still in use (409 institution.in_use). */}
          <p className="note">
            This deletes the institution at once and can&apos;t be undone. An institution with users, customers or accounts
            can&apos;t be deleted: deactivate it instead.
          </p>
        </Modal>
      )}
    </>
  );
}
