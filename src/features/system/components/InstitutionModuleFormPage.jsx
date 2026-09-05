import { useEffect, useMemo, useState } from "react";
import { systemService } from "../services/systemService";
import { masterDataService } from "../../masterData/services/masterDataService";
import { rowLabel, rowValue } from "../../../lib/rowLabel";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { EntityManagerPage } from "./EntityManagerPage";
import "./SystemFormPage.css";
import "./ProfileFormPage.css";

function InstitutionModuleForm({ onSuccess, onCancel }) {
  const [institutions, setInstitutions] = useState([]);
  const [modules, setModules] = useState([]);
  const [instProfileId, setInstProfileId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [configurationStatus, setConfigurationStatus] = useState("ACTIVE");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([systemService.listActiveInstitutions(), masterDataService.list("module")]).then(
      ([instRows, moduleRows]) => {
        if (cancelled) return;
        setInstitutions(instRows);
        setModules(moduleRows);
      }
    );
    return () => {
      cancelled = true;
    };
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

export function InstitutionModuleFormPage() {
  return (
    <EntityManagerPage
      title="Institution Modules"
      subtitle="Modules assigned to institutions."
      addLabel="Add Institution Module"
      columns={[
        { key: "id", label: "ID" },
        { key: "name", label: "Institution / Module", render: (row) => rowLabel(row) },
      ]}
      loadRows={() => systemService.listInstitutionModules()}
      renderForm={({ onSuccess, onCancel }) => <InstitutionModuleForm onSuccess={onSuccess} onCancel={onCancel} />}
    />
  );
}
