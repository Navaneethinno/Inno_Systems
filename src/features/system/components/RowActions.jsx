import { IconButton } from "../../../components/ui/IconButton";
import { waitingChange } from "../../../lib/statusCodes";

/**
 * A row's Edit / Delete buttons. They're off while the row has a change
 * waiting for approval, since the backend refuses any other request until
 * it's approved or rejected; the tooltip says which change.
 */
export function RowActions({ row, onEdit, onDelete }) {
  const waiting = waitingChange(row);
  const why = waiting ? `${waiting}: wait until it's approved or rejected` : null;
  return (
    <>
      {onEdit && <IconButton icon="edit" label={why ?? "Edit"} disabled={Boolean(waiting)} onClick={() => onEdit(row)} />}
      {onDelete && (
        <IconButton icon="trash" label={why ?? "Delete"} tone="danger" disabled={Boolean(waiting)} onClick={() => onDelete(row)} />
      )}
    </>
  );
}
