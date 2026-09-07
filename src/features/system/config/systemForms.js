import { createElement } from "react";
import { rowValue } from "../../../lib/rowLabel";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { AuthStatusBadge } from "../../../components/ui/AuthStatusBadge";

/**
 * Field lists mirror SYSTEM_API_GUIDE.md, which supersedes the earlier
 * captured docs where they disagree (user/add in particular is a much
 * smaller payload than earlier docs implied). Any field that references
 * another entity (module, institution, profile) is a `select` resolved by
 * name through the matching list API — the UI never asks for a raw ID
 * directly.
 *
 * `successIdField` names the key in the response's `data[0]` that
 * identifies the created row (defaults to "id").
 */
export const systemForms = {
  user: {
    label: "User",
    eyebrow: "Directory",
    serviceMethod: "addUser",
    // Confirmed live via curl: /user/list requires auth ("Please log in
    // again"), i.e. a real route — so this gets the same list+add-modal
    // pattern as profile/institution/institutionModule.
    listMethod: "listUsers",
    columns: [
      { key: "id", label: "ID", render: (row) => rowValue(row) ?? "—" },
      { key: "username", label: "Username" },
      { key: "profile_name", label: "Profile" },
      // The backend has been observed live flipping between
      // inst_profile_name (matches the guide) and institution_name across
      // deploys — read whichever is present.
      { key: "inst_profile_name", label: "Institution", render: (row) => row.inst_profile_name ?? row.institution_name ?? "—" },
      {
        key: "auth_status",
        label: "Status",
        narrow: true,
        render: (row) => {
          if (row.auth_status) return createElement(AuthStatusBadge, { value: row.auth_status });
          if ("status" in row) return createElement(StatusBadge, { active: Boolean(row.status) });
          return "—";
        },
      },
    ],
    // Per the guide: exactly these 5 fields, all required. Earlier docs
    // showed a much bigger payload (fname/lname/email/mobile/gender/
    // address/...) — that shape isn't what /system/user/add actually
    // accepts per this capture.
    fields: [
      { name: "username", label: "Username", type: "text", required: true },
      { name: "password_hash", label: "Password", type: "password", required: true },
      {
        name: "inst_profile_id",
        label: "Institution",
        type: "select",
        required: true,
        source: { kind: "system", method: "listActiveInstitutions" },
      },
      {
        name: "profile_id",
        label: "Profile",
        type: "select",
        required: true,
        source: { kind: "system", method: "listProfiles" },
      },
      {
        name: "pwd_policy",
        label: "Password policy",
        type: "select",
        required: true,
        expandableDetails: true,
        source: { kind: "master", type: "password_policy", path: "/user/password_policy/list" },
      },
    ],
  },

  // "profile", "institution", and "institutionModule" aren't here —
  // profile/institution nest structured payloads (ProfileFormPage /
  // InstitutionFormPage), and institutionModule is a batch endpoint with
  // its own multi-row page (InstitutionModuleFormPage).
};
