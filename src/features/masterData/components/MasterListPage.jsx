import { useState } from "react";
import { useParams } from "react-router-dom";
import { masterEntities } from "../config/masterEntities";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { PageHeader } from "../../../components/ui/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Alert } from "../../../components/ui/Alert";
import { renderStatusCell } from "../../../lib/renderStatusCell";
import { StatusFilterTabs } from "../../../components/ui/StatusFilterTabs";
import { useLiveList } from "../../../hooks/useLiveList";
import { useServerList } from "../../../hooks/useServerList";
import { API } from "../../../api/endpoints";

// Master data has no maker-checker: status is 1 Active or 13 Inactive.
const MASTER_FILTERS = ["all", "active", "inactive"];

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
 * A read-only reference table. Paging, search and the All / Active /
 * Inactive tabs run on the server, which /master/{type} supports (backend
 * round 4); "View all" loads its own pages as the user scrolls.
 */
export function MasterListPage() {
  const { entityKey } = useParams();
  const config = masterEntities[entityKey];
  return config ? <ReferenceList key={entityKey} entityKey={entityKey} config={config} /> : (
    <EmptyState icon="alert" title="Not found" message={`Unknown master data type "${entityKey}".`} />
  );
}

function ReferenceList({ entityKey, config }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const listPath = config.listPath ?? API.MASTER.list(entityKey);
  const { rows, pagination, counts, page, setPage, filter, changeFilter, query, setQuery, search, isLoading, error, refresh, fetchPage } =
    useServerList(listPath, undefined, MASTER_FILTERS);

  // Reference tables (Countries, Currencies, ...) are shared across the
  // whole system — refetch when another client changes them. See the Live
  // Menu Updates via WebSocket handoff doc.
  useLiveList(listPath.replace(/^\/+/, ""), refresh);

  const columns = buildColumns(rows);

  return (
    <div className="page">
      <PageHeader
        title={config.label}
        subtitle="Reference data — read-only."
        actions={
          <Button variant="secondary" onClick={() => setIsFullscreen(true)} disabled={rows.length === 0} icon="expand">
            View all
          </Button>
        }
      />

      <div className="toolbar">
        <TableSearchBar value={query} onChange={setQuery} placeholder={`Search ${config.label.toLowerCase()}…`} />
        {counts && <StatusFilterTabs filter={filter} onChange={changeFilter} counts={counts} />}
      </div>

      {error && rows.length > 0 && <Alert>{error}</Alert>}

      <DataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        error={error}
        emptyMessage={search || filter !== "all" ? "No matching records." : "No records found."}
        pagination={pagination}
        page={page}
        onPageChange={setPage}
      />

      {isFullscreen && (
        <FullscreenTableModal
          title={config.label}
          columns={columns}
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
