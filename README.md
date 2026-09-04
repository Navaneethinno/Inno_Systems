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
      config/             # field definitions for the add forms (user, institution, institutionModule)
      services/           # systemService — profile/user/institution/institution-module add + dropdown sources
      components/         # SystemFormPage (flat forms), ProfileFormPage (nested menu/action assignment)
```

## Backend contract

Implements the flow from `handoff.md`, verified endpoint-by-endpoint against the live API with curl (a wrong prefix returns a generic "Config processor is alive" fallback instead of the real handler's response, which is how the prefix mismatches below were caught):

- `POST /system/user/login` — `Authorization: Basic base64(user:password)` (app credentials, see env above) + JSON body `{ user_name, password }`. Returns `user_details`, `user_session_info` (`jwt_token`, `refresh_token`), and `full_access`.
- `POST /system/user/refresh_token` — `Authorization: Bearer <refresh_token>`, no body. Called automatically by the API client on a 401.
- All responses use the shared envelope `{ message, status, code, remark, data, api }`. Status casing varies live ("Fail"/"Success" have been observed, not just "FAIL"/"SUCCESS"), so it's compared case-insensitively. A response with a failing status is treated as an error even on HTTP 200 — and business failures have also been observed on 404/500.
- `POST /system/master/{module,menu,menu_action}/{add,edit,delete}` — full add/edit/delete UI at `/master/:entityKey`. Dependent fields (menu's module, menu_action's menu/action) are `<select>`s resolved by name via the matching master list, never raw ID inputs.
- `POST /master/{type}/list` — **the one exception without `/system`**, unlike every other endpoint in this app including add/edit/delete for the same entities. Used both for the 3 writable types above and the 17 read-only reference types (tables at `/reference/:entityKey`). The list response shape still isn't documented — `masterDataService.js`'s `extractList` tries a few common shapes; adjust if a real response doesn't match.
- `POST /system/profile/add` — nested payload (`profile_info` + `menu_info[]`). Handled by the dedicated `/system/profile` page: pick an institution (via `/system/institution/profile/get_active`), then check menus and their actions (sourced from the `menu`/`action`/`menu_action` master lists) to build `menu_info`.
- `POST /system/user/add` — institution and profile are `<select>`s sourced from `/system/institution/profile/get_active` and `/system/profile/getall` (both `{"view":"dropdown"}`), not raw ID inputs.
- `POST /system/institution/add` — full form matching the documented schema (login/PIN/KYC settings included).
- `POST /system/institution/module/add` — institution and module are name-resolved selects (institution via the same dropdown endpoint, module via the master list).

There's no `/me` endpoint, so the logged-in user is cached at login time (`localStorage` if "Remember me" is checked, `sessionStorage` otherwise) and rehydrated on page load as long as a token is present.

The post-login navigation/sidebar is static (hardcoded in the UI) — there is no menu-tree API to fetch it from.
