import { useCallback, useEffect, useState } from "react";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { StatusFilterTabs } from "../../../components/ui/StatusFilterTabs";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Alert } from "../../../components/ui/Alert";
import { useLiveList } from "../../../hooks/useLiveList";
import { systemService } from "../services/systemService";

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 300;
const FILTERS = ["all", "active", "pending"];

/**
 * Shared shell for the "System" list pages: a server-paged table of what
 * already exists plus a "+ Add" button that opens the create form in a
 * modal.
 *
 * `listPath` is the list endpoint. Paging, the All / Active / Pending tabs
 * and search all run on the server (page, limit, filter, search), as the
 * backend asks: the tab counts are each filter's `totalRecords`, so they
 * always agree with what the tab shows.
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
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [counts, setCounts] = useState(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tick, setTick] = useState(0);

  // Search waits for a pause in typing, and starts again from page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [query]);

  const changeFilter = (next) => {
    setFilter(next);
    setPage(1);
  };

  const fetchPage = useCallback(
    (args) => systemService.pageList(listPath, { limit: PAGE_SIZE, filter, search, ...args }),
    [listPath, filter, search]
  );

  // `tick` > 0 is a refresh after a change: reload quietly, keeping the rows.
  useEffect(() => {
    let cancelled = false;
    if (tick === 0) setIsLoading(true);
    setError(null);
    fetchPage({ page })
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setPagination(result.pagination);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchPage, page, tick]);

  // The tab counts: one row per filter is enough to read its total.
  useEffect(() => {
    let cancelled = false;
    Promise.all(FILTERS.map((f) => systemService.pageList(listPath, { page: 1, limit: 1, filter: f, search })))
      .then((results) => {
        if (cancelled) return;
        const [all, active, pending] = results.map((r) => r.pagination?.totalRecords ?? r.rows.length);
        setCounts({ all, active, pending });
      })
      .catch(() => !cancelled && setCounts(null));
    return () => {
      cancelled = true;
    };
  }, [listPath, search, tick]);

  const refresh = () => setTick((t) => t + 1);
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
