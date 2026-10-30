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
import { PageHeader } from "../../../components/ui/PageHeader";
import { IconButton } from "../../../components/ui/IconButton";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Alert } from "../../../components/ui/Alert";
import { Glyph } from "../../../components/ui/Glyph";
import { useServerList } from "../../../hooks/useServerList";
import { useLiveList } from "../../../hooks/useLiveList";
import { API } from "../../../api/endpoints";
import "./SystemFormPage.css";

const emptyModuleRow = () => ({
  key: Math.random().toString(36).slice(2),
  moduleId: "",
  effectiveFrom: "",
  effectiveTo: "",
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

  // The picked institution's current modules: the server refuses a second
  // assignment of the same module ("Record Already Exists"), so they're
  // shown as assigned and can't be picked.
  const [assignedIds, setAssignedIds] = useState(() => new Set());

  useEffect(() => {
    masterDataService.list("module").then(setModules);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!instProfileId) {
      setAssignedIds(new Set());
      return undefined;
    }
    systemService
      .pageList(API.INSTITUTION_MODULE.LIST, { limit: 200, params: { inst_profile_id: Number(instProfileId) } })
      .then(({ rows: current }) => !cancelled && setAssignedIds(new Set(current.map((r) => Number(r.module_id)))))
      .catch(() => !cancelled && setAssignedIds(new Set()));
    return () => {
      cancelled = true;
    };
  }, [instProfileId]);

  const institutionOptions = useMemo(
    () => institutions.map((row) => ({ value: rowValue(row), label: rowLabel(row) })),
    [institutions]
  );
  const moduleOptions = useMemo(
    () =>
      modules.map((row) => {
        const taken = assignedIds.has(Number(rowValue(row)));
        return { value: rowValue(row), label: taken ? `${rowLabel(row)} (already assigned)` : rowLabel(row), disabled: taken };
      }),
    [modules, assignedIds]
  );

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
    <form className="stack" onSubmit={handleSubmit}>
      {error && <Alert>{error}</Alert>}

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
              <span className="ifp__module-row-label">
                <span className="ifp__module-row-index">{i + 1}</span>
                Module
              </span>
              {rows.length > 1 && (
                <button type="button" className="link-btn link-btn--danger" onClick={() => removeRow(row.key)}>
                  <Glyph name="trash" size={14} />
                  Remove
                </button>
              )}
            </div>
            <div className="form-grid">
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
            </div>
          </div>
        ))}
      </div>

      <Button variant="secondary" size="sm" icon="plus" className="ifp__add-row" onClick={addRow}>
        Add another module
      </Button>

      <div className="form-actions">
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
      });
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
      <div className="form-grid">
        <TextField label="Effective from" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        <TextField label="Effective to" type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
      </div>
      <div className="form-actions">
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
  { key: "effective_to", label: "Effective To", narrow: true, render: (row, grace) => <EndDate value={row.effective_to} grace={grace} /> },
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

// The last day a module works is its end date plus the grace; it stops the
// day after ("Stops on end + grace + 1").
function stopsOn(end, grace) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(end ?? ""));
  if (!match || grace == null) return null;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + Number(grace) + 1));
  return day.toISOString().slice(0, 10);
}
function EndDate({ value, grace }) {
  if (!value) return "—";
  const stops = stopsOn(value, grace);
  return (
    <span>
      {String(value).slice(0, 10)}
      {stops && <span className="cell-sub">Stops on {stops}</span>}
    </span>
  );
}

// The institution's module grace, which only the System user sets.
function ModuleGrace({ instProfileId, onChange }) {
  const [rules, setRules] = useState(null);
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState("");
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const load = useCallback(() => {
    systemService
      .getExpiryRules(Number(instProfileId))
      .then((view) => {
        const list = view?.setup?.rules ?? [];
        setRules(list);
        onChange(list.find((r) => r.kind === "MODULE_SUBSCRIPTION")?.grace_days ?? null);
      })
      .catch((err) => {
        setError(err.message);
        onChange(null);
      });
  }, [instProfileId, onChange]);
  useEffect(() => {
    load();
  }, [load]);
  const grace = rules?.find((r) => r.kind === "MODULE_SUBSCRIPTION")?.grace_days;
  const save = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await systemService.setModuleGrace(Number(instProfileId), rules, Number(days));
      setEditing(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };
  const valid = days !== "" && Number(days) >= 0 && Number(days) <= 365;
  return (
    <>
      <div className="ifp__grace">
        <span className="ifp__grace-text">
          {grace == null ? (
            (error ?? "Loading the module grace…")
          ) : (
            <>
              After its end date a module keeps working for <b>{grace} days</b> of grace, then stops. Renewing means extending Effective To.
            </>
          )}
        </span>
        {grace != null && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setDays(String(grace));
              setError(null);
              setEditing(true);
            }}
          >
            Change grace
          </Button>
        )}
      </div>
      {editing && (
        <Modal title="Module grace" onClose={() => setEditing(false)} width={460}>
          <form className="stack" onSubmit={save}>
            {error && <Alert>{error}</Alert>}
            <TextField label="Grace (days after the end date, 0 to 365)" type="number" min={0} max={365} value={days} onChange={(e) => setDays(e.target.value)} />
            <p className="note">Applies at once to every module of this institution.</p>
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSaving} disabled={!valid}>
                Save
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

const ALL = "all";

export function InstitutionModuleFormPage() {
  const [institutions, setInstitutions] = useState([]);
  // "all" lists every institution's modules in one call; a picked
  // institution narrows it and shows that institution's module grace.
  const [instProfileId, setInstProfileId] = useState(ALL);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  // The module grace (days), for each end date's "Stops on".
  const [grace, setGrace] = useState(null);
  const isAll = instProfileId === ALL;
  const shownColumns = useMemo(() => {
    const withGrace = columns.map((c) => (c.key === "effective_to" ? { ...c, render: (row) => c.render(row, isAll ? null : grace) } : c));
    return isAll ? [{ key: "inst_profile_name", label: "Institution" }, ...withGrace] : withGrace;
  }, [grace, isAll]);

  // Paged, filtered and searched on the server; a picked institution is a filter.
  const listParams = useMemo(() => (isAll ? undefined : { inst_profile_id: Number(instProfileId) }), [isAll, instProfileId]);
  const { rows, pagination, counts, page, setPage, filter, changeFilter, query, setQuery, search, isLoading, error, refresh, fetchPage } =
    useServerList(API.INSTITUTION_MODULE.LIST, listParams);

  const loadInstitutions = useCallback(({ silent = false } = {}) => {
    if (!silent) setIsLoadingInstitutions(true);
    return systemService
      .listActiveInstitutions()
      .then(setInstitutions)
      .finally(() => {
        if (!silent) setIsLoadingInstitutions(false);
      });
  }, []);

  useEffect(() => {
    loadInstitutions();
    // Only needs to run once on mount — live updates below handle refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // See the Live Menu Updates via WebSocket handoff doc: refetch the
  // institution list and the selected institution's modules whenever
  // another user/tab changes either.
  useLiveList(API.LIVE.INSTITUTION, () => loadInstitutions({ silent: true }));
  useLiveList(API.LIVE.INSTITUTION_MODULE, refresh);

  const handleCreated = (createdInstProfileId) => {
    setIsModalOpen(false);
    // Show the institution just added to, so the new row is visible.
    if (createdInstProfileId && String(createdInstProfileId) !== String(instProfileId)) {
      setInstProfileId(String(createdInstProfileId));
    } else {
      refresh();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await systemService.deleteInstitutionModule({ id: rowValue(deleteTarget) });
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Configuration"
        title="Institution Modules"
        subtitle="Modules assigned to each institution."
        actions={
          <>
            <Button variant="secondary" onClick={() => setIsFullscreen(true)} disabled={rows.length === 0} icon="expand">
              View all
            </Button>
            <Button onClick={() => setIsModalOpen(true)} icon="plus">
              Add Institution Module
            </Button>
          </>
        }
      />

      <div className="field-inline">
        <span className="field-inline__label">Institution</span>
        <Select
          placeholder={isLoadingInstitutions ? "Loading institutions…" : "Select institution"}
          options={[{ value: ALL, label: "All institutions" }, ...institutions.map((row) => ({ value: rowValue(row), label: rowLabel(row) }))]}
          value={instProfileId}
          disabled={isLoadingInstitutions}
          onChange={(e) => setInstProfileId(e.target.value)}
        />
      </div>

      <div className="toolbar">
        <TableSearchBar value={query} onChange={setQuery} placeholder="Search institution modules…" />
        {counts && (
          <StatusFilterTabs
            filter={filter}
            onChange={changeFilter}
            totalCount={counts.all}
            activeCount={counts.active}
            pendingCount={counts.pending}
          />
        )}
      </div>

      {error && rows.length > 0 && <Alert>{error}</Alert>}
      {instProfileId && !isAll && <ModuleGrace key={instProfileId} instProfileId={instProfileId} onChange={setGrace} />}

      {!instProfileId ? (
        <EmptyState icon="filter" title="Pick an institution" message="Select an institution to view its assigned modules." />
      ) : (
        <DataTable
          columns={shownColumns}
          rows={rows}
          isLoading={isLoading}
          error={error}
          emptyMessage={search || filter !== "all" ? "No matching records." : "No modules assigned."}
          pagination={pagination}
          page={page}
          onPageChange={setPage}
          actions={(row) => (
            <>
              <IconButton icon="edit" label="Edit" onClick={() => setEditTarget(row)} />
              <IconButton icon="trash" label="Delete" tone="danger" onClick={() => setDeleteTarget(row)} />
            </>
          )}
        />
      )}

      {isModalOpen && (
        <Modal title="Add Institution Module" onClose={() => setIsModalOpen(false)} width={640}>
          <InstitutionModuleForm
            institutions={institutions}
            defaultInstProfileId={isAll ? "" : instProfileId}
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
              refresh();
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
          {deleteError && <Alert>{deleteError}</Alert>}
          <p>
            Are you sure you want to delete <strong>{rowLabel(deleteTarget)}</strong>?
          </p>
        </Modal>
      )}

      {isFullscreen && (
        <FullscreenTableModal
          title="Institution Modules"
          columns={shownColumns}
          rows={rows}
          onClose={() => setIsFullscreen(false)}
          fetchMore={async (fetchPageNo, limit) => {
            const result = await fetchPage({ page: fetchPageNo, limit });
            return { rows: result.rows, totalPages: result.pagination?.totalPages ?? 1 };
          }}
        />
      )}
    </div>
  );
}
