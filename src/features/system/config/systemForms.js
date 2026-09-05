/**
 * Field lists mirror the real captured request/response pairs in
 * SYSTEM_API_REQUEST_RESPONSE.md. Any field that references another entity
 * (module, institution, profile) is a `select` resolved by name through the
 * matching list API — the UI never asks for a raw ID directly.
 *
 * `successIdField` names the key in the response's `data` that identifies
 * the created row (it isn't consistently `id` across endpoints — user/add
 * returns `user_id`, for example).
 */
export const systemForms = {
  user: {
    label: "User",
    serviceMethod: "addUser",
    successIdField: "user_id",
    // Unlike profile/institution/institutionModule, there's no known
    // list endpoint for users yet, so this stays a bare form instead of
    // the list+add-modal pattern used elsewhere — swap it over once one
    // is confirmed.
    listNote: "There's no list endpoint for users yet, so created users aren't shown here — only the create form.",
    fields: [
      { name: "user_name", label: "Username", type: "text", required: true },
      { name: "user_pwd", label: "Password", type: "password", required: true },
      { name: "user_fname", label: "First name", type: "text", required: true },
      { name: "user_mname", label: "Middle name", type: "text" },
      { name: "user_lname", label: "Last name", type: "text", required: true },
      {
        name: "inst_id",
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
      { name: "employee_id", label: "Employee ID", type: "text" },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "mobile", label: "Mobile", type: "tel", required: true },
      {
        name: "gender",
        label: "Gender",
        type: "select",
        // Casing matches the real captured request ("Male"), not a
        // documented enum — verify if the backend rejects other values.
        staticOptions: [
          { value: "Male", label: "Male" },
          { value: "Female", label: "Female" },
          { value: "Other", label: "Other" },
        ],
      },
      { name: "address", label: "Address", type: "textarea" },
      { name: "alternate_mob", label: "Alternate mobile", type: "tel" },
      { name: "alternate_email", label: "Alternate email", type: "email" },
      { name: "pwd_policy", label: "Password policy", type: "text" },
    ],
  },

  // "institution" and "institutionModule" aren't here — institution's
  // payload nests language/login-identifiers as objects (InstitutionFormPage),
  // and institutionModule now gets its own list+add-modal page
  // (InstitutionModuleFormPage) instead of a bare form, same as profile
  // and institution.
};
