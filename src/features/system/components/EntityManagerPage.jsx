import { useCallback, useEffect, useState } from "react";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { FullscreenTableModal } from "../../../components/ui/FullscreenTableModal";
import { StatusFilterTabs } from "../../../components/ui/StatusFilterTabs";
import { TableSearchBar } from "../../../components/ui/TableSearchBar";
import { useAuthStatusFilter } from "../../../hooks/useAuthStatusFilter";
import "../../masterData/components/MasterDataPage.css";
import "./SystemFormPage.css";

/**
 * Shared shell for the "System" add pages: a table of what already exists
 * (fetched via the entity's dropdown/list source) plus a "+ Add" button
 * that opens the create form in a modal instead of a bare standalone page —
 * so you can actually see what you've created.
 */
export function EntityManagerPage({ title, subtitle, eyebrow, addLabel, columns, loadRows, renderForm, note }) {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { filter, setFilter, query, setQuery, filteredRows, hasAuthStatus, activeCount, pendingCount, totalCount } =
    useAuthStatusFilter(rows);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRows(await loadRows());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [loadRows]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreated = () => {
    setIsModalOpen(false);
    refresh();
  };

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          {eyebrow && <span className="mdp__eyebrow">{eyebrow}</span>}
          <h1 className="mdp__title">{title}</h1>
          <p className="mdp__subtitle">
            {hasAuthStatus ? `${totalCount} registered · ${activeCount} active` : subtitle}
          </p>
        </div>
        <div className="mdp__header-actions">
          <Button variant="secondary" onClick={() => setIsFullscreen(true)} disabled={rows.length === 0}>
            ⛶ View all
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>+ {addLabel}</Button>
        </div>
      </div>

      <div className="mdp__toolbar">
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

      {note && <div className="sfp__success">{note}</div>}
      {error && <div className="mdp__error">{error}</div>}

      <DataTable columns={columns} rows={filteredRows} isLoading={isLoading} />

      {isModalOpen && (
        <Modal title={addLabel} onClose={() => setIsModalOpen(false)} width={640}>
          {renderForm({ onSuccess: handleCreated, onCancel: () => setIsModalOpen(false) })}
        </Modal>
      )}

      {isFullscreen && (
        <FullscreenTableModal
          title={title}
          columns={columns}
          rows={filteredRows}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}
