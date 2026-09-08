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
VITE_API_BASE_URL=https://innoverse-api.innovitegra.in

# POST /system/user/login requires a fixed Basic-auth header on top of the
# user's own username/password. These identify the client app, not the
# person logging in — ask whoever owns the target environment for the real
# values (they may differ between dev/staging/prod).
VITE_SYSTEM_BASIC_USER=system
VITE_SYSTEM_BASIC_PASSWORD=123456
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
        SystemFormPage.jsx           # bare form for entities with no list source (User)
        ProfileFormPage.jsx          # profile list + nested menu/action assignment modal
        InstitutionFormPage.jsx      # institution list + nested schema modal
        InstitutionModuleFormPage.jsx # institution-module list + add modal
```

## Backend contract

Implements the flow from `SYSTEM_API_GUIDE.md` — a live capture of real request/response pairs, which supersedes the earlier `SYSTEM_API_REQUEST_RESPONSE.md`/`handoff.md` docs wherever they disagree (see "Known discrepancies" below).

- **Envelope**: every response is `{ message, status, code, remark, data, api }` with `pagination` present on list endpoints only. `data` is a one-element array for single-record endpoints (unwrapped via `extractOne()`) and a list for multi-record ones (`extractList()`). `extractOne()` stays defensive of a bare-object `data` too — the backend was observed briefly returning that shape mid-deploy (see "Live redeploy" note below) — so nothing breaks if that recurs. Status casing varies live ("Fail"/"Success", not "FAIL"/"SUCCESS"), so it's compared case-insensitively. A failing status is treated as an error even on HTTP 200.
- `POST /system/user/login` — `Authorization: Basic base64(user:password)` (app credentials, see env above) + JSON body `{ user_name, password }`. `data[0]` holds `user_details`, `user_session_info` (`jwt_token`, `refresh_token`), `full_access`. The institution field is `user_details.inst_profile_name`.
- `POST /system/user/refresh_token` — `Authorization: Bearer <refresh_token>`, no body. `data[0]` is the session object directly (`jwt_token`/`refresh_token` at the top level), not nested under `user_session_info` like login. Called automatically by the API client on a 401.
- `POST /system/master/{module,menu,menu_action}/{add,edit,delete}` — full add/edit/delete UI at `/master/:entityKey` (menu_action instead gets the dedicated Module → Menu → Actions page at the same route). Dependent fields (menu's module/parent menu, menu_action's menu/action) are `<select>`s resolved by name, never raw ID inputs. Delete is a **soft delete** — status becomes `7`, the row isn't removed.
- `POST /master/{type}` — **the one exception without `/system`**, and as of the 2026-09-07 backend redeploy, **without a `/list` suffix either** (`/master/{type}/list` now 404s across the board; `/master/{type}` is the confirmed-live replacement, list of paths shared directly by the backend team). Used both for the 3 writable types above and the read-only reference types (tables at `/reference/:entityKey`).
- `POST /system/user/add` — exactly 5 required fields: `username`, `password_hash`, `profile_id`, `inst_profile_id`, `pwd_policy`. Institution/profile/policy are all name-resolved `<select>`s, not raw ID inputs.
- `POST /system/institution/add` — `language` and `allowed_login_identifiers` are flat arrays (`["en"]`, `["MOBILE","EMAIL"]`), identifier/pin-type values are uppercase (`MOBILE`, `NUMERIC`) — no more `{default, supported}` or `{identifiers:[]}` wrapper objects.
- `POST /system/institution/module/add` — **batch endpoint**: one call takes `{ inst_profile_id, modules: [{module_id, effective_from?, effective_to?, configuration_status?}, ...] }` and assigns all of them, all-or-nothing server-side. The form supports adding multiple module rows in one submission; response is one row per assigned module.
- `POST /system/user/profile/{add,edit}` — nested `profile_info` + `menu_info[]` payload, matches the guide exactly.

### Live redeploy note (2026-09-07)

The backend was re-verified twice this day after the team reported changed list endpoints, and was caught mid-rollout the first time — `/system/user/login`'s `data` flip-flopped between a bare object (`institution_name`) and a one-element array (`inst_profile_name`) across consecutive requests seconds apart. Once it settled, a full sweep confirmed the actual, deliberate change: **every `/master/{type}/list` route dropped its `/list` suffix.** The backend team then shared the full list of valid `/master/{type}` paths directly, all confirmed live:

`action`, `status`, `module`, `menu`, `menu_action`, `channel`, `acct_prod_type`, `acct_operation_mode`, `acct_dormancy_action`, `acct_sequence`, `transaction`, `frequency`, `kyc_process`, `kyc_data_field`, `kyc_document_type`, `party_type`, `institution_type`, `ownership`, `residency_type`, `country`, `currency`, `language`

Also confirmed changed in the same redeploy: `/profile/getall` (used for the Profile dropdown/list) now 404s — the live replacement is `/user/profile/list`. And Profile add/edit moved onto `SYSTEM_API_GUIDE.md`'s documented path, `/system/user/profile/{add,edit}` — the old `/system/profile/{add,edit}` (no `/user/` segment) now 404s, so the earlier "known discrepancy" about that path not being live yet no longer applies.

Unaffected by this redeploy, confirmed still live: `/system/master/{type}/{add,edit,delete}`, `/system/institution/add`, `/system/institution/module/add`, `/system/user/add`, `/user/list`, `/user/password_policy/list`, `/institution/profile/get_active`, `/institution/module/get_active`.

**List + add-modal pattern**: Profile, Institution, Institution Module, and User each get a table of what already exists (via `EntityManagerPage.jsx`) with a "+ Add" button that opens the create form in a modal — not a bare form with no way to see what you've created. List sources, all confirmed live:
- Profiles: `POST /user/profile/list` `{"view":"dropdown"}`
- Institutions: `POST /institution/profile/get_active` `{"view":"dropdown"}`
- Users: `POST /user/list` `{"view":"dropdown"}`
- Institution Modules: `POST /institution/module/get_active` — **also requires `inst_profile_id` in the body** (confirmed live: omitting it returns `"Field 'inst_profile_id' is required in request"`), unlike every other dropdown source here. It lists one institution's modules, not all of them — so this page picks an institution first, then loads that institution's modules; there's no "all institution-modules" view.

None of these dropdown sources are documented in `SYSTEM_API_GUIDE.md`, only confirmed by live requests — worth re-verifying periodically given how much has shifted underneath in a single day.

There's no `/me` endpoint, so the logged-in user is cached at login time (`localStorage` if "Remember me" is checked, `sessionStorage` otherwise) and rehydrated on page load as long as a token is present.

The post-login navigation/sidebar is static (hardcoded in the UI) — there is no menu-tree API to fetch it from.

## Table UX (manager feedback pass)

Applied across every `DataTable`-backed page (Master Data, Reference Data, and the System list+modal pages):

- **Sortable columns** — click any header to sort by that column (asc → desc → unsorted), built into `DataTable.jsx` itself.
- **Pagination** — 10 rows per page with Previous/Next controls, built into `DataTable.jsx` in two modes. **Server mode** (Reference Data's `MasterListPage.jsx`, the large tables — Countries at 249 rows, Currencies at 156): sends the API's real `{ page, limit }` request per page turn — confirmed live that `/master/{type}` genuinely returns a different slice per `page`, not a re-sort of the same rows (verified against a sibling internal frontend's own `Institutions.jsx`, which pages the same way: `{ page, limit }` request, `pagination.totalRecords` in the response). `DataTable`'s `page`/`onPageChange`/`pagination` props drive this — see the doc comment on `DataTable.jsx`. **Client mode** (everywhere else — Master Data CRUD, System pages): the page already has the full row set in memory (small tables, or a dropdown/full fetch), and `DataTable` slices it into pages of 10 itself. `masterDataService.list()`/`systemService.js`'s dropdown methods request a high limit (1000) so full-fetch consumers aren't truncated by the backend's own `limit=10` default.
- **"View all"** — a fullscreen modal (`FullscreenTableModal.jsx`, `paginate={false}` on its `DataTable`) with a search box that filters across every raw field on each row, not just what's visibly rendered — shows every row on one page, since paginating "view everything" would defeat the point. `MasterListPage.jsx` lazily fetches the whole table (once, cached) only when "View all" is opened or a search is typed, since the API's own `search` param is confirmed live as a no-op on this deployment — full-dataset search has to happen client-side.
- **Active/Pending filter** — the real API rows carry a maker-checker `auth_status` (`AUTHORIZED`/`PENDING`/`REJECTED`/`DEAUTHORIZED`), but the UI only needs two states: Active (`AUTHORIZED`) and Pending (everything else, sorted latest-first by `updated_time`). `useAuthStatusFilter.js` detects whether a given list's rows actually carry `auth_status` and only shows the filter tabs when they do — Modules/Menus/Menu Actions don't have this field, so they don't get the tabs.
- **Popup redesign** — `Modal.css` got a gradient top accent, a proper close button, a tinted footer, and an entrance animation instead of a flat white box.
- **Password Policy** — Add User's `pwd_policy` is now a name-resolved `<select>` sourced from `/user/password_policy/list` (previously free text), with a "View Password Policy ▾" toggle that expands a read-only panel listing every policy's fields instead of cramming them into the form.

### Flag: login credentials in the reference doc don't work against the deployed API

`SYSTEM_API_REQUEST_RESPONSE.md` was captured against `http://localhost:15003` (a local dev server), not `https://innoverse-api.innovitegra.in` (what this app is configured to use). Testing the documented `System`/`123456` login against the deployed API returns `"User not found"` — that seed user doesn't exist in this environment. The endpoint paths and payload/response *shapes* were still cross-checked against the deployed API where possible (e.g. the `/system/master/*` vs `/master/*/list` prefix split) and match; only the specific test data differs by environment. You'll need real credentials for whichever environment `VITE_API_BASE_URL` points at.
