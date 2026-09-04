import { useEffect, useMemo, useState } from "react";
import { masterDataService } from "../../masterData/services/masterDataService";
import { systemService } from "../services/systemService";
import { rowLabel } from "../../../lib/rowLabel";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import "../../masterData/components/MasterDataPage.css";
import "./SystemFormPage.css";
import "./ProfileFormPage.css";

export function ProfileFormPage() {
  const [profileName, setProfileName] = useState("");
  const [instProfileId, setInstProfileId] = useState("");
  const [institutions, setInstitutions] = useState([]);
  const [menus, setMenus] = useState([]);
  const [actionsByMenu, setActionsByMenu] = useState({}); // menu_id -> [{id, name}]
  const [assignments, setAssignments] = useState({}); // menu_id -> { included, actionIds: Set, isConfigOnly }
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [instRows, menuRows, actionRows, menuActionRows] = await Promise.all([
          systemService.listActiveInstitutions(),
          masterDataService.list("menu"),
          masterDataService.list("action"),
          masterDataService.list("menu_action"),
        ]);
        if (cancelled) return;

        setInstitutions(instRows);
        setMenus(menuRows);

        const actionsById = Object.fromEntries(actionRows.map((a) => [a.id, a]));
        const grouped = {};
        menuActionRows.forEach((ma) => {
          const action = actionsById[ma.action_id];
          if (!action) return;
          (grouped[ma.menu_id] ??= []).push(action);
        });
        setActionsByMenu(grouped);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const institutionOptions = useMemo(
    () => institutions.map((row) => ({ value: row.id ?? row.inst_profile_id, label: rowLabel(row) })),
    [institutions]
  );

  const toggleMenu = (menuId, included) => {
    setAssignments((prev) => ({
      ...prev,
      [menuId]: { included, actionIds: new Set(prev[menuId]?.actionIds), isConfigOnly: prev[menuId]?.isConfigOnly ?? false },
    }));
  };

  const toggleAction = (menuId, actionId) => {
    setAssignments((prev) => {
      const current = prev[menuId] ?? { included: true, actionIds: new Set(), isConfigOnly: false };
      const nextActionIds = new Set(current.actionIds);
      if (nextActionIds.has(actionId)) {
        nextActionIds.delete(actionId);
      } else {
        nextActionIds.add(actionId);
      }
      return { ...prev, [menuId]: { ...current, actionIds: nextActionIds } };
    });
  };

  const toggleConfigOnly = (menuId, value) => {
    setAssignments((prev) => {
      const current = prev[menuId] ?? { included: true, actionIds: new Set(), isConfigOnly: false };
      return { ...prev, [menuId]: { ...current, isConfigOnly: value } };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const menu_info = Object.entries(assignments)
        .filter(([, a]) => a.included)
        .map(([menuId, a]) => ({
          menu_id: Number(menuId),
          actions: [...a.actionIds],
          is_configuration_only: a.isConfigOnly ? 1 : 0,
        }));

      const payload = {
        profile_info: {
          profile_id: 0,
          profile_name: profileName,
          inst_profile_id: Number(instProfileId),
        },
        menu_info,
      };

      const result = await systemService.addProfile(payload);
      setSuccess(`Profile created${result?.profile_id ? ` (id: ${result.profile_id})` : ""}.`);
      setProfileName("");
      setInstProfileId("");
      setAssignments({});
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mdp">
      <div className="mdp__header">
        <div>
          <h1 className="mdp__title">Add Profile</h1>
          <p className="mdp__subtitle">Creates a profile and assigns menu/action access.</p>
        </div>
      </div>

      {error && <div className="mdp__error">{error}</div>}
      {success && <div className="sfp__success">{success}</div>}

      <form className="pfp__form" onSubmit={handleSubmit}>
        <div className="pfp__basics">
          <TextField
            label="Profile name"
            required
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />
          <Select
            label="Institution"
            placeholder="Select institution"
            required
            options={institutionOptions}
            value={instProfileId}
            onChange={(e) => setInstProfileId(e.target.value)}
          />
        </div>

        <h2 className="pfp__section-title">Menu access</h2>
        {isLoading ? (
          <div className="mdp__state">Loading menus…</div>
        ) : menus.length === 0 ? (
          <div className="mdp__state">No menus found.</div>
        ) : (
          <div className="pfp__menu-list">
            {menus.map((menu) => {
              const assignment = assignments[menu.id];
              const included = Boolean(assignment?.included);
              const menuActions = actionsByMenu[menu.id] ?? [];

              return (
                <div key={menu.id} className={`pfp__menu-card ${included ? "pfp__menu-card--active" : ""}`}>
                  <label className="pfp__menu-header">
                    <input
                      type="checkbox"
                      checked={included}
                      onChange={(e) => toggleMenu(menu.id, e.target.checked)}
                    />
                    <span>{rowLabel(menu)}</span>
                  </label>

                  {included && (
                    <div className="pfp__menu-body">
                      {menuActions.length === 0 ? (
                        <p className="pfp__no-actions">No actions configured for this menu.</p>
                      ) : (
                        <div className="pfp__actions">
                          {menuActions.map((action) => (
                            <label key={action.id} className="pfp__action">
                              <input
                                type="checkbox"
                                checked={Boolean(assignment?.actionIds?.has(action.id))}
                                onChange={() => toggleAction(menu.id, action.id)}
                              />
                              <span>{rowLabel(action)}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      <label className="pfp__config-only">
                        <input
                          type="checkbox"
                          checked={Boolean(assignment?.isConfigOnly)}
                          onChange={(e) => toggleConfigOnly(menu.id, e.target.checked)}
                        />
                        <span>Configuration only</span>
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Button type="submit" loading={isSaving} className="sfp__submit">
          Create Profile
        </Button>
      </form>
    </div>
  );
}
