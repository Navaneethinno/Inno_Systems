import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { systemForms } from "../config/systemForms";
import { systemService } from "../services/systemService";
import { masterDataService } from "../../masterData/services/masterDataService";
import { rowLabel, rowValue } from "../../../lib/rowLabel";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { IconButton } from "../../../components/ui/IconButton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Alert } from "../../../components/ui/Alert";
import { EntityManagerPage } from "./EntityManagerPage";

function defaultValue(field) {
  if (field.default !== undefined) return field.default;
  if (field.type === "boolean") return false;
  return "";
}

const emptyValues = (fields) => Object.fromEntries(fields.map((f) => [f.name, defaultValue(f)]));

// Edit mode seeds from the row instead of blank defaults, and a password
// field is optional there — leaving it blank keeps the current password
// instead of forcing a new one on every edit.
const editValues = (fields, row) =>
  Object.fromEntries(fields.map((f) => [f.name, f.type === "password" ? "" : row[f.name] ?? defaultValue(f)]));

async function loadOptionRows(field) {
  if (!field.source) return [];
  return field.source.kind === "master"
    ? await masterDataService.list(field.source.type, {}, field.source.path)
    : await systemService[field.source.method]();
}

function GenericForm({ config, row, onSuccess, onCancel }) {
  const isEdit = Boolean(row);
  const [values, setValues] = useState(() => (isEdit ? editValues(config.fields, row) : emptyValues(config.fields)));
  const [optionRows, setOptionRows] = useState({});
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
      // Editing: a blank password means "leave it unchanged" — never send it.
      if (isEdit && field.type === "password" && raw === "") return;
      if (field.type === "number") payload[field.name] = raw === "" ? undefined : Math.max(0, Number(raw) || 0);
      else if (field.type === "boolean") payload[field.name] = Boolean(raw);
      else if (field.type === "select") payload[field.name] = raw === "" ? undefined : Number(raw) || raw;
      else if (field.type === "text-list")
        payload[field.name] = String(raw ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      else payload[field.name] = raw === "" ? undefined : raw;
    });
    if (isEdit) payload[config.idField] = row[config.idField] ?? rowValue(row);
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const method = isEdit ? config.editServiceMethod : config.serviceMethod;
      await systemService[method](buildPayload());
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

      {/* Inputs flow in a responsive grid; on/off flags gather below them. */}
      <div className="form-grid">
        {config.fields.map((field) => {
          if (field.type === "boolean") return null;

          if (field.type === "select") {
            return (
              <Select
                key={field.name}
                label={field.label}
                placeholder={`Select ${field.label.toLowerCase()}`}
                options={optionsFor(field)}
                required={field.required}
                value={values[field.name] ?? ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            );
          }

          if (field.type === "textarea") {
            return (
              <div className="tf form-grid__full" key={field.name}>
                <label className="tf__label">{field.label}</label>
                <textarea
                  className="tf__textarea"
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
              placeholder={isEdit && field.type === "password" ? "Leave blank to keep current password" : undefined}
              hint={field.type === "text-list" ? "Separate values with commas." : undefined}
              required={isEdit && field.type === "password" ? false : field.required}
              value={values[field.name] ?? ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          );
        })}
      </div>

      {config.fields.some((field) => field.type === "boolean") && (
        <div className="check-group">
          {config.fields
            .filter((field) => field.type === "boolean")
            .map((field) => (
              <label key={field.name} className="check">
                <input
                  type="checkbox"
                  checked={Boolean(values[field.name])}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                />
                <span>{field.label}</span>
              </label>
            ))}
        </div>
      )}

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving}>
          {isEdit ? "Save Changes" : `Create ${config.label}`}
        </Button>
      </div>
    </form>
  );
}

export function SystemFormPage() {
  const { formKey } = useParams();
  const config = systemForms[formKey];

  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!config) {
    return <EmptyState icon="alert" title="Not found" message={`Unknown form "${formKey}".`} />;
  }

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await systemService[config.deleteServiceMethod](
        config.buildDeletePayload ? config.buildDeletePayload(deleteTarget) : { id: rowValue(deleteTarget) }
      );
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
        title={`${config.label}s`}
        eyebrow={config.eyebrow}
        addLabel={`Add ${config.label}`}
        columns={config.columns}
        listPath={config.listPath}
        livePath={config.livePath}
        renderForm={({ onSuccess, onCancel }) => (
          <GenericForm config={config} onSuccess={onSuccess} onCancel={onCancel} />
        )}
        actions={
          config.editServiceMethod || config.deleteServiceMethod
            ? (row) => (
                <>
                  {config.editServiceMethod && (
                    <IconButton icon="edit" label="Edit" onClick={() => setEditTarget(row)} />
                  )}
                  {config.deleteServiceMethod && (
                    <IconButton icon="trash" label="Delete" tone="danger" onClick={() => setDeleteTarget(row)} />
                  )}
                </>
              )
            : undefined
        }
      />

      {editTarget && (
        <Modal title={`Edit ${config.label}`} onClose={() => setEditTarget(null)} width={640}>
          <GenericForm
            config={config}
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
          title={`Delete ${config.label}`}
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
            Are you sure you want to delete <strong>{rowLabel(deleteTarget)}</strong>? This sets its status to
            inactive.
          </p>
        </Modal>
      )}
    </>
  );
}
