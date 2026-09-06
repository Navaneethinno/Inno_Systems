import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { systemForms } from "../config/systemForms";
import { systemService } from "../services/systemService";
import { masterDataService } from "../../masterData/services/masterDataService";
import { rowLabel, rowValue } from "../../../lib/rowLabel";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { EntityManagerPage } from "./EntityManagerPage";
import "./SystemFormPage.css";

function defaultValue(field) {
  if (field.default !== undefined) return field.default;
  if (field.type === "boolean") return false;
  return "";
}

const emptyValues = (fields) => Object.fromEntries(fields.map((f) => [f.name, defaultValue(f)]));

async function loadOptionRows(field) {
  if (!field.source) return [];
  return field.source.kind === "master"
    ? await masterDataService.list(field.source.type, {}, field.source.path)
    : await systemService[field.source.method]();
}

function GenericForm({ config, onSuccess, onCancel }) {
  const [values, setValues] = useState(() => emptyValues(config.fields));
  const [optionRows, setOptionRows] = useState({}); // field.name -> raw rows (for details panels)
  const [expanded, setExpanded] = useState({}); // field.name -> bool
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const selectFields = useMemo(() => config.fields.filter((f) => f.type === "select" && f.source), [config.fields]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        selectFields.map(async (field) => {
          try {
            return [field.name, await loadOptionRows(field)];
          } catch {
            return [field.name, []];
          }
        })
      );
      if (!cancelled) setOptionRows(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [selectFields]);

  const optionsFor = (field) => {
    if (field.staticOptions) return field.staticOptions;
    return (optionRows[field.name] ?? []).map((row) => ({ value: rowValue(row), label: rowLabel(row) }));
  };

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
    try {
      await systemService[config.serviceMethod](buildPayload());
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="sfp__form" onSubmit={handleSubmit}>
      {error && <div className="mdp__error">{error}</div>}

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
          const rows = optionRows[field.name] ?? [];
          const isExpanded = Boolean(expanded[field.name]);
          return (
            <div key={field.name} className="sfp__select-block">
              <Select
                label={field.label}
                placeholder={`Select ${field.label.toLowerCase()}`}
                options={optionsFor(field)}
                required={field.required}
                value={values[field.name] ?? ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />

              {field.expandableDetails && rows.length > 0 && (
                <>
                  <button
                    type="button"
                    className="sfp__expand-toggle"
                    onClick={() => setExpanded((prev) => ({ ...prev, [field.name]: !prev[field.name] }))}
                  >
                    View {field.label} <span className={`sfp__expand-chevron ${isExpanded ? "sfp__expand-chevron--open" : ""}`}>▾</span>
                  </button>

                  {isExpanded && (
                    <ul className="sfp__policy-list">
                      {rows.map((row) => (
                        <li key={row.id} className="sfp__policy-item">
                          <span className="sfp__policy-name">{rowLabel(row)}</span>
                          <span className="sfp__policy-meta">
                            {Object.entries(row)
                              .filter(([k]) => !["id", "name", "status"].includes(k) && !k.endsWith("_name"))
                              .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
                              .join(" · ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
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

      <div className="sfp__form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving}>
          Create {config.label}
        </Button>
      </div>
    </form>
  );
}

export function SystemFormPage() {
  const { formKey } = useParams();
  const config = systemForms[formKey];

  if (!config) {
    return <div className="mdp__state">Unknown form "{formKey}".</div>;
  }

  return (
    <EntityManagerPage
      title={`${config.label}s`}
      subtitle={`Records created via the system API.`}
      addLabel={`Add ${config.label}`}
      columns={config.columns}
      loadRows={() => systemService[config.listMethod]()}
      renderForm={({ onSuccess, onCancel }) => (
        <GenericForm config={config} onSuccess={onSuccess} onCancel={onCancel} />
      )}
    />
  );
}
