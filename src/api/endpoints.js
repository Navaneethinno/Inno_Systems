/**
 * Every backend path the console calls, in one place. Paths are written
 * bare (/system/user/login, /user/list, …); resolveApiPath() adds the
 * /config prefix the backend puts in front of everything except /master/*
 * and /aml/*, so callers never spell it out.
 *
 * Paths per SYSTEM_API_GUIDE.md / System_API_Requests.md and the handoff
 * docs; where a path differs from those docs, the owning service explains
 * what was confirmed live.
 */
export const API = {
  AUTH: {
    // Fetched directly (no prefix, no auth) — see credentialSeal.js.
    PUBLIC_KEY: "/auth/public_key",
    LOGIN: "/system/user/login",
    REFRESH_TOKEN: "/system/user/refresh_token",
    LOGOUT: "/system/user/logout",
  },

  MASTER: {
    list: (type) => `/master/${type}`,
    add: (type) => `/system/master/${type}/add`,
    edit: (type) => `/system/master/${type}/edit`,
    remove: (type) => `/system/master/${type}/delete`,
  },

  USER: {
    LIST: "/user/list",
    ADD: "/system/user/add",
    EDIT: "/system/user/edit",
    DELETE: "/system/user/delete",
    PASSWORD_POLICY_LIST: "/user/password_policy/list",
  },

  PROFILE: {
    LIST: "/user/profile/list",
    GET: "/user/profile/get",
    ADD: "/system/user/profile/add",
    EDIT: "/system/user/profile/edit",
    DELETE: "/system/user/profile/delete",
  },

  INSTITUTION: {
    GET_ACTIVE: "/institution/profile/get_active",
    LIST: "/institution/profile/list",
    SUBMIT: "/institution/profile/submit",
    ADD: "/system/institution/profile/add",
    EDIT: "/system/institution/profile/edit",
    DELETE: "/system/institution/profile/delete",
  },

  INSTITUTION_MODULE: {
    LIST: "/institution/module/list",
    ADD: "/system/institution/module/add",
    EDIT: "/system/institution/module/edit",
    DELETE: "/system/institution/module/delete",
  },

  EXPIRY: {
    RULE_GET: "/global/expiry_rule/get",
    RULE_EDIT: "/global/expiry_rule/edit",
    DOCUMENTS_LIST: "/report/expiring_document/list",
  },

  SYSTEM: {
    KEYS: {
      STATUS: "/system/keys/status",
      COMPONENT: "/system/keys/component",
      ROTATE: "/system/keys/rotate",
      LOCK: "/system/keys/lock",
      DESTROY_STORAGE_KEY: "/system/keys/destroy_storage_key",
      CUSTODIAN_LIST: "/system/keys/custodian/list",
      CUSTODIAN_ADD: "/system/keys/custodian/add",
      CUSTODIAN_REMOVE: "/system/keys/custodian/remove",
      POLICY_LIST: "/system/keys/policy/list",
      POLICY_UPDATE: "/system/keys/policy/update",
    },
    MONITOR: {
      view: (view) => `/system/monitor/${view}`,
    },
    ACCESS: {
      call: (verb) => `/system/institution/access/${verb}`,
    },
    SECURITY: {
      EVENTS: "/system/security/events",
    },
  },

  AML: {
    WATCHLIST_LIST: "/aml/system/watchlist/list",
    WATCHLIST_SET_ENABLED: "/aml/system/watchlist/set_enabled",
    WATCHLIST_REFRESH: "/aml/system/watchlist/refresh",
    WATCHLIST_VERSIONS: "/aml/system/watchlist/versions",
    JOB_LIST: "/aml/system/job/list",
    JOB_SET: "/aml/system/job/set",
    SCREEN_TEST: "/aml/system/screen/test",
    RESCREEN_RUNS: "/aml/system/rescreen/runs",
  },

  // Live-update channels (useLiveList): the REST resource path without its
  // leading slash; wsUrl.js appends "/live".
  LIVE: {
    master: (type) => `master/${type}`,
    USER: "user",
    PROFILE: "user/profile",
    INSTITUTION: "institution/profile",
    INSTITUTION_MODULE: "institution/module",
  },
};

const CONFIG_PREFIX = "/config";
const UNPREFIXED = ["/master", "/aml", CONFIG_PREFIX];

// Guarded so an already-routed path (a retried request) isn't prefixed twice.
export function resolveApiPath(path = "") {
  return UNPREFIXED.some((prefix) => path.startsWith(prefix)) ? path : `${CONFIG_PREFIX}${path}`;
}
