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
      components/         # SystemFormPage (flat forms), ProfileFormPage & InstitutionFormPage (nested payloads)
```

## Backend contract

Implements the flow from `SYSTEM_API_REQUEST_RESPONSE.md` — a live capture of real request/response pairs against the dev server, which supersedes `handoff.md`'s sample payloads wherever the two disagree (see "Known discrepancies" below).

- `POST /system/user/login` — `Authorization: Basic base64(user:password)` (app credentials, see env above) + JSON body `{ user_name, password }`. Returns `user_details`, `user_session_info` (`jwt_token`, `refresh_token`), `full_access`. **`user_details` does not include `user_fname`/`user_mname`/`user_lname`** despite `handoff.md`'s sample — the login-time user is cached with only the fields the real response actually has (`username`, `profile_id`, `profile_name`, `institution_name`, `is_system`, `status`, `auth_status`).
- `POST /system/user/refresh_token` — `Authorization: Bearer <refresh_token>`, no body. Response is the session object directly (`jwt_token`/`refresh_token` at the top level of `data`), not nested under `user_session_info` like login. Called automatically by the API client on a 401.
- All responses use the shared envelope `{ message, status, code, remark, data, api }`. Status casing varies live ("Fail"/"Success", not "FAIL"/"SUCCESS"), so it's compared case-insensitively. A failing status is treated as an error even on HTTP 200 — and business failures have also been observed on 404/500 with the same envelope shape.
- `POST /system/master/{module,menu,menu_action}/{add,edit,delete}` — full add/edit/delete UI at `/master/:entityKey` (menu_action instead gets the dedicated Module → Menu → Actions page at the same route). Dependent fields (menu's module/parent menu, menu_action's menu/action) are `<select>`s resolved by name, never raw ID inputs. Delete is a **soft delete** — the row is kept with a "deleted" status code, not removed.
- `POST /master/{type}/list` — **the one exception without `/system`**, confirmed by curl (the `/system`-prefixed version of `list` returns a generic fallback response, not the real handler). Used both for the 3 writable types above and the 17 read-only reference types (tables at `/reference/:entityKey`).
- `POST /system/profile/add` — nested payload (`profile_info` + `menu_info[]`); **`profile_info.profile_id` is omitted entirely on create**, not sent as `0`. Handled by the dedicated `/system/profile` page: pick an institution, then check menus and their actions (sourced from the `menu`/`action`/`menu_action` master lists) to build `menu_info`. `POST /system/profile/edit` also exists (takes the same shape plus a real `profile_id`) but isn't implemented — there's no endpoint to fetch a profile's current menu/action assignments to prefill an edit form.
- `POST /system/user/add` — institution and profile are `<select>`s sourced from `listActiveInstitutions`/`listProfiles`, not raw ID inputs. Response is `{ user_id }`, not `{ id }` — the success message reads the right field via `successIdField` in `systemForms.js`.
- `POST /system/institution/add` — dedicated page (`/system/institution`) matching the real nested schema: `language` is `{ default, supported[] }` and `allowed_login_identifiers` is `{ identifiers[] }`, **not the flat comma-separated strings `handoff.md`'s sample implied**. `type` is a name-resolved `<select>` sourced from `/master/institution_type/list`.
- `POST /system/institution/module/add` — institution and module are name-resolved selects.

Dropdown sources for institution/profile pickers (`listActiveInstitutions`, `listProfiles` in `systemService.js`) aren't in the captured reference doc at all — their paths (no `/system` prefix) are only confirmed by an earlier curl check, not a real request/response capture. Worth re-verifying against a real session.

There's no `/me` endpoint, so the logged-in user is cached at login time (`localStorage` if "Remember me" is checked, `sessionStorage` otherwise) and rehydrated on page load as long as a token is present.

The post-login navigation/sidebar is static (hardcoded in the UI) — there is no menu-tree API to fetch it from.

### Flag: login credentials in the reference doc don't work against the deployed API

`SYSTEM_API_REQUEST_RESPONSE.md` was captured against `http://localhost:15003` (a local dev server), not `https://innoverse-api.innovitegra.in` (what this app is configured to use). Testing the documented `System`/`123456` login against the deployed API returns `"User not found"` — that seed user doesn't exist in this environment. The endpoint paths and payload/response *shapes* were still cross-checked against the deployed API where possible (e.g. the `/system/master/*` vs `/master/*/list` prefix split) and match; only the specific test data differs by environment. You'll need real credentials for whichever environment `VITE_API_BASE_URL` points at.
