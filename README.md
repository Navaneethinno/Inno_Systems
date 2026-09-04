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
  api/              # shared axios instance, interceptors, error normalization
  config/           # env config
  lib/              # low-level helpers (token storage, etc.)
  store/            # global state (AuthContext)
  routes/           # ProtectedRoute / PublicOnlyRoute guards
  components/ui/    # reusable UI primitives (Button, TextField, ...)
  pages/
    dashboard/      # placeholder authenticated landing page
  features/
    auth/
      components/   # LoginPage
      hooks/        # useAuth
      schema/       # zod validation schema
      services/     # authService — all auth API calls live here
```

## Backend contract

Implements the `/system/user/*` auth flow from `handoff.md`:

- `POST /system/user/login` — `Authorization: Basic base64(user:password)` (app credentials, see env above) + JSON body `{ user_name, password }`. Returns `user_details`, `user_session_info` (`jwt_token`, `refresh_token`), and `full_access`.
- `POST /system/user/refresh_token` — `Authorization: Bearer <refresh_token>`, no body. Called automatically by the API client on a 401.
- All responses use the shared envelope `{ message, status: "SUCCESS" | "FAIL", code, remark, data, api }`. A 200 response with `status: "FAIL"` is treated as an error.

There's no `/me` endpoint, so the logged-in user is cached at login time (`localStorage` if "Remember me" is checked, `sessionStorage` otherwise) and rehydrated on page load as long as a token is present.

The post-login navigation/sidebar is static (hardcoded in the UI) — there is no menu-tree API to fetch it from.
