import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { masterEntities } from "../config/masterEntities";
import { masterDataService } from "../services/masterDataService";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { renderStatusCell } from "../../../lib/renderStatusCell";
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { StatusFilterTabs } from "../../../components/ui/StatusFilterTabs";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { PageHeader } from "../../../components/ui/PageHeader";
import { IconButton } from "../../../components/ui/IconButton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Alert } from "../../../components/ui/Alert";
import { useServerList } from "../../../hooks/useServerList";
import { useLiveList } from "../../../hooks/useLiveList";
import { API } from "../../../api/endpoints";

function rowLabel(row) {
  return row.name ?? row.menu_name ?? row.action_name ?? row.title ?? `#${row.id}`;
}

const emptyValues = (fields) =>
  Object.fromEntries(fields.map((f) => [f.name, f.type === "status" ? true : ""]));

// Master data has no maker-checker: status is 1 Active or 13 Inactive, so
// the tabs are All / Active / Inactive and the checkbox maps to those codes.
const MASTER_FILTERS = ["all", "active", "inactive"];
const ACTIVE = 1;
const INACTIVE = 13;

export function MasterCrudPage() {
  const { entityKey } = useParams();
  const config = masterEntities[entityKey];

  const [optionSets, setOptionSets] = useState({});
  const [saveError, setSaveError] = useState(null);

  const [modalState, setModalState] = useState(null); // { mode: "add" | "edit", values }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Paged, filtered and searched on the server, like every other list.
  const { rows, pagination, counts, page, setPage, filter, changeFilter, query, setQuery, search, isLoading, error, refresh, fetchPage } =
    useServerList(API.MASTER.list(entityKey), undefined, MASTER_FILTERS);

  // Keeps this table in sync when another user (or tab) adds/edits/deletes
  // a row — see the Live Menu Updates via WebSocket handoff doc.
  useLiveList(config ? API.LIVE.master(entityKey) : null, refresh);

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
    return <EmptyState icon="alert" title="Not found" message={`Unknown master data type "${entityKey}".`} />;
  }

  const openAdd = () => setModalState({ mode: "add", values: emptyValues(config.fields) });
  const openEdit = (row) => {
    const values = { ...emptyValues(config.fields), ...row };
    config.fields.forEach((f) => {
      if (f.type === "status") values[f.name] = Number(row[f.name]) === ACTIVE;
    });
    setModalState({ mode: "edit", values });
  };
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
    setSaveError(null);
    try {
      const payload = { ...modalState.values };
      config.fields.forEach((f) => {
        if (f.type === "select") payload[f.name] = Number(payload[f.name]) || 0;
        // Every number field here is a non-negative count (priority, etc.) —
        // clamp defensively even though the input itself already blocks
        // typing/pasting a minus sign.
        // `omitIfEmpty`: the server picks a default when the field is left
        // out (e.g. a new module's priority goes after every existing one).
        if (f.type === "number" && f.omitIfEmpty && (payload[f.name] === "" || payload[f.name] == null)) {
          delete payload[f.name];
        } else if (f.type === "number") payload[f.name] = Math.max(0, Number(payload[f.name]) || 0);
        if (f.type === "status") payload[f.name] = payload[f.name] ? ACTIVE : INACTIVE;
      });

      if (modalState.mode === "add") {
        await masterDataService.add(entityKey, payload);
      } else {
        await masterDataService.edit(entityKey, { ...payload, id: modalState.values.id });
      }
      closeModal();
      refresh();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await masterDataService.remove(entityKey, deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const columns = config.columns.map((col) => {
    if (col.status) {
      // `status` is a numeric code (1 = Active, 7 = Deleted, ...), not a
      // 0/1 boolean — renderStatusCell reads status_name (the real label)
      // first instead of just checking whether the code is non-zero.
      return { ...col, render: renderStatusCell };
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
    <div className="page">
      <PageHeader
        title={config.label}
        subtitle={`Manage ${config.label.toLowerCase()} for the system.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setIsFullscreen(true)} disabled={rows.length === 0} icon="expand">
              View all
            </Button>
            <Button onClick={openAdd} icon="plus">Add {config.label.slice(0, -1)}</Button>
          </>
        }
      />

      <div className="toolbar">
        <TableSearchBar value={query} onChange={setQuery} placeholder={`Search ${config.label.toLowerCase()}…`} />
        {counts && <StatusFilterTabs filter={filter} onChange={changeFilter} counts={counts} />}
      </div>

      {error && rows.length > 0 && <Alert>{error}</Alert>}
      {saveError && !modalState && !deleteTarget && <Alert>{saveError}</Alert>}

      <DataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        error={error}
        emptyMessage={search || filter !== "all" ? "No matching records." : "No records found."}
        pagination={pagination}
        page={page}
        onPageChange={setPage}
        actions={(row) => (
          <>
            <IconButton icon="edit" label="Edit" onClick={() => openEdit(row)} />
            <IconButton icon="trash" label="Delete" tone="danger" onClick={() => setDeleteTarget(row)} />
          </>
        )}
      />

      {isFullscreen && (
        <FullscreenTableModal
          title={config.label}
          columns={columns}
          rows={rows}
          onClose={() => setIsFullscreen(false)}
          fetchMore={async (fetchPageNo, limit) => {
            const result = await fetchPage({ page: fetchPageNo, limit });
            return { rows: result.rows, totalPages: result.pagination?.totalPages ?? 1 };
          }}
          actions={(row) => (
            <>
              <IconButton icon="edit" label="Edit" onClick={() => openEdit(row)} />
              <IconButton icon="trash" label="Delete" tone="danger" onClick={() => setDeleteTarget(row)} />
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
          <form id="mdp-form" onSubmit={handleSave} className="stack">
            {saveError && <Alert>{saveError}</Alert>}
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
                  <label key={field.name} className="check">
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
          {saveError && <Alert>{saveError}</Alert>}
          <p>
            Delete <strong>{rowLabel(deleteTarget)}</strong>? Master data is shared by every institution.
          </p>
        </Modal>
      )}
    </div>
  );
}
