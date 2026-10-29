import { useEffect, useMemo, useState } from "react";
import { masterDataService } from "../services/masterDataService";
import { saveMenuActions } from "../services/menuActionService";
import { rowLabel, rowValue } from "../../../lib/rowLabel";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { PageHeader } from "../../../components/ui/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Alert } from "../../../components/ui/Alert";
import { SkeletonList } from "../../../components/ui/Skeleton";
import { useLiveList } from "../../../hooks/useLiveList";
import { API } from "../../../api/endpoints";
import "./MenuActionsPage.css";

export function MenuActionsPage() {
  const [modules, setModules] = useState([]);
  const [menus, setMenus] = useState([]);
  // Per SYSTEM_API_GUIDE.md, actions are a fixed list (1 Add, 2 View, 3
  // Edit, 4 Delete, 5 Authorise, 6 Self). /master/action (confirmed live)
  // returns exactly that, so this still fetches it like any other
  // reference type rather than hardcoding it twice.
  const [actions, setActions] = useState([]);
  const [menuActionRows, setMenuActionRows] = useState([]); // every existing menu/action assignment

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedMenuId, setSelectedMenuId] = useState("");

  // Draft edits for the selected menu: action_id -> priority. Only present
  // when an action is checked "on" for this menu.
  const [draft, setDraft] = useState(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);

  // `silent` skips the loading state — used for live-update refetches so an
  // in-progress edit (selected menu, draft checkboxes) isn't interrupted by
  // a skeleton flash every time someone else touches these tables.
  const loadAll = async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [moduleRows, menuRows, actionRows, menuActionData] = await Promise.all([
        masterDataService.list("module"),
        masterDataService.list("menu"),
        masterDataService.list("action"),
        masterDataService.list("menu_action"),
      ]);
      setModules(moduleRows);
      setMenus(menuRows);
      setActions(actionRows);
      setMenuActionRows(menuActionData);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Modules, menus, actions, and their assignments can all be edited from
  // other pages/tabs/users — keep this configurator in sync with each. See
  // the Live Menu Updates via WebSocket handoff doc.
  const refreshSilently = () => loadAll({ silent: true });
  useLiveList(API.LIVE.master("module"), refreshSilently);
  useLiveList(API.LIVE.master("menu"), refreshSilently);
  useLiveList(API.LIVE.master("action"), refreshSilently);
  useLiveList(API.LIVE.master("menu_action"), refreshSilently);

  const menusForModule = useMemo(
    () => menus.filter((menu) => selectedModuleId && String(menu.module_id) === String(selectedModuleId)),
    [menus, selectedModuleId]
  );

  const rowsForSelectedMenu = useMemo(
    () => menuActionRows.filter((row) => String(row.menu_id) === String(selectedMenuId)),
    [menuActionRows, selectedMenuId]
  );

  const selectedMenu = useMemo(
    () => menusForModule.find((menu) => String(rowValue(menu)) === String(selectedMenuId)),
    [menusForModule, selectedMenuId]
  );

  // Reset the menu whenever the module changes.
  const handleModuleChange = (value) => {
    setSelectedModuleId(value);
    setSelectedMenuId("");
    setDraft(new Map());
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleMenuSelect = (menuId) => {
    setSelectedMenuId(menuId);
    setSaveError(null);
    setSaveSuccess(null);
    const existing = menuActionRows.filter((row) => String(row.menu_id) === String(menuId));
    const nextDraft = new Map(existing.map((row) => [row.action_id, row.priority]));
    setDraft(nextDraft);
  };

  const toggleAction = (actionId, index) => {
    setSaveSuccess(null);
    setDraft((prev) => {
      const next = new Map(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.set(actionId, index + 1);
      }
      return next;
    });
  };

  const setPriority = (actionId, priority) => {
    setDraft((prev) => {
      const next = new Map(prev);
      next.set(actionId, priority);
      return next;
    });
  };

  const allActionsSelected = actions.length > 0 && actions.every((action) => draft.has(rowValue(action)));

  const toggleAllActions = (selectAll) => {
    setSaveSuccess(null);
    setDraft(
      selectAll ? new Map(actions.map((action, index) => [rowValue(action), index + 1])) : new Map()
    );
  };

  const hasChanges = useMemo(() => {
    if (!selectedMenuId) return false;
    const existing = new Map(rowsForSelectedMenu.map((row) => [row.action_id, row.priority]));
    if (existing.size !== draft.size) return true;
    for (const [actionId, priority] of draft) {
      if (existing.get(actionId) !== priority) return true;
    }
    return false;
  }, [draft, rowsForSelectedMenu, selectedMenuId]);

  const handleSave = async () => {
    if (!selectedMenuId || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await saveMenuActions({
        menuId: Number(selectedMenuId),
        existingRows: rowsForSelectedMenu,
        desired: draft,
      });
      const refreshed = await masterDataService.list("menu_action");
      setMenuActionRows(refreshed);
      setSaveSuccess("Actions saved for this menu.");
    } catch (err) {
      setSaveError(err.message || "Unable to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader eyebrow="Master Data" title="Menu Actions" subtitle="Choose which actions each menu offers, and in what order." />

      {error && (
        <Alert action={{ label: "Retry", onClick: loadAll }}>Unable to load data. Please try again.</Alert>
      )}

      <div className="field-inline">
        <span className="field-inline__label">Module</span>
        <Select
          placeholder={isLoading ? "Loading modules…" : "Select Module"}
          options={modules.map((module) => ({ value: rowValue(module), label: rowLabel(module) }))}
          value={selectedModuleId}
          disabled={isLoading}
          onChange={(e) => handleModuleChange(e.target.value)}
        />
      </div>

      {!selectedModuleId ? (
        <EmptyState
          icon="filter"
          title={isLoading ? "Loading modules…" : "Pick a module"}
          message="Select a module to view its menus and configure actions."
        />
      ) : (
        <div className="map__layout">
          <div className="card map__menus">
            <div className="map__panel-head">
              <h2 className="map__panel-title">Menus</h2>
              {!isLoading && <span className="map__panel-count">{menusForModule.length}</span>}
            </div>
            {isLoading ? (
              <SkeletonList count={3} />
            ) : menusForModule.length === 0 ? (
              <EmptyState plain message="No menus available for this module." />
            ) : (
              <div className="map__menu-list">
                {menusForModule.map((menu) => {
                  const menuId = rowValue(menu);
                  const assignedCount = menuActionRows.filter(
                    (row) => String(row.menu_id) === String(menuId)
                  ).length;
                  const isActive = String(menuId) === String(selectedMenuId);
                  return (
                    <button
                      type="button"
                      key={menuId}
                      className={`map__menu-card ${isActive ? "map__menu-card--active" : ""}`}
                      onClick={() => handleMenuSelect(menuId)}
                    >
                      <span className="map__menu-dot" aria-hidden="true" />
                      <span className="map__menu-info">
                        <span className="map__menu-name">{rowLabel(menu)}</span>
                        <span className="map__menu-meta">
                          {assignedCount} action{assignedCount === 1 ? "" : "s"} configured
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card map__actions">
            {!selectedMenuId ? (
              <EmptyState plain icon="arrowRight" title="Pick a menu" message="Select a menu on the left to configure its actions." />
            ) : (
              <>
                <div className="map__panel-head">
                  <div>
                    <h2 className="map__panel-title">
                      Actions for <span className="map__panel-menu">{rowLabel(selectedMenu ?? {})}</span>
                    </h2>
                    <p className="map__actions-hint">Select the actions that should be available for this menu.</p>
                  </div>
                </div>

                {isLoading ? (
                  <SkeletonList count={3} height={44} />
                ) : actions.length === 0 ? (
                  <EmptyState plain message="No actions configured yet. Select the actions you want to enable." />
                ) : (
                  <div className="map__action-table">
                    <div className="map__action-head">
                      <span className="map__action-select-all">
                        <label>
                          <input
                            type="checkbox"
                            checked={allActionsSelected}
                            onChange={(e) => toggleAllActions(e.target.checked)}
                          />
                          Action
                        </label>
                      </span>
                      <span>Priority</span>
                      <span>Status</span>
                    </div>
                    {actions.map((action, index) => {
                      const actionId = rowValue(action);
                      const checked = draft.has(actionId);
                      return (
                        <label key={actionId} className="map__action-row">
                          <span className="map__action-name">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAction(actionId, index)}
                            />
                            {rowLabel(action)}
                          </span>
                          <span className="map__action-priority">
                            {checked ? (
                              <input
                                type="number"
                                min={1}
                                className="map__priority-input"
                                value={draft.get(actionId)}
                                onKeyDown={(e) => {
                                  if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
                                }}
                                onChange={(e) => setPriority(actionId, Math.max(1, Number(e.target.value) || 1))}
                              />
                            ) : (
                              <span className="map__priority-empty">—</span>
                            )}
                          </span>
                          <span className="map__action-status">
                            {checked && <StatusBadge active />}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {saveError && <Alert>{saveError}</Alert>}
                {saveSuccess && <Alert tone="success">{saveSuccess}</Alert>}

                <div className="map__save-bar">
                  {hasChanges && <span className="map__unsaved">Unsaved changes</span>}
                  <Button
                    type="button"
                    onClick={handleSave}
                    loading={isSaving}
                    disabled={!selectedMenuId || !hasChanges}
                  >
                    Save Changes
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
