/**
 * Field lists mirror the exact sample payloads in handoff.md. Any field
 * that references another entity (module, institution, profile) is a
 * `select` resolved by name through the matching list API — the UI never
 * asks for a raw ID directly.
 */
export const systemForms = {
  user: {
    label: "User",
    serviceMethod: "addUser",
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
        staticOptions: [
          { value: "MALE", label: "Male" },
          { value: "FEMALE", label: "Female" },
          { value: "OTHER", label: "Other" },
        ],
      },
      { name: "address", label: "Address", type: "textarea" },
      { name: "alternate_mob", label: "Alternate mobile", type: "tel" },
      { name: "alternate_email", label: "Alternate email", type: "email" },
      { name: "pwd_policy", label: "Password policy", type: "text" },
    ],
  },

  institution: {
    label: "Institution",
    serviceMethod: "addInstitution",
    fields: [
      { name: "code", label: "Code", type: "text", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "type", label: "Type", type: "number", required: true },
      { name: "timezone", label: "Timezone", type: "text", default: "Asia/Kolkata" },
      { name: "language", label: "Languages (comma-separated)", type: "text-list", default: "en" },
      { name: "date_format", label: "Date format", type: "text", default: "YYYY-MM-DD" },
      { name: "has_branch", label: "Has branches", type: "boolean" },
      { name: "max_branches_allowed", label: "Max branches allowed", type: "number" },
      { name: "kyc_enabled", label: "KYC enabled", type: "boolean" },
      { name: "total_kyc_levels", label: "Total KYC levels", type: "number" },
      { name: "allow_downgrade_kyc", label: "Allow KYC downgrade", type: "boolean" },
      { name: "auto_approve_kyc_level", label: "Auto-approve KYC level", type: "boolean" },
      {
        name: "allowed_login_identifiers",
        label: "Allowed login identifiers (comma-separated)",
        type: "text-list",
        default: "mobile,email",
      },
      {
        name: "primary_login_identifier",
        label: "Primary login identifier",
        type: "select",
        staticOptions: [
          { value: "mobile", label: "Mobile" },
          { value: "email", label: "Email" },
        ],
      },
      { name: "is_login_pin_enabled", label: "Login PIN enabled", type: "boolean" },
      { name: "login_pin_length", label: "Login PIN length", type: "number", default: 4 },
      {
        name: "login_pin_type",
        label: "Login PIN type",
        type: "select",
        staticOptions: [
          { value: "NUMERIC", label: "Numeric" },
          { value: "ALPHANUMERIC", label: "Alphanumeric" },
        ],
      },
      { name: "allow_biometric_login", label: "Allow biometric login", type: "boolean" },
      { name: "is_txn_pin_enabled", label: "Transaction PIN enabled", type: "boolean" },
      { name: "txn_pin_length", label: "Transaction PIN length", type: "number", default: 4 },
      { name: "is_same_login_txn_pin_allowed", label: "Allow same login/txn PIN", type: "boolean" },
    ],
  },

  institutionModule: {
    label: "Institution Module",
    serviceMethod: "addInstitutionModule",
    fields: [
      {
        name: "inst_profile_id",
        label: "Institution",
        type: "select",
        required: true,
        source: { kind: "system", method: "listActiveInstitutions" },
      },
      {
        name: "module_id",
        label: "Module",
        type: "select",
        required: true,
        source: { kind: "master", type: "module" },
      },
      { name: "effective_from", label: "Effective from", type: "date", required: true },
      { name: "effective_to", label: "Effective to", type: "date" },
      {
        name: "configuration_status",
        label: "Configuration status",
        type: "select",
        staticOptions: [
          { value: "ACTIVE", label: "Active" },
          { value: "INACTIVE", label: "Inactive" },
        ],
      },
    ],
  },
};
