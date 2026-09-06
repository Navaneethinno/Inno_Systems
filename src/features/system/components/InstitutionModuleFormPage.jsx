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
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { StatusFilterTabs } from "../../../components/ui/StatusFilterTabs";
import { useAuthStatusFilter } from "../../../hooks/useAuthStatusFilter";
import "../../masterData/components/MasterDataPage.css";
import "../../masterData/components/MenuActionsPage.css";
import "./SystemFormPage.css";
import "./ProfileFormPage.css";

function InstitutionModuleForm({ institutions, defaultInstProfileId, onSuccess, onCancel }) {
  const [modules, setModules] = useState([]);
  const [instProfileId, setInstProfileId] = useState(defaultInstProfileId);
  const [moduleId, setModuleId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [configurationStatus, setConfigurationStatus] = useState("ACTIVE");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await systemService.addInstitutionModule({
        inst_profile_id: Number(instProfileId),
        module_id: Number(moduleId),
        effective_from: effectiveFrom,
        effective_to: effectiveTo || undefined,
        configuration_status: configurationStatus,
      });
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

      <div className="ifp__grid">
        <Select
          label="Institution"
          placeholder="Select institution"
          required
          options={institutionOptions}
          value={instProfileId}
          onChange={(e) => setInstProfileId(e.target.value)}
        />
        <Select
          label="Module"
          placeholder="Select module"
          required
          options={moduleOptions}
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
        />
        <TextField
          label="Effective from"
          type="date"
          required
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
        />
        <TextField
          label="Effective to"
          type="date"
          value={effectiveTo}
          onChange={(e) => setEffectiveTo(e.target.value)}
        />
        <Select
          label="Configuration status"
          options={[
            { value: "ACTIVE", label: "Active" },
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
          Create Institution Module
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
    label: "Status",
    narrow: true,
    render: (row) => (
      <StatusBadge active={row.configuration_status ? row.configuration_status === "ACTIVE" : Boolean(row.status)} />
    ),
  },
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

  const { filter, setFilter, filteredRows, hasAuthStatus, pendingCount } = useAuthStatusFilter(rows);

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

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
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

      {hasAuthStatus && (
        <div className="mdp__toolbar">
          <StatusFilterTabs filter={filter} onChange={setFilter} pendingCount={pendingCount} />
        </div>
      )}

      {error && <div className="mdp__error">{error}</div>}

      {!instProfileId ? (
        <div className="mdp__state">Select an institution to view its assigned modules.</div>
      ) : (
        <DataTable columns={columns} rows={filteredRows} isLoading={isLoadingModules} />
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
