import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { systemForms } from "../config/systemForms";
import { systemService } from "../services/systemService";
import { masterDataService } from "../../masterData/services/masterDataService";
import { rowLabel, rowValue } from "../../../lib/rowLabel";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import "../../masterData/components/MasterDataPage.css";
import "./SystemFormPage.css";

function defaultValue(field) {
  if (field.default !== undefined) return field.default;
  if (field.type === "boolean") return false;
  return "";
}

const emptyValues = (fields) => Object.fromEntries(fields.map((f) => [f.name, defaultValue(f)]));

async function loadOptions(field) {
  if (field.staticOptions) return field.staticOptions;
  if (!field.source) return [];

  const rows =
    field.source.kind === "master"
      ? await masterDataService.list(field.source.type)
      : await systemService[field.source.method]();

  return rows.map((row) => ({ value: rowValue(row), label: rowLabel(row) }));
}

export function SystemFormPage() {
  const { formKey } = useParams();
  const config = systemForms[formKey];

  const [values, setValues] = useState(() => (config ? emptyValues(config.fields) : {}));
  const [optionSets, setOptionSets] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const selectFields = useMemo(() => (config?.fields ?? []).filter((f) => f.type === "select"), [config]);

  useEffect(() => {
    if (!config) return;
    setValues(emptyValues(config.fields));
    setError(null);
    setSuccess(null);
  }, [config, formKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        selectFields.map(async (field) => {
          try {
            return [field.name, await loadOptions(field)];
          } catch {
            return [field.name, []];
          }
        })
      );
      if (!cancelled) setOptionSets(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [selectFields]);

  if (!config) {
    return <div className="mdp__state">Unknown form "{formKey}".</div>;
  }

  const handleChange = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

  const buildPayload = () => {
    const payload = {};
    config.fields.forEach((field) => {
      const raw = values[field.name];
      if (field.type === "number") payload[field.name] = raw === "" ? undefined : Number(raw);
      else if (field.type === "boolean") payload[field.name] = Boolean(raw);
      else if (field.type === "select") payload[field.name] = raw === "" ? undefined : Number(raw) || raw;
      else if (field.type === "text-list")
        payload[field.name] = String(raw ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      else payload[field.name] = raw === "" ? undefined : raw;
    });
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await systemService[config.serviceMethod](buildPayload());
      const idField = config.successIdField ?? "id";
      const createdId = result?.[idField];
      setSuccess(`${config.label} created${createdId ? ` (${idField}: ${createdId})` : ""}.`);
      setValues(emptyValues(config.fields));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <h1 className="mdp__title">Add {config.label}</h1>
          <p className="mdp__subtitle">Creates a new {config.label.toLowerCase()} via the system API.</p>
        </div>
      </div>

      {error && <div className="mdp__error">{error}</div>}
      {success && <div className="sfp__success">{success}</div>}

      <form className="sfp__form" onSubmit={handleSubmit}>
        {config.fields.map((field) => {
          if (field.type === "boolean") {
            return (
              <label key={field.name} className="mdp__checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                />
                <span>{field.label}</span>
              </label>
            );
          }

          if (field.type === "select") {
            return (
              <Select
                key={field.name}
                label={field.label}
                placeholder={`Select ${field.label.toLowerCase()}`}
                options={optionSets[field.name] ?? []}
                required={field.required}
                value={values[field.name] ?? ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            );
          }

          if (field.type === "textarea") {
            return (
              <div className="tf" key={field.name}>
                <label className="tf__label">{field.label}</label>
                <textarea
                  className="sfp__textarea"
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                />
              </div>
            );
          }

          return (
            <TextField
              key={field.name}
              label={field.label}
              type={field.type === "text-list" ? "text" : field.type}
              icon={field.type === "password" ? "lock" : undefined}
              required={field.required}
              value={values[field.name] ?? ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          );
        })}

        <Button type="submit" loading={isSaving} className="sfp__submit">
          Create {config.label}
        </Button>
      </form>
    </div>
  );
}
