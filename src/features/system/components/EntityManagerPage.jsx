import { useState } from "react";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { StatusFilterTabs } from "../../../components/ui/StatusFilterTabs";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Alert } from "../../../components/ui/Alert";
import { useLiveList } from "../../../hooks/useLiveList";
import { useServerList } from "../../../hooks/useServerList";

/**
 * Shared shell for the "System" list pages: a server-paged table of what
 * already exists plus a "+ Add" button that opens the create form in a
 * modal.
 *
 * `listPath` is the list endpoint; paging, the tabs and search run on the
 * server (see useServerList).
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
  eyebrow,
  addLabel,
  columns,
  listPath,
  renderForm,
  note,
  actions,
  livePath,
  formWidth = 640,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { rows, pagination, counts, page, setPage, filter, changeFilter, query, setQuery, search, isLoading, error, refresh, fetchPage } =
    useServerList(listPath);

  useLiveList(livePath, refresh);

  const handleCreated = () => {
    setIsModalOpen(false);
    refresh();
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={counts ? `${counts.all} registered · ${counts.active} active` : undefined}
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

      {note && <Alert tone="info">{note}</Alert>}
      {error && rows.length > 0 && <Alert>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        actions={actions}
        error={error}
        emptyMessage={search || filter !== "all" ? "No matching records." : "No records found."}
        pagination={pagination}
        page={page}
        onPageChange={setPage}
      />

      {isModalOpen && (
        <Modal title={addLabel} onClose={() => setIsModalOpen(false)} width={formWidth}>
          {renderForm({ onSuccess: handleCreated, onCancel: () => setIsModalOpen(false) })}
        </Modal>
      )}

      {isFullscreen && (
        <FullscreenTableModal
          title={title}
          columns={columns}
          rows={rows}
          actions={actions}
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
