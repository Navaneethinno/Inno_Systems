# Innovitegra Solutions — Web App

React + JavaScript (JSX) + Vite frontend, with a layered architecture (API client → services → hooks/context → UI).

## Prerequisites

- Node.js 18+ and npm

## Setup

```bash
npm install
```

Create a `.env` file in the project root if your API is not on the default URL:

```bash
VITE_API_BASE_URL=http://localhost:4000/api/v1
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
  api/            # shared axios instance, interceptors, error normalization
  config/         # env config
  lib/            # low-level helpers (token storage, etc.)
  store/          # global state (AuthContext)
  components/ui/  # reusable UI primitives (Button, TextField, ...)
  features/
    auth/
      components/ # LoginPage, etc.
      hooks/      # useAuth
      schema/     # zod validation schemas
      services/   # authService — all auth API calls live here
```

Backend endpoints expected by `authService.js`: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
