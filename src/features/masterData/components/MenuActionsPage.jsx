import { useEffect, useMemo, useState } from "react";
import { masterDataService } from "../services/masterDataService";
import { saveMenuActions } from "../services/menuActionService";
import { rowLabel } from "../../../lib/rowLabel";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import "./MasterDataPage.css";
import "./MenuActionsPage.css";

export function MenuActionsPage() {
  const [modules, setModules] = useState([]);
  const [menus, setMenus] = useState([]);
  const [actions, setActions] = useState([]); // the master action catalog — comes from /master/action/list
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

  const loadAll = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const menusForModule = useMemo(
    () => menus.filter((menu) => selectedModuleId && String(menu.module_id) === String(selectedModuleId)),
    [menus, selectedModuleId]
  );

  const rowsForSelectedMenu = useMemo(
    () => menuActionRows.filter((row) => String(row.menu_id) === String(selectedMenuId)),
    [menuActionRows, selectedMenuId]
  );

  const selectedMenu = useMemo(
    () => menusForModule.find((menu) => String(menu.id) === String(selectedMenuId)),
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
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <h1 className="mdp__title">Menu Actions</h1>
          <p className="mdp__subtitle">Manage actions available for menus.</p>
        </div>
      </div>

      {error && (
        <div className="mdp__error">
          Unable to load data. Please try again.{" "}
          <button type="button" className="map__retry" onClick={loadAll}>
            Retry
          </button>
        </div>
      )}

      <div className="map__module">
        <span className="map__module-label">Module</span>
        <Select
          placeholder={isLoading ? "Loading modules…" : "Select Module"}
          options={modules.map((m) => ({ value: m.id, label: rowLabel(m) }))}
          value={selectedModuleId}
          disabled={isLoading}
          onChange={(e) => handleModuleChange(e.target.value)}
        />
      </div>

      {!selectedModuleId ? (
        <div className="map__empty">
          {isLoading ? "Loading…" : "Select a module to view its menus and configure actions."}
        </div>
      ) : (
        <div className="map__layout">
          <div className="map__menus">
            <div className="map__panel-title">Menus</div>
            {isLoading ? (
              <div className="map__skeleton-list">
                <div className="map__skeleton-card" />
                <div className="map__skeleton-card" />
              </div>
            ) : menusForModule.length === 0 ? (
              <div className="map__empty map__empty--panel">No menus available for this module.</div>
            ) : (
              <div className="map__menu-list">
                {menusForModule.map((menu) => {
                  const assignedCount = menuActionRows.filter(
                    (row) => String(row.menu_id) === String(menu.id)
                  ).length;
                  const isActive = String(menu.id) === String(selectedMenuId);
                  return (
                    <button
                      type="button"
                      key={menu.id}
                      className={`map__menu-card ${isActive ? "map__menu-card--active" : ""}`}
                      onClick={() => handleMenuSelect(menu.id)}
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

          <div className="map__actions">
            {!selectedMenuId ? (
              <div className="map__empty map__empty--panel">Select a menu to configure its actions.</div>
            ) : (
              <>
                <div className="map__panel-title">Actions for: {rowLabel(selectedMenu ?? {}).toUpperCase()}</div>
                <p className="map__actions-hint">Select the actions that should be available for this menu.</p>

                {isLoading ? (
                  <div className="map__skeleton-list">
                    <div className="map__skeleton-row" />
                    <div className="map__skeleton-row" />
                    <div className="map__skeleton-row" />
                  </div>
                ) : actions.length === 0 ? (
                  <div className="map__empty map__empty--panel">
                    No actions configured yet. Select the actions you want to enable.
                  </div>
                ) : (
                  <div className="map__action-table">
                    <div className="map__action-head">
                      <span>Action</span>
                      <span>Priority</span>
                      <span>Status</span>
                    </div>
                    {actions.map((action, index) => {
                      const checked = draft.has(action.id);
                      return (
                        <label key={action.id} className="map__action-row">
                          <span className="map__action-name">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAction(action.id, index)}
                            />
                            {rowLabel(action)}
                          </span>
                          <span className="map__action-priority">
                            {checked ? (
                              <input
                                type="number"
                                min={1}
                                className="map__priority-input"
                                value={draft.get(action.id)}
                                onChange={(e) => setPriority(action.id, Number(e.target.value) || 1)}
                              />
                            ) : (
                              <span className="map__priority-empty">—</span>
                            )}
                          </span>
                          <span className="map__action-status">
                            {checked && (
                              <span className="dt__status dt__status--active">Active</span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {saveError && <div className="mdp__error">{saveError}</div>}
                {saveSuccess && <div className="mdp__success">{saveSuccess}</div>}

                <div className="map__save-bar">
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
