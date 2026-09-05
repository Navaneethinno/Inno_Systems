import { useCallback, useEffect, useState } from "react";
import { DataTable } from "../../../components/ui/DataTable";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import "../../masterData/components/MasterDataPage.css";
import "./SystemFormPage.css";

/**
 * Shared shell for the "System" add pages: a table of what already exists
 * (fetched via the entity's dropdown/list source) plus a "+ Add" button
 * that opens the create form in a modal instead of a bare standalone page —
 * so you can actually see what you've created.
 */
export function EntityManagerPage({ title, subtitle, addLabel, columns, loadRows, renderForm, note }) {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          <h1 className="mdp__title">{title}</h1>
          <p className="mdp__subtitle">{subtitle}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>+ {addLabel}</Button>
      </div>

      {note && <div className="sfp__success">{note}</div>}
      {error && <div className="mdp__error">{error}</div>}

      <DataTable columns={columns} rows={rows} isLoading={isLoading} />

      {isModalOpen && (
        <Modal title={addLabel} onClose={() => setIsModalOpen(false)} width={640}>
          {renderForm({ onSuccess: handleCreated, onCancel: () => setIsModalOpen(false) })}
        </Modal>
      )}
    </div>
  );
}
