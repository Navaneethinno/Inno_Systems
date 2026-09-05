# Innovitegra Solutions — Web App

React + JavaScript (JSX) + Vite frontend, with a layered architecture (API client → services → hooks/context → UI).

## Prerequisites

- Node.js 18+ and npm

## Setup

```bash
npm install
```

The app defaults to the live API (`https://innoverse-api.innovitegra.in`) and the
documented Basic-auth app credentials, so it runs with no `.env` file. To point
at a different backend, create a `.env` file:

```bash
VITE_API_BASE_URL=https://innoverse-api.innovitegra.in

# POST /system/user/login requires a fixed Basic-auth header on top of the
# user's own username/password. These identify the client app, not the
# person logging in.
VITE_SYSTEM_BASIC_USER=system
VITE_SYSTEM_BASIC_PASSWORD=123456
```

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
        SystemFormPage.jsx           # bare form for entities with no list source (User)
        ProfileFormPage.jsx          # profile list + nested menu/action assignment modal
        InstitutionFormPage.jsx      # institution list + nested schema modal
        InstitutionModuleFormPage.jsx # institution-module list + add modal
```

## Backend contract

Implements the flow from `SYSTEM_API_REQUEST_RESPONSE.md` — a live capture of real request/response pairs against the dev server, which supersedes `handoff.md`'s sample payloads wherever the two disagree (see "Known discrepancies" below).

- `POST /system/user/login` — `Authorization: Basic base64(user:password)` (app credentials, see env above) + JSON body `{ user_name, password }`. Returns `user_details`, `user_session_info` (`jwt_token`, `refresh_token`), `full_access`. **`user_details` does not include `user_fname`/`user_mname`/`user_lname`** despite `handoff.md`'s sample — the login-time user is cached with only the fields the real response actually has (`username`, `profile_id`, `profile_name`, `institution_name`, `is_system`, `status`, `auth_status`).
- `POST /system/user/refresh_token` — `Authorization: Bearer <refresh_token>`, no body. Response is the session object directly (`jwt_token`/`refresh_token` at the top level of `data`), not nested under `user_session_info` like login. Called automatically by the API client on a 401.
- All responses use the shared envelope `{ message, status, code, remark, data, api }`. Status casing varies live ("Fail"/"Success", not "FAIL"/"SUCCESS"), so it's compared case-insensitively. A failing status is treated as an error even on HTTP 200 — and business failures have also been observed on 404/500 with the same envelope shape.
- `POST /system/master/{module,menu,menu_action}/{add,edit,delete}` — full add/edit/delete UI at `/master/:entityKey` (menu_action instead gets the dedicated Module → Menu → Actions page at the same route). Dependent fields (menu's module/parent menu, menu_action's menu/action) are `<select>`s resolved by name, never raw ID inputs. Delete is a **soft delete** — the row is kept with a "deleted" status code, not removed.
- `POST /master/{type}/list` — **the one exception without `/system`**, confirmed by curl (the `/system`-prefixed version of `list` returns a generic fallback response, not the real handler). Used both for the 3 writable types above and the 17 read-only reference types (tables at `/reference/:entityKey`).
- `POST /system/profile/add` — nested payload (`profile_info` + `menu_info[]`); **`profile_info.profile_id` is omitted entirely on create**, not sent as `0`. `POST /system/profile/edit` also exists (same shape plus a real `profile_id`) but isn't implemented — there's no endpoint to fetch a profile's current menu/action assignments to prefill an edit form.
- `POST /system/user/add` — institution and profile are `<select>`s sourced from `listActiveInstitutions`/`listProfiles`, not raw ID inputs. Response is `{ user_id }`, not `{ id }` — the success message reads the right field via `successIdField` in `systemForms.js`.
- `POST /system/institution/add` — matches the real nested schema: `language` is `{ default, supported[] }` and `allowed_login_identifiers` is `{ identifiers[] }` — both name-resolved (`type` via `/master/institution_type/list`, language default/supported via `/master/language/list`), not raw codes typed by hand.
- `POST /system/institution/module/add` — institution and module are name-resolved selects.

**List + add-modal pattern**: Profile, Institution, Institution Module, and User each get a table of what already exists (via `EntityManagerPage.jsx`) with a "+ Add" button that opens the create form in a modal — not a bare form with no way to see what you've created. List sources, all confirmed live (a wrong path/prefix falls through to a generic "Config processor is alive" response instead of a real auth-gated one):
- Profiles: `POST /profile/getall` `{"view":"dropdown"}`
- Institutions: `POST /institution/profile/get_active` `{"view":"dropdown"}`
- Users: `POST /user/list` `{"view":"dropdown"}`
- Institution Modules: `POST /institution/module/get_active` — **also requires `inst_profile_id` in the body** (confirmed live: omitting it returns `"Field 'inst_profile_id' is required in request"`), unlike every other dropdown source here. It lists one institution's modules, not all of them — so this page picks an institution first, then loads that institution's modules; there's no "all institution-modules" view.

None of these are documented in the captured reference doc, only confirmed by live requests — worth re-verifying once the backend redeploys.

There's no `/me` endpoint, so the logged-in user is cached at login time (`localStorage` if "Remember me" is checked, `sessionStorage` otherwise) and rehydrated on page load as long as a token is present.

The post-login navigation/sidebar is static (hardcoded in the UI) — there is no menu-tree API to fetch it from.

### Flag: login credentials in the reference doc don't work against the deployed API

`SYSTEM_API_REQUEST_RESPONSE.md` was captured against `http://localhost:15003` (a local dev server), not `https://innoverse-api.innovitegra.in` (what this app is configured to use). Testing the documented `System`/`123456` login against the deployed API returns `"User not found"` — that seed user doesn't exist in this environment. The endpoint paths and payload/response *shapes* were still cross-checked against the deployed API where possible (e.g. the `/system/master/*` vs `/master/*/list` prefix split) and match; only the specific test data differs by environment. You'll need real credentials for whichever environment `VITE_API_BASE_URL` points at.
