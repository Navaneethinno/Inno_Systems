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
      config/             # field definitions for the pass-through add forms
      services/           # systemService — profile/user/institution/institution-module add
      components/         # SystemFormPage
```

## Backend contract

Implements the `/system/*` flow from `handoff.md`:

- `POST /system/user/login` — `Authorization: Basic base64(user:password)` (app credentials, see env above) + JSON body `{ user_name, password }`. Returns `user_details`, `user_session_info` (`jwt_token`, `refresh_token`), and `full_access`.
- `POST /system/user/refresh_token` — `Authorization: Bearer <refresh_token>`, no body. Called automatically by the API client on a 401.
- All responses use the shared envelope `{ message, status, code, remark, data, api }`. Status casing varies live ("Fail"/"Success" have been observed, not just "FAIL"/"SUCCESS"), so it's compared case-insensitively. A response with a failing status is treated as an error even on HTTP 200 — and business failures have also been observed on 404/500.
- `/master/{module,menu,menu_action}/{add,edit,delete}` — fully documented in the handoff (note: no `/system` prefix, unlike the user/profile/institution endpoints); wired up with real add/edit/delete UI at `/master/:entityKey`.
- `/master/{17 other types}/list` — only the list endpoint is documented for these (see `masterEntities.js` for the full set); they get read-only tables at `/reference/:entityKey`. **The list endpoint's HTTP method and response shape aren't documented** — `masterDataService.js` assumes POST and tries a few common envelope shapes; verify against a real response and adjust `extractList` if needed.
- `/system/profile/add`, `/system/user/add`, `/system/institution/add`, `/system/institution/module/add` — documented only as "use the existing request shape" with no fields given. The forms at `/system/:formKey` use best-effort fields inferred from the `admintabdef.User` struct seen in the login response — **not confirmed against the backend**. `systemService.js` and `systemForms.js` both carry a warning comment; verify field names before relying on these in production.

There's no `/me` endpoint, so the logged-in user is cached at login time (`localStorage` if "Remember me" is checked, `sessionStorage` otherwise) and rehydrated on page load as long as a token is present.

The post-login navigation/sidebar is static (hardcoded in the UI) — there is no menu-tree API to fetch it from.
