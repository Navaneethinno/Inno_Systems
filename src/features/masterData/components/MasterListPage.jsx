import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { masterEntities } from "../config/masterEntities";
import { masterDataService } from "../services/masterDataService";
import { DataTable } from "../../../components/ui/DataTable";
import { StatusBadge } from "../../../components/ui/StatusBadge";
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    masterDataService
      .list(entityKey, {}, config?.listPath)
      .then((data) => !cancelled && setRows(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [entityKey, config?.listPath]);

  if (!config) {
    return <div className="mdp__state">Unknown master data type "{entityKey}".</div>;
  }

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <h1 className="mdp__title">{config.label}</h1>
          <p className="mdp__subtitle">Reference data — read-only.</p>
        </div>
      </div>

      {error && <div className="mdp__error">{error}</div>}

      <DataTable columns={buildColumns(rows)} rows={rows} isLoading={isLoading} />
    </div>
  );
}
