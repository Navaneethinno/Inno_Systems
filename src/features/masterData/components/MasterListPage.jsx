import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { masterEntities } from "../config/masterEntities";
import { masterDataService } from "../services/masterDataService";
import { DataTable } from "../../../components/ui/DataTable";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Button } from "../../../components/ui/Button";
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import "./MasterDataPage.css";

const PAGE_SIZE = 10;

function buildColumns(rows) {
  if (rows.length === 0) return [];
  const keys = Object.keys(rows[0]).filter((k) => !k.startsWith("_"));
  return keys.map((key) => {
    const isStatus = key === "status";
    return {
      key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      narrow: isStatus,
      render: isStatus ? (row) => <StatusBadge active={Boolean(row[key])} /> : undefined,
    };
  });
}

/**
 * Browsing (no search) uses real server-side pagination — one page of 10
 * fetched per click, matching the API's actual paging contract (confirmed
 * live: /master/{type} genuinely returns a different slice per `page`, not
 * just the same rows re-sorted). The API's `search` param is a no-op on
 * this deployment (confirmed live), so search instead lazily fetches the
 * whole table once (cached) and filters client-side — same fetch is reused
 * for "View all".
 */
export function MasterListPage() {
  const { entityKey } = useParams();
  const config = masterEntities[entityKey];

  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [fullRows, setFullRows] = useState(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setPage(1);
    setFullRows(null);
    setQuery("");
  }, [entityKey]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    masterDataService
      .listWithPagination(entityKey, { page, limit: PAGE_SIZE }, config?.listPath)
      .then(({ rows: data, pagination: p }) => {
        if (cancelled) return;
        setRows(data);
        setPagination(p);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [entityKey, page, config?.listPath]);

  const ensureFullRows = useCallback(async () => {
    if (fullRows) return fullRows;
    setIsLoadingFull(true);
    try {
      const data = await masterDataService.list(entityKey, {}, config?.listPath);
      setFullRows(data);
      return data;
    } finally {
      setIsLoadingFull(false);
    }
  }, [entityKey, fullRows, config?.listPath]);

  useEffect(() => {
    if (query.trim()) ensureFullRows();
  }, [query, ensureFullRows]);

  const q = query.trim().toLowerCase();
  const searchActive = Boolean(q);

  const filteredRows = useMemo(() => {
    if (!searchActive || !fullRows) return null;
    return fullRows.filter((row) =>
      Object.values(row).some((v) => v != null && typeof v !== "object" && String(v).toLowerCase().includes(q))
    );
  }, [fullRows, q, searchActive]);

  const handleOpenFullscreen = async () => {
    await ensureFullRows();
    setIsFullscreen(true);
  };

  if (!config) {
    return <div className="mdp__state">Unknown master data type "{entityKey}".</div>;
  }

  const columns = buildColumns(searchActive ? fullRows ?? [] : rows);

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <h1 className="mdp__title">{config.label}</h1>
          <p className="mdp__subtitle">Reference data — read-only.</p>
        </div>
        <div className="mdp__header-actions">
          <Button variant="secondary" onClick={handleOpenFullscreen} loading={isLoadingFull} disabled={rows.length === 0}>
            ⛶ View all
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mdp__toolbar">
          <TableSearchBar value={query} onChange={setQuery} placeholder={`Search ${config.label.toLowerCase()}…`} />
        </div>
      )}

      {error && <div className="mdp__error">{error}</div>}

      {searchActive ? (
        <DataTable columns={columns} rows={filteredRows ?? []} isLoading={filteredRows === null} emptyMessage="No matching records." />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          pagination={pagination}
          page={page}
          onPageChange={setPage}
        />
      )}

      {isFullscreen && fullRows && (
        <FullscreenTableModal
          title={config.label}
          columns={buildColumns(fullRows)}
          rows={fullRows}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}
