import { useEffect, useMemo, useState } from "react";
import { masterDataService } from "../../masterData/services/masterDataService";
import { systemService } from "../services/systemService";
import { rowLabel, rowValue } from "../../../lib/rowLabel";
import { TextField } from "../../../components/ui/TextField";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { renderStatusCell } from "../../../lib/renderStatusCell";
import { EntityManagerPage } from "./EntityManagerPage";
import "./SystemFormPage.css";
import "./ProfileFormPage.css";

function ProfileForm({ row, onSuccess, onCancel }) {
  const isEdit = Boolean(row);
  const [profileName, setProfileName] = useState(isEdit ? row.profile_name ?? "" : "");
  const [instProfileId, setInstProfileId] = useState(isEdit ? String(row.inst_profile_id ?? "") : "");
  const [institutions, setInstitutions] = useState([]);
  const [menus, setMenus] = useState([]);
  const [actions, setActions] = useState([]); // the full /master/action catalog — same list offered on every menu
  const [assignments, setAssignments] = useState({}); // menu_id -> { included, actionIds: Set }
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        // The list endpoint doesn't include menu_actions, so editing needs
        // a separate fetch of the one profile's current assignments to
        // prefill from — otherwise submitting the edit with an empty
        // menu_info would wipe out every existing permission.
        //
        // Actions offered per menu come straight from /master/action (all
        // 6: Add, View, Edit, Delete, Authorise, Self) rather than being
        // filtered down to whatever's been linked via Menu Actions master
        // data — a permission a menu doesn't have a matching Menu Action
        // row for yet should still be assignable here.
        const [instRows, menuRows, actionRows, profileDetail] = await Promise.all([
          systemService.listActiveInstitutions(),
          masterDataService.list("menu"),
          masterDataService.list("action"),
          isEdit ? systemService.getProfile(rowValue(row)) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        setInstitutions(instRows);
        setMenus(menuRows);
        setActions(actionRows);

        if (profileDetail?.menu_actions) {
          const seeded = Object.fromEntries(
            profileDetail.menu_actions.map((ma) => [
              String(ma.menu_id),
              { included: true, actionIds: new Set(ma.actions ?? []) },
            ])
          );
          setAssignments(seeded);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // isEdit/row are fixed for this component instance's lifetime (a new
    // modal mounts per row), so this still only runs once.
  }, [isEdit, row]);

  const institutionOptions = useMemo(
    () => institutions.map((row) => ({ value: rowValue(row), label: rowLabel(row) })),
    [institutions]
  );

  const toggleMenu = (menuId, included) => {
    setAssignments((prev) => ({
      ...prev,
      [menuId]: { included, actionIds: new Set(prev[menuId]?.actionIds) },
    }));
  };

  const toggleAction = (menuId, actionId) => {
    setAssignments((prev) => {
      const current = prev[menuId] ?? { included: true, actionIds: new Set() };
      const nextActionIds = new Set(current.actionIds);
      if (nextActionIds.has(actionId)) {
        nextActionIds.delete(actionId);
      } else {
        nextActionIds.add(actionId);
      }
      return { ...prev, [menuId]: { ...current, actionIds: nextActionIds } };
    });
  };

  const toggleAllActions = (menuId, allActionIds, selectAll) => {
    setAssignments((prev) => {
      const current = prev[menuId] ?? { included: true, actionIds: new Set() };
      return {
        ...prev,
        [menuId]: { ...current, actionIds: new Set(selectAll ? allActionIds : []) },
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      // Per SYSTEM_API_GUIDE.md, menu_info is just { menu_id, actions } —
      // no is_configuration_only field.
      const menu_info = Object.entries(assignments)
        .filter(([, a]) => a.included)
        .map(([menuId, a]) => ({
          menu_id: Number(menuId),
          actions: [...a.actionIds],
        }));

      // The real add request omits profile_id entirely (it's only present
      // when editing an existing profile) — sending 0 is not the same thing.
      const payload = {
        profile_info: {
          ...(isEdit ? { profile_id: rowValue(row) } : {}),
          profile_name: profileName,
          inst_profile_id: Number(instProfileId),
        },
        menu_info,
      };

      if (isEdit) await systemService.editProfile(payload);
      else await systemService.addProfile(payload);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="pfp__form" onSubmit={handleSubmit}>
      {error && <div className="mdp__error">{error}</div>}

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
            const menuId = rowValue(menu);
            const assignment = assignments[menuId];
            const included = Boolean(assignment?.included);
            const allActionIds = actions.map(rowValue);
            const allSelected = allActionIds.length > 0 && allActionIds.every((id) => assignment?.actionIds?.has(id));

            return (
              <div key={menuId} className={`pfp__menu-card ${included ? "pfp__menu-card--active" : ""}`}>
                <label className="pfp__menu-header">
                  <input type="checkbox" checked={included} onChange={(e) => toggleMenu(menuId, e.target.checked)} />
                  <span>{rowLabel(menu)}</span>
                </label>

                {included && (
                  <div className="pfp__menu-body">
                    {actions.length === 0 ? (
                      <p className="pfp__no-actions">No actions available.</p>
                    ) : (
                      <>
                        <label className="pfp__action pfp__action--select-all">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(e) => toggleAllActions(menuId, allActionIds, e.target.checked)}
                          />
                          <span>Select all</span>
                        </label>
                        <div className="pfp__actions">
                          {actions.map((action) => (
                            <label key={rowValue(action)} className="pfp__action">
                              <input
                                type="checkbox"
                                checked={Boolean(assignment?.actionIds?.has(rowValue(action)))}
                                onChange={() => toggleAction(menuId, rowValue(action))}
                              />
                              <span>{rowLabel(action)}</span>
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="pfp__form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSaving}>
          {isEdit ? "Save Changes" : "Create Profile"}
        </Button>
      </div>
    </form>
  );
}

export function ProfileFormPage() {
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await systemService.deleteProfile({
        profileId: rowValue(deleteTarget),
        instProfileId: deleteTarget.inst_profile_id,
      });
      setDeleteTarget(null);
      bumpRefresh();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <EntityManagerPage
        key={refreshKey}
        title="Profiles"
        eyebrow="Access Control"
        subtitle="Profiles created via the system API, with their menu/action access."
        addLabel="Add Profile"
        columns={[
          { key: "id", label: "ID", render: (row) => rowValue(row) ?? "—" },
          { key: "name", label: "Name", render: (row) => rowLabel(row) },
          {
            key: "inst_profile_name",
            label: "Institution",
            render: (row) => row.inst_profile_name ?? row.institution_name ?? "—",
          },
          { key: "auth_status", label: "Status", narrow: true, render: renderStatusCell },
        ]}
        loadRows={() => systemService.listProfiles()}
        renderForm={({ onSuccess, onCancel }) => <ProfileForm onSuccess={onSuccess} onCancel={onCancel} />}
        actions={(row) => (
          <>
            <button className="dt__icon-btn" onClick={() => setEditTarget(row)} aria-label="Edit">
              ✎
            </button>
            <button className="dt__icon-btn dt__icon-btn--danger" onClick={() => setDeleteTarget(row)} aria-label="Delete">
              🗑
            </button>
          </>
        )}
      />

      {editTarget && (
        <Modal title="Edit Profile" onClose={() => setEditTarget(null)} width={720}>
          <ProfileForm
            row={editTarget}
            onSuccess={() => {
              setEditTarget(null);
              bumpRefresh();
            }}
            onCancel={() => setEditTarget(null)}
          />
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete Profile"
          onClose={() => setDeleteTarget(null)}
          width={400}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
                Delete
              </Button>
            </>
          }
        >
          {deleteError && <div className="mdp__error">{deleteError}</div>}
          <p>
            Are you sure you want to delete <strong>{rowLabel(deleteTarget)}</strong>?
          </p>
        </Modal>
      )}
    </>
  );
}
