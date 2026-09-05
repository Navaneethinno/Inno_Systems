/**
 * Best-effort human-readable label for a master/reference-data row, since
 * different entities use different name fields (name, menu_name,
 * type_name, ...). Falls back to scanning for any *_name field before
 * giving up and showing a bare #id.
 */
export function rowLabel(row) {
  const known =
    row.name ??
    row.menu_name ??
    row.action_name ??
    row.profile_name ??
    row.inst_name ??
    row.institution_name ??
    row.module_name ??
    row.type_name ??
    row.title;
  if (known) return known;

  const anyNameField = Object.keys(row)
    .filter((key) => key.endsWith("_name") && typeof row[key] === "string" && row[key])
    .map((key) => row[key])[0];

  return anyNameField ?? `#${row.id}`;
}

export function rowValue(row) {
  return row.id ?? row.profile_id ?? row.inst_profile_id ?? row.menu_id ?? row.action_id;
}
