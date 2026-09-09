import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { masterEntities } from "../config/masterEntities";
import { masterDataService } from "../services/masterDataService";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { renderStatusCell } from "../../../lib/renderStatusCell";
import "./MasterDataPage.css";

const PAGE_SIZE = 10;

function buildColumns(rows) {
  if (rows.length === 0) return [];
  // status_name is just status's text label ("Active"/"Inactive") — redundant
  // with the Status badge column when both are present on the same row.
  const dropStatusName = "status" in rows[0] && "status_name" in rows[0];
  const keys = Object.keys(rows[0]).filter((k) => !k.startsWith("_") && !(dropStatusName && k === "status_name"));
  return keys.map((key) => {
    const isStatus = key === "status";
    return {
      key,
      label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      narrow: isStatus,
      // `status` is a numeric code (1 = Active, 13 = Inactive, ...), not a
      // 0/1 boolean — treating it as one showed every non-zero code as
      // "Active". renderStatusCell reads status_name (the real label) first.
      render: isStatus ? renderStatusCell : undefined,
    };
  });
}

/**
 * Browsing (no search) uses real server-side pagination — one page of 10
 * fetched per click, matching the API's actual paging contract (confirmed
 * live: /master/{type} genuinely returns a different slice per `page`, not
 * just the same rows re-sorted). The API's `search` param is a no-op on
 * this deployment (confirmed live), so search instead lazily fetches the
 * whole table once (cached, capped — fine for now, but not the pattern to
 * copy for a table that could hold far more rows) and filters client-side.
 *
 * "View all" is separate: it hands FullscreenTableModal a `fetchMore` so
 * the modal loads its own pages independently as the user scrolls, rather
 * than eagerly fetching everything up front like search does.
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
    const data = await masterDataService.list(entityKey, {}, config?.listPath);
    setFullRows(data);
    return data;
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
          <Button variant="secondary" onClick={() => setIsFullscreen(true)} disabled={rows.length === 0}>
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

      {isFullscreen && (
        <FullscreenTableModal
          title={config.label}
          columns={columns}
          rows={rows}
          onClose={() => setIsFullscreen(false)}
          // The table could hold far more rows than are safe to fetch/render
          // in one shot (e.g. Countries at 249, or a future much larger
          // reference table) — load it independently in chunks as the user
          // scrolls, instead of eagerly fetching everything up front.
          fetchMore={async (fetchPage, limit) => {
            const { rows: pageRows, pagination: p } = await masterDataService.listWithPagination(
              entityKey,
              { page: fetchPage, limit },
              config?.listPath
            );
            return { rows: pageRows, totalPages: p?.totalPages ?? 1 };
          }}
        />
      )}
    </div>
  );
}
