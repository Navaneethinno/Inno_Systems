import { masterDataService } from "./masterDataService";

/**
 * There's no bulk "set the actions for this menu" endpoint — only the
 * generic per-row add/edit/delete for /system/master/menu_action/*. So a
 * "save" here is a diff against the existing assignments for this menu,
 * expressed as the minimal set of add/edit/delete calls.
 *
 * `desired` is a Map<action_id, priority> of what should be assigned after
 * saving. `existingRows` are the current menu_action rows for this menu
 * (each { id, menu_id, action_id, priority, status }).
 */
export async function saveMenuActions({ menuId, existingRows, desired }) {
  const existingByActionId = new Map(existingRows.map((row) => [row.action_id, row]));

  const toAdd = [...desired.entries()].filter(([actionId]) => !existingByActionId.has(actionId));
  const toRemove = existingRows.filter((row) => !desired.has(row.action_id));
  const toUpdate = existingRows.filter((row) => {
    const nextPriority = desired.get(row.action_id);
    return nextPriority !== undefined && nextPriority !== row.priority;
  });

  await Promise.all([
    ...toAdd.map(([actionId, priority]) =>
      masterDataService.add("menu_action", { menu_id: menuId, action_id: actionId, priority, status: 1 })
    ),
    ...toRemove.map((row) => masterDataService.remove("menu_action", row.id)),
    ...toUpdate.map((row) =>
      masterDataService.edit("menu_action", {
        id: row.id,
        menu_id: menuId,
        action_id: row.action_id,
        priority: desired.get(row.action_id),
        status: row.status,
      })
    ),
  ]);
}
