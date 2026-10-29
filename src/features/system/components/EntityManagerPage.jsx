import { useCallback, useEffect, useState } from "react";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { StatusFilterTabs } from "../../../components/ui/StatusFilterTabs";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Alert } from "../../../components/ui/Alert";
import { useAuthStatusFilter } from "../../../hooks/useAuthStatusFilter";
import { useLiveList } from "../../../hooks/useLiveList";

/**
 * Shared shell for the "System" add pages: a table of what already exists
 * (fetched via the entity's dropdown/list source) plus a "+ Add" button
 * that opens the create form in a modal instead of a bare standalone page —
 * so you can actually see what you've created.
 *
 * `actions(row)` is optional (edit/delete icon buttons) and passed straight
 * through to DataTable/FullscreenTableModal — this component doesn't own
 * edit/delete state itself. The calling page manages its own edit/delete
 * modals and forces a refetch by remounting with a changed `key` prop after
 * a successful edit/delete (see InstitutionFormPage/SystemFormPage for the
 * pattern), rather than this component exposing an imperative refresh.
 *
 * `livePath` (optional) subscribes to that resource's WebSocket live-update
 * channel (e.g. "user", "user/profile", "institution/profile") and silently
 * refetches when another user/tab changes it — see the Live Menu Updates
 * via WebSocket handoff doc.
 *
 * `formWidth` sets the add modal's max width (the Institution form is wide).
 */
export function EntityManagerPage({
  title,
  subtitle,
  eyebrow,
  addLabel,
  columns,
  loadRows,
  renderForm,
  note,
  actions,
  livePath,
  formWidth = 640,
}) {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { filter, setFilter, query, setQuery, filteredRows, hasAuthStatus, activeCount, pendingCount, totalCount } =
    useAuthStatusFilter(rows);

  const refresh = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        setRows(await loadRows());
      } catch (err) {
        setError(err.message);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [loadRows]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useLiveList(livePath, () => refresh({ silent: true }));

  const handleCreated = () => {
    setIsModalOpen(false);
    refresh();
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={hasAuthStatus ? `${totalCount} registered · ${activeCount} active` : subtitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => setIsFullscreen(true)} disabled={rows.length === 0} icon="expand">
              View all
            </Button>
            <Button onClick={() => setIsModalOpen(true)} icon="plus">
              {addLabel}
            </Button>
          </>
        }
      />

      <div className="toolbar">
        <TableSearchBar value={query} onChange={setQuery} placeholder={`Search ${title.toLowerCase()}…`} />
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

      {note && <Alert tone="info">{note}</Alert>}
      {error && rows.length > 0 && <Alert>{error}</Alert>}

      <DataTable columns={columns} rows={filteredRows} isLoading={isLoading} actions={actions} error={error} />

      {isModalOpen && (
        <Modal title={addLabel} onClose={() => setIsModalOpen(false)} width={formWidth}>
          {renderForm({ onSuccess: handleCreated, onCancel: () => setIsModalOpen(false) })}
        </Modal>
      )}

      {isFullscreen && (
        <FullscreenTableModal
          title={title}
          columns={columns}
          rows={filteredRows}
          actions={actions}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}
