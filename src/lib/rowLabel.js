/**
 * Best-effort human-readable label for a master/reference-data row, since
 * different entities use different name fields (name, menu_name, ...).
 */
export function rowLabel(row) {
  return (
    row.name ??
    row.menu_name ??
    row.action_name ??
    row.profile_name ??
    row.inst_name ??
    row.title ??
    `#${row.id}`
  );
}

export function rowValue(row) {
  return row.id ?? row.profile_id ?? row.inst_profile_id ?? row.menu_id ?? row.action_id;
}
