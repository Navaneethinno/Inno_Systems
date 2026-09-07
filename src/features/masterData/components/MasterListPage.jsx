import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { masterEntities } from "../config/masterEntities";
import { masterDataService } from "../services/masterDataService";
import { DataTable } from "../../../components/ui/DataTable";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { Button } from "../../../components/ui/Button";
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import "./MasterDataPage.css";

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

export function MasterListPage() {
  const { entityKey } = useParams();
  const config = masterEntities[entityKey];

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    masterDataService
      .listWithPagination(entityKey, {}, config?.listPath)
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
  }, [entityKey, config?.listPath]);

  const q = query.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    if (!q) return rows;
    return rows.filter((row) =>
      Object.values(row).some((v) => v != null && typeof v !== "object" && String(v).toLowerCase().includes(q))
    );
  }, [rows, q]);

  if (!config) {
    return <div className="mdp__state">Unknown master data type "{entityKey}".</div>;
  }

  const columns = buildColumns(rows);

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

      <DataTable
        columns={columns}
        rows={filteredRows}
        isLoading={isLoading}
        // Only show the server's total while unfiltered — a search narrows
        // filteredRows below the API's whole-table count.
        pagination={q ? undefined : pagination}
      />

      {isFullscreen && (
        <FullscreenTableModal
          title={config.label}
          columns={columns}
          rows={filteredRows}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}
