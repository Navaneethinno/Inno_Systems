/**
 * Field lists here are best-effort guesses (see systemService.js) — not
 * confirmed against the backend. Treat as a starting point to verify, not
 * ground truth.
 */
export const systemForms = {
  profile: {
    label: "Profile",
    serviceMethod: "addProfile",
    fields: [
      { name: "profile_name", label: "Profile name", type: "text", required: true },
      { name: "status", label: "Active", type: "status" },
    ],
  },
  user: {
    label: "User",
    serviceMethod: "addUser",
    fields: [
      { name: "username", label: "Username", type: "text", required: true },
      { name: "password", label: "Password", type: "password", required: true },
      { name: "user_fname", label: "First name", type: "text", required: true },
      { name: "user_mname", label: "Middle name", type: "text" },
      { name: "user_lname", label: "Last name", type: "text" },
      { name: "profile_id", label: "Profile ID", type: "number", required: true },
      { name: "inst_profile_id", label: "Institution profile ID", type: "number" },
      { name: "is_system", label: "System user", type: "status" },
      { name: "status", label: "Active", type: "status" },
    ],
  },
  institution: {
    label: "Institution",
    serviceMethod: "addInstitution",
    fields: [
      { name: "inst_name", label: "Institution name", type: "text", required: true },
      { name: "status", label: "Active", type: "status" },
    ],
  },
  institutionModule: {
    label: "Institution Module",
    serviceMethod: "addInstitutionModule",
    fields: [
      { name: "inst_profile_id", label: "Institution profile ID", type: "number", required: true },
      { name: "module_id", label: "Module ID", type: "number", required: true },
      { name: "status", label: "Active", type: "status" },
    ],
  },
};
