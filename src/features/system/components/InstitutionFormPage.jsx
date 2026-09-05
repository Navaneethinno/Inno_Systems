import { useEffect, useState } from "react";
import { systemService } from "../services/systemService";
import { masterDataService } from "../../masterData/services/masterDataService";
import { rowLabel, rowValue, rowCode } from "../../../lib/rowLabel";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { EntityManagerPage } from "./EntityManagerPage";
import "./SystemFormPage.css";
import "./ProfileFormPage.css";

const LOGIN_IDENTIFIERS = ["username", "email", "mobile"];

const initialState = {
  code: "",
  name: "",
  type: "",
  timezone: "",
  defaultLanguage: "",
  supportedLanguages: {},
  date_format: "YYYY-MM-DD",
  has_branch: false,
  max_branches_allowed: "",
  kyc_enabled: false,
  total_kyc_levels: "",
  allow_downgrade_kyc: false,
  auto_approve_kyc_level: false,
  identifiers: { username: true, email: true, mobile: true },
  primary_login_identifier: "username",
  is_login_pin_enabled: false,
  login_pin_length: 6,
  login_pin_type: "numeric",
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

function InstitutionForm({ onSuccess, onCancel }) {
  const [values, setValues] = useState(initialState);
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
        // Default to English if present, else whatever comes first.
        const codes = rows.map(rowCode);
        const fallback = codes.includes("en") ? "en" : codes[0];
        if (fallback) {
          setValues((prev) => ({
            ...prev,
            defaultLanguage: prev.defaultLanguage || fallback,
            supportedLanguages: Object.keys(prev.supportedLanguages).length
              ? prev.supportedLanguages
              : { [fallback]: true },
          }));
        }
      })
      .catch(() => !cancelled && setLanguages([]));

    return () => {
      cancelled = true;
    };
  }, []);

  const set = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const toggleIdentifier = (id, checked) =>
    setValues((prev) => ({ ...prev, identifiers: { ...prev.identifiers, [id]: checked } }));
  const toggleSupportedLanguage = (code, checked) =>
    setValues((prev) => ({ ...prev, supportedLanguages: { ...prev.supportedLanguages, [code]: checked } }));

  const selectedIdentifiers = LOGIN_IDENTIFIERS.filter((id) => values.identifiers[id]);
  const selectedLanguageCodes = Object.keys(values.supportedLanguages).filter((code) => values.supportedLanguages[code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        code: values.code,
        name: values.name,
        type: Number(values.type) || 0,
        timezone: values.timezone,
        language: {
          default: values.defaultLanguage,
          supported: selectedLanguageCodes,
        },
        date_format: values.date_format,
        has_branch: values.has_branch,
        max_branches_allowed: Number(values.max_branches_allowed) || 0,
        kyc_enabled: values.kyc_enabled,
        total_kyc_levels: Number(values.total_kyc_levels) || 0,
        allow_downgrade_kyc: values.allow_downgrade_kyc,
        auto_approve_kyc_level: values.auto_approve_kyc_level,
        allowed_login_identifiers: { identifiers: selectedIdentifiers },
        primary_login_identifier: values.primary_login_identifier,
        is_login_pin_enabled: values.is_login_pin_enabled,
        login_pin_length: Number(values.login_pin_length) || 0,
        login_pin_type: values.login_pin_type,
        allow_biometric_login: values.allow_biometric_login,
        is_txn_pin_enabled: values.is_txn_pin_enabled,
        txn_pin_length: Number(values.txn_pin_length) || 0,
        is_same_login_txn_pin_allowed: values.is_same_login_txn_pin_allowed,
      };

      await systemService.addInstitution(payload);
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

      <h2 className="pfp__section-title">Language</h2>
      <div className="ifp__grid">
        <Select
          label="Default language"
          placeholder="Select default language"
          options={languages.map((row) => ({ value: rowCode(row), label: rowLabel(row) }))}
          value={values.defaultLanguage}
          onChange={(e) => set("defaultLanguage", e.target.value)}
        />
      </div>
      <div className="ifp__checks">
        {languages.map((row) => {
          const code = rowCode(row);
          return (
            <Checkbox
              key={code}
              label={rowLabel(row)}
              checked={Boolean(values.supportedLanguages[code])}
              onChange={(v) => toggleSupportedLanguage(code, v)}
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
            label={id[0].toUpperCase() + id.slice(1)}
            checked={values.identifiers[id]}
            onChange={(v) => toggleIdentifier(id, v)}
          />
        ))}
      </div>
      <Select
        label="Primary login identifier"
        options={selectedIdentifiers.map((id) => ({ value: id, label: id[0].toUpperCase() + id.slice(1) }))}
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
            { value: "numeric", label: "Numeric" },
            { value: "alphanumeric", label: "Alphanumeric" },
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
          Create Institution
        </Button>
      </div>
    </form>
  );
}

export function InstitutionFormPage() {
  return (
    <EntityManagerPage
      title="Institutions"
      subtitle="Institutions created via the system API."
      addLabel="Add Institution"
      columns={[
        { key: "id", label: "ID", render: (row) => rowValue(row) ?? "—" },
        { key: "name", label: "Name", render: (row) => rowLabel(row) },
      ]}
      loadRows={() => systemService.listActiveInstitutions()}
      renderForm={({ onSuccess, onCancel }) => <InstitutionForm onSuccess={onSuccess} onCancel={onCancel} />}
    />
  );
}
