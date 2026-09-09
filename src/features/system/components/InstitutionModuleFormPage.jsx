import { useCallback, useEffect, useMemo, useState } from "react";
import { systemService } from "../services/systemService";
import { masterDataService } from "../../masterData/services/masterDataService";
import { rowLabel, rowValue } from "../../../lib/rowLabel";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { DataTable } from "../../../components/ui/DataTable";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AuthStatusBadge } from "../../../components/ui/AuthStatusBadge";
import { renderStatusCell } from "../../../lib/renderStatusCell";
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { StatusFilterTabs } from "../../../components/ui/StatusFilterTabs";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { useAuthStatusFilter } from "../../../hooks/useAuthStatusFilter";
import "../../masterData/components/MasterDataPage.css";
import "../../masterData/components/MenuActionsPage.css";
import "./SystemFormPage.css";
import "./ProfileFormPage.css";

const emptyModuleRow = () => ({
  key: Math.random().toString(36).slice(2),
  moduleId: "",
  effectiveFrom: "",
  effectiveTo: "",
  configurationStatus: "ACTIVE",
});

// /system/institution/module/add is a batch endpoint — one call assigns N
// modules to an institution (all-or-nothing server-side), so this form
// lets you build up several rows instead of one module at a time.
function InstitutionModuleForm({ institutions, defaultInstProfileId, onSuccess, onCancel }) {
  const [modules, setModules] = useState([]);
  const [instProfileId, setInstProfileId] = useState(defaultInstProfileId);
  const [rows, setRows] = useState([emptyModuleRow()]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    masterDataService.list("module").then(setModules);
  }, []);

  const institutionOptions = useMemo(
    () => institutions.map((row) => ({ value: rowValue(row), label: rowLabel(row) })),
    [institutions]
  );
  const moduleOptions = useMemo(() => modules.map((row) => ({ value: rowValue(row), label: rowLabel(row) })), [modules]);

  const updateRow = (key, field, value) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  const addRow = () => setRows((prev) => [...prev, emptyModuleRow()]);
  const removeRow = (key) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const modulesPayload = rows
        .filter((r) => r.moduleId)
        .map((r) => ({
          module_id: Number(r.moduleId),
          ...(r.effectiveFrom ? { effective_from: r.effectiveFrom } : {}),
          ...(r.effectiveTo ? { effective_to: r.effectiveTo } : {}),
          ...(r.configurationStatus ? { configuration_status: r.configurationStatus } : {}),
        }));

      await systemService.addInstitutionModules({ instProfileId: Number(instProfileId), modules: modulesPayload });
      onSuccess(instProfileId);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="sfp__form ifp__form" onSubmit={handleSubmit}>
      {error && <div className="mdp__error">{error}</div>}

      <Select
        label="Institution"
        placeholder="Select institution"
        required
        options={institutionOptions}
        value={instProfileId}
        onChange={(e) => setInstProfileId(e.target.value)}
      />

      <div className="ifp__module-rows">
        {rows.map((row, i) => (
          <div key={row.key} className="ifp__module-row">
            <div className="ifp__module-row-header">
              <span className="ifp__module-row-label">Module {i + 1}</span>
              {rows.length > 1 && (
                <button type="button" className="ifp__module-row-remove" onClick={() => removeRow(row.key)}>
                  Remove
                </button>
              )}
            </div>
            <div className="ifp__grid">
              <Select
                label="Module"
                placeholder="Select module"
                required
                options={moduleOptions}
                value={row.moduleId}
                onChange={(e) => updateRow(row.key, "moduleId", e.target.value)}
              />
              <TextField
                label="Effective from"
                type="date"
                value={row.effectiveFrom}
                onChange={(e) => updateRow(row.key, "effectiveFrom", e.target.value)}
              />
              <TextField
                label="Effective to"
                type="date"
                value={row.effectiveTo}
                onChange={(e) => updateRow(row.key, "effectiveTo", e.target.value)}
              />
              <Select
                label="Configuration status"
                options={[
                  { value: "ACTIVE", label: "Active" },
                  { value: "PENDING", label: "Pending" },
                  { value: "INACTIVE", label: "Inactive" },
                ]}
                value={row.configurationStatus}
                onChange={(e) => updateRow(row.key, "configurationStatus", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="sfp__expand-toggle" onClick={addRow}>
        + Add another module
      </button>

      <div className="pfp__form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving}>
          Assign Module{rows.length > 1 ? "s" : ""}
        </Button>
      </div>
    </form>
  );
}

// Single-row edit for one existing institution-module assignment.
// Confirmed live: /system/institution/module/edit silently zeroes
// module_id if it's omitted from the payload instead of keeping the
// stored value — always send it, not just the fields that changed.
function InstitutionModuleEditForm({ row, onSuccess, onCancel }) {
  const [effectiveFrom, setEffectiveFrom] = useState(row.effective_from ?? "");
  const [effectiveTo, setEffectiveTo] = useState(row.effective_to ?? "");
  const [configurationStatus, setConfigurationStatus] = useState(row.configuration_status ?? "ACTIVE");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await systemService.editInstitutionModule({
        id: rowValue(row),
        module_id: row.module_id,
        ...(effectiveFrom ? { effective_from: effectiveFrom } : {}),
        ...(effectiveTo ? { effective_to: effectiveTo } : {}),
        configuration_status: configurationStatus,
      });
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
        <TextField label="Effective from" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        <TextField label="Effective to" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
        <Select
          label="Configuration status"
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "PENDING", label: "Pending" },
            { value: "INACTIVE", label: "Inactive" },
          ]}
          value={configurationStatus}
          onChange={(e) => setConfigurationStatus(e.target.value)}
        />
      </div>
      <div className="pfp__form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}

const columns = [
  { key: "id", label: "ID", render: (row) => rowValue(row) ?? "—" },
  { key: "module_name", label: "Module", render: (row) => row.module_name ?? rowLabel(row) },
  { key: "effective_from", label: "Effective From", narrow: true },
  { key: "effective_to", label: "Effective To", narrow: true },
  {
    key: "configuration_status",
    label: "Configuration",
    narrow: true,
    render: (row) => {
      if (row.configuration_status) return <AuthStatusBadge value={row.configuration_status} />;
      if (row.status_name) return <AuthStatusBadge value={row.status_name} />;
      if ("status" in row) return <StatusBadge active={Boolean(row.status)} />;
      return "—";
    },
  },
  { key: "auth_status", label: "Status", narrow: true, render: renderStatusCell },
];

export function InstitutionModuleFormPage() {
  const [institutions, setInstitutions] = useState([]);
  const [instProfileId, setInstProfileId] = useState("");
  const [rows, setRows] = useState([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const { filter, setFilter, query, setQuery, filteredRows, hasAuthStatus, activeCount, pendingCount, totalCount } =
    useAuthStatusFilter(rows);

  useEffect(() => {
    systemService
      .listActiveInstitutions()
      .then(setInstitutions)
      .finally(() => setIsLoadingInstitutions(false));
  }, []);

  const loadModulesFor = useCallback(async (id) => {
    if (!id) {
      setRows([]);
      return;
    }
    setIsLoadingModules(true);
    setError(null);
    try {
      setRows(await systemService.listInstitutionModules(Number(id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingModules(false);
    }
  }, []);

  useEffect(() => {
    loadModulesFor(instProfileId);
  }, [instProfileId, loadModulesFor]);

  const handleCreated = (createdInstProfileId) => {
    setIsModalOpen(false);
    // Show the institution just added to, so the new row is visible.
    if (createdInstProfileId && String(createdInstProfileId) !== String(instProfileId)) {
      setInstProfileId(String(createdInstProfileId));
    } else {
      loadModulesFor(instProfileId);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await systemService.deleteInstitutionModule({ id: rowValue(deleteTarget) });
      setDeleteTarget(null);
      loadModulesFor(instProfileId);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <span className="mdp__eyebrow">Configuration</span>
          <h1 className="mdp__title">Institution Modules</h1>
          <p className="mdp__subtitle">Modules assigned to an institution.</p>
        </div>
        <div className="mdp__header-actions">
          <Button variant="secondary" onClick={() => setIsFullscreen(true)} disabled={rows.length === 0}>
            ⛶ View all
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>+ Add Institution Module</Button>
        </div>
      </div>

      <div className="map__module">
        <span className="map__module-label">Institution</span>
        <Select
          placeholder={isLoadingInstitutions ? "Loading institutions…" : "Select institution"}
          options={institutions.map((row) => ({ value: rowValue(row), label: rowLabel(row) }))}
          value={instProfileId}
          disabled={isLoadingInstitutions}
          onChange={(e) => setInstProfileId(e.target.value)}
        />
      </div>

      {rows.length > 0 && (
        <div className="mdp__toolbar">
          <TableSearchBar value={query} onChange={setQuery} placeholder="Search institution modules…" />
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
      )}

      {error && <div className="mdp__error">{error}</div>}

      {!instProfileId ? (
        <div className="mdp__state">Select an institution to view its assigned modules.</div>
      ) : (
        <DataTable
          columns={columns}
          rows={filteredRows}
          isLoading={isLoadingModules}
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
      )}

      {isModalOpen && (
        <Modal title="Add Institution Module" onClose={() => setIsModalOpen(false)} width={640}>
          <InstitutionModuleForm
            institutions={institutions}
            defaultInstProfileId={instProfileId}
            onSuccess={handleCreated}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit Institution Module" onClose={() => setEditTarget(null)} width={640}>
          <InstitutionModuleEditForm
            row={editTarget}
            onSuccess={() => {
              setEditTarget(null);
              loadModulesFor(instProfileId);
            }}
            onCancel={() => setEditTarget(null)}
          />
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete Institution Module"
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

      {isFullscreen && (
        <FullscreenTableModal
          title="Institution Modules"
          columns={columns}
          rows={filteredRows}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}
