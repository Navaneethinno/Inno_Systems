import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { masterEntities } from "../config/masterEntities";
import { masterDataService } from "../services/masterDataService";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { StatusFilterTabs } from "../../../components/ui/StatusFilterTabs";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { useAuthStatusFilter } from "../../../hooks/useAuthStatusFilter";
import "./MasterDataPage.css";

function rowLabel(row) {
  return row.name ?? row.menu_name ?? row.action_name ?? row.title ?? `#${row.id}`;
}

const emptyValues = (fields) =>
  Object.fromEntries(fields.map((f) => [f.name, f.type === "status" ? true : ""]));

export function MasterCrudPage() {
  const { entityKey } = useParams();
  const config = masterEntities[entityKey];

  const [rows, setRows] = useState([]);
  const [optionSets, setOptionSets] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalState, setModalState] = useState(null); // { mode: "add" | "edit", values }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { filter, setFilter, query, setQuery, filteredRows, hasAuthStatus, activeCount, pendingCount, totalCount } =
    useAuthStatusFilter(rows);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await masterDataService.list(entityKey);
      setRows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [entityKey]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const selectSources = useMemo(
    () => [...new Set((config?.fields ?? []).filter((f) => f.type === "select").map((f) => f.optionsFrom))],
    [config]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        selectSources.map(async (source) => {
          try {
            const list = await masterDataService.list(source);
            return [source, list];
          } catch {
            return [source, []];
          }
        })
      );
      if (!cancelled) setOptionSets(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [selectSources]);

  if (!config) {
    return <div className="mdp__state">Unknown master data type "{entityKey}".</div>;
  }

  const openAdd = () => setModalState({ mode: "add", values: emptyValues(config.fields) });
  const openEdit = (row) => setModalState({ mode: "edit", values: { ...emptyValues(config.fields), ...row } });
  const closeModal = () => setModalState(null);

  const handleFieldChange = (name, value) => {
    setModalState((prev) => {
      const values = { ...prev.values, [name]: value };
      // Clear any select whose options depend on the field that just changed
      // — its previously chosen value may no longer be a valid option.
      config.fields.forEach((f) => {
        if (f.dependsOn === name) values[f.name] = "";
      });
      return { ...prev, values };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const payload = { ...modalState.values };
      config.fields.forEach((f) => {
        if (f.type === "select" || f.type === "number") payload[f.name] = Number(payload[f.name]) || 0;
        if (f.type === "status") payload[f.name] = payload[f.name] ? 1 : 0;
      });

      if (modalState.mode === "add") {
        await masterDataService.add(entityKey, payload);
      } else {
        await masterDataService.edit(entityKey, { ...payload, id: modalState.values.id });
      }
      closeModal();
      await loadRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await masterDataService.remove(entityKey, deleteTarget.id);
      setDeleteTarget(null);
      await loadRows();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const columns = config.columns.map((col) => {
    if (col.status) {
      return { ...col, render: (row) => <StatusBadge active={Boolean(row[col.key])} /> };
    }
    if (col.lookup) {
      return {
        ...col,
        render: (row) => {
          if (col.emptyIfZero && !row[col.key]) return "—";
          if (col.nameKey && row[col.nameKey]) return row[col.nameKey];
          const match = (optionSets[col.lookup] ?? []).find((r) => r.id === row[col.key]);
          return match ? rowLabel(match) : row[col.key];
        },
      };
    }
    return col;
  });

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <h1 className="mdp__title">{config.label}</h1>
          <p className="mdp__subtitle">Manage {config.label.toLowerCase()} for the system.</p>
        </div>
        <div className="mdp__header-actions">
          <Button variant="secondary" onClick={() => setIsFullscreen(true)} disabled={rows.length === 0}>
            ⛶ View all
          </Button>
          <Button onClick={openAdd}>+ Add {config.label.slice(0, -1)}</Button>
        </div>
      </div>

      <div className="mdp__toolbar">
        <TableSearchBar value={query} onChange={setQuery} placeholder={`Search ${config.label.toLowerCase()}…`} />
        {hasAuthStatus && (
          <StatusFilterTabs
            filter={filter}
            onChange={setFilter}
            totalCount={totalCount}
            activeCount={activeCount}
            pendingCount={pendingCount}
          />
        )}
      </div>

      {error && <div className="mdp__error">{error}</div>}

      <DataTable
        columns={columns}
        rows={filteredRows}
        isLoading={isLoading}
        actions={(row) => (
          <>
            <button className="dt__icon-btn" onClick={() => openEdit(row)} aria-label="Edit">
              ✎
            </button>
            <button className="dt__icon-btn dt__icon-btn--danger" onClick={() => setDeleteTarget(row)} aria-label="Delete">
              🗑
            </button>
          </>
        )}
      />

      {isFullscreen && (
        <FullscreenTableModal
          title={config.label}
          columns={columns}
          rows={filteredRows}
          onClose={() => setIsFullscreen(false)}
          actions={(row) => (
            <>
              <button className="dt__icon-btn" onClick={() => openEdit(row)} aria-label="Edit">
                ✎
              </button>
              <button
                className="dt__icon-btn dt__icon-btn--danger"
                onClick={() => setDeleteTarget(row)}
                aria-label="Delete"
              >
                🗑
              </button>
            </>
          )}
        />
      )}

      {modalState && (
        <Modal
          title={modalState.mode === "add" ? `Add ${config.label.slice(0, -1)}` : `Edit ${config.label.slice(0, -1)}`}
          onClose={closeModal}
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} type="button">
                Cancel
              </Button>
              <Button type="submit" form="mdp-form" loading={isSaving}>
                Save
              </Button>
            </>
          }
        >
          <form id="mdp-form" onSubmit={handleSave} className="mdp__form">
            {config.fields.map((field) => {
              if (field.type === "select") {
                const sourceRows = optionSets[field.optionsFrom] ?? [];
                const options = sourceRows
                  .filter((r) => r.id !== modalState.values.id) // a record can't be its own parent
                  .filter((r) => (field.filterBy ? field.filterBy(r, modalState.values) : true))
                  .map((r) => ({ value: r.id, label: rowLabel(r) }));

                const waitingOnDependency =
                  field.dependsOn && !modalState.values[field.dependsOn] ? true : false;

                const dependencyField = config.fields.find((f) => f.name === field.dependsOn);

                return (
                  <Select
                    key={field.name}
                    label={field.label}
                    placeholder={
                      waitingOnDependency
                        ? `Select ${dependencyField?.label.toLowerCase() ?? "a value"} first`
                        : `Select ${field.label.toLowerCase()}`
                    }
                    options={options}
                    required={field.required}
                    disabled={waitingOnDependency}
                    value={modalState.values[field.name] ?? ""}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  />
                );
              }
              if (field.type === "status") {
                return (
                  <label key={field.name} className="mdp__checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(modalState.values[field.name])}
                      onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                    />
                    <span>{field.label}</span>
                  </label>
                );
              }
              return (
                <TextField
                  key={field.name}
                  label={field.label}
                  type={field.type === "number" ? "number" : "text"}
                  required={field.required}
                  value={modalState.values[field.name] ?? ""}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                />
              );
            })}
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title={`Delete ${config.label.slice(0, -1)}`}
          onClose={() => setDeleteTarget(null)}
          width={400}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={isSaving}>
                Delete
              </Button>
            </>
          }
        >
          <p>
            Are you sure you want to delete <strong>{rowLabel(deleteTarget)}</strong>? This sets its status to
            inactive.
          </p>
        </Modal>
      )}
    </div>
  );
}
