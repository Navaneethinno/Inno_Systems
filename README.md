# Innovitegra Solutions — Web App

React + JavaScript (JSX) + Vite frontend, with a layered architecture (API client → services → hooks/context → UI).

## Prerequisites

- Node.js 18+ and npm

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the three variables — the app throws
a clear startup error naming whichever one is missing rather than silently
falling back to a hardcoded URL or credential baked into the bundle:

```bash
cp .env.example .env
```

```bash
VITE_API_BASE_URL=https://etakuapi.innovitegrasuite.com

# POST /system/user/login requires a fixed Basic-auth header on top of the
# user's own username/password. These identify the client app, not the
# person logging in. The backend team gives out the values for each
# environment; keep them in .env only, never in the README or a commit.
VITE_SYSTEM_BASIC_USER=
VITE_SYSTEM_BASIC_PASSWORD=
```

`.env` (and `.env.local`) are gitignored — never commit real credentials.
For a Vercel deployment, set the same three variables under the project's
Environment Variables settings so the build has them at deploy time.

## Start the app

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173).

## Other commands

```bash
npm run build     # build for production (output in dist/)
npm run preview   # preview the production build locally
npm run lint       # run oxlint
```

## Project structure

```
src/
  api/                    # shared axios instance, interceptors, error normalization
  config/                 # env config
  lib/                    # low-level helpers (token storage, etc.)
  store/                  # global state (AuthContext)
  routes/                 # ProtectedRoute / PublicOnlyRoute guards
  components/
    ui/                   # reusable primitives (Button, TextField, Select, Modal, DataTable)
    layout/                # AppShell — static sidebar + header for authenticated pages
  pages/
    dashboard/            # authenticated landing page
  features/
    auth/
      components/         # LoginPage
      hooks/              # useAuth
      schema/             # zod validation schema
      services/           # authService — all auth API calls live here
    masterData/
      config/             # per-entity field/column definitions
      services/           # generic list/add/edit/delete for /master/*
      components/         # MasterCrudPage (writable), MasterListPage (read-only)
    system/
      config/             # field definitions for the add forms (user, institutionModule)
      services/           # systemService — profile/user/institution/institution-module add + dropdown sources
      components/
        EntityManagerPage.jsx        # shared list-table + "+ Add" modal shell
        SystemFormPage.jsx           # user list + add/edit modal
        ProfileFormPage.jsx          # profile list + nested menu/action assignment modal
        InstitutionFormPage.jsx      # institution list + nested schema modal
        InstitutionModuleFormPage.jsx # institution-module list (all or one institution) + add modal
```

## Backend contract

The backend team's handoffs are the source of truth for paths and payloads; when this section and a handoff disagree, the handoff wins. The API isn't versioned while the platform is in development. `SYSTEM_API_GUIDE.md` and the other API docs in this repo are older captures, kept for payload shapes.

Login details are never kept in this repo. Ask the backend team for the System login and the gateway (Basic auth) values for each environment.

### Calling the API

- Every call is `POST` with a JSON body. `resolveApiPath()` (`src/api/endpoints.js`) adds the `/config` prefix to every path except `/master/*` and `/aml/*`.
- **Envelope:** `{ message, status, code, remark, data, api }`, plus `pagination` on lists. `status` casing varies ("Fail", "Success"), so it's compared case-insensitively, and a failing status is an error even on HTTP 200.
- **Auth:** `/system/user/login` takes the gateway Basic-auth header plus `{ user_name, password }`. Every other call sends `Authorization: Bearer <jwt>`; on a 401 the client refreshes through `/system/user/refresh_token` once and retries. With no session the client sends nothing and returns to sign-in.
- **Prefixes, by design:** reads use `/master/...` and `/config/...`. Writes only the System user may make go under `/config/system/...`, and that prefix is what restricts them.

### Lists

- Every list pages, filters and searches on the server. Send `page`, `limit`, and optionally `search` and `filter` (`all`, `active`, `pending`, `inactive`, `draft`); the reply's `pagination` has `totalRecords`, `totalPages`, `currentPage` and `limit`. The All / Active / Pending tabs show each filter's `totalRecords`.
- `view: "dropdown"` returns everything, for drop-downs only. Don't use it for tables.
- **Status:** `status` / `status_name` say whether a record is live (1 Active, 9 Draft, …). `auth_status` / `process_status` describe only its latest change. The Status column shows `status_name`, with the latest change noted underneath when it isn't authorized.

### Endpoints the console uses

| What | Path |
|---|---|
| Reference and master data lists | `/master/{type}` (e.g. `/master/country`) |
| Master data writes | `/config/system/master/{module,menu,menu_action}/{add,edit,delete}` |
| Institutions | `/config/institution/profile/list`; writes `/config/system/institution/profile/{add,edit,delete}` |
| Institution modules | `/config/institution/module/list` (`{}` lists every institution; `inst_profile_id` filters); writes `/config/system/institution/module/{add,edit,delete}` |
| Profiles | `/config/user/profile/list` or `/config/user/profile/get_active`; writes `/config/system/user/profile/{add,edit,delete}` |
| Users | `/config/user/list`; writes `/config/system/user/{add,edit,delete}` |

Retired, return 404: `/master/{type}/list`, `/system/institution/{add,edit,delete}`, `/user/profile/getall`, and the `kyc_data_field` / `kyc_document_type` reference lists (KYC is set per institution in the admin portal).

### Payload notes

- **Users:** rows carry `user_id`; edit and delete take `{ user_id, ... }`. Add needs `username`, `password_hash`, `profile_id`, `inst_profile_id` and `pwd_policy`. A blank `password_hash` on edit keeps the current password.
- **Profiles:** add and edit send `profile_info` + `menu_info[]`. List rows already carry `menu_actions`, so editing prefills from the row. An edit with an empty `menu_info` is refused (400), not applied.
- **Institution modules:** add is a batch, `{ inst_profile_id, modules: [...] }`, all or nothing. Edit keeps the stored `module_id` when it's left out.
- **Institutions:** `language` and `allowed_login_identifiers` are flat arrays; identifier and PIN-type values are uppercase.
- **Deletes** are soft: the record's status changes, the row stays.

The sidebar is fixed in the UI on purpose: the System user may use every System Console screen, and profiles and menu permissions apply to institution users in the admin portal.
