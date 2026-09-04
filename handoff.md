**What `/system` contains**
- `POST /system/user/login` and `POST /system/user/refresh_token` are the machine-to-machine auth entrypoints.
- The rest are SYSTEM-only mutation endpoints that mirror existing master/user/institution handlers, but are gated by system session auth.

**Shared response shape**
All these endpoints use the same envelope from `ComposeResponseV1`:
- `message`
- `status` = `SUCCESS` or `FAIL`
- `code`
- `remark`
- `data` when present
- `api`


**Auth rules**
- `POST /system/user/login`
  - Requires `Authorization: Basic ...`
  - The Basic credentials are hardcoded to `system` plus passowrd is 123456  string in code.
  - Also expects JSON body with `user_name` and `password`.

- `POST /system/user/refresh_token`
  - Requires `Authorization: Bearer <refresh_token>`
  - Also validates device info headers if present.

- SYSTEM-only CRUD endpoints under `/system/master/*`, `/system/profile/add`, `/system/user/add`, `/system/institution/*`
  - These require a valid system session via `ValidateSystemSession` or shared session validation in the downstream handler.

## Endpoint-by-endpoint

### 1) `POST /system/user/login`
Request body:
```json
{
  "user_name": "string",
  "password": "string"
}
```

Important headers:
- `Authorization: Basic base64(webadmin:<fixed-password>)`
- `Content-Type: application/json`
- Optional device info header used by login activity/audit flows

Success response `data`:
```json
{
  "user_details": { ...admintabdef.User... },
  "user_session_info": {
    "user_id": 1,
    "last_login": "2026-09-04T10:30:00Z",
    "jwt_token": "access-token",
    "refresh_token": "refresh-token",
    "status": 1
  },
  "full_access": true
}
```

Behavior notes:
- Only users with `is_system = true` can log in here.
- Password comparison is plain equality against the stored `password_hash` field in code, so frontend should treat this as a login endpoint, not a password-hash flow.
- Failure examples:
  - `missing username`
  - `missing password`
  - `user not found`
  - `invalid credentials`
  - `invalid user password`


`user_details` is the full `admintabdef.User` struct, which includes fields like:
- `id`, `username`, `profile_id`, `inst_profile_id`
- `status`, `process_status`, `auth_status`
- `created_time`, `updated_time`
- `user_fname`, `user_mname`, `user_lname`
- `is_system`

### 2) `POST /system/user/refresh_token`
Headers:
- `Authorization: Bearer <refresh_token>`
- device info header as above if your client already sends one

No request body is defined in this handler path.

Success response:
- Whatever the shared user refresh-token flow returns for a valid session.
- The system handler is just a pass-through wrapper.

---

## SYSTEM-only master data endpoints

These use JSON request bodies and follow a very similar pattern:
- validate system session
- parse JSON
- require `Content-Type: application/json`
- insert/update/delete in transaction
- return the created/updated row as `data`

### 3) `POST /system/master/module/add`
Request:
```json
{
  "name": "Payments",
  "status": 1
}
```

Rules:
- `name` is required
- `status` defaults to active if omitted/zero

Success `data`:
```json
{
  "id": 123,
  "name": "Payments",
  "status": 1
}
```

### 4) `POST /system/master/module/edit`
Request:
```json
{
  "id": 123,
  "name": "Payments Updated",
  "status": 1
}
```

Rules:
- `id` is required
- fields are partial-friendly:
  - empty `name` means “leave unchanged”
  - zero `status` means “leave unchanged”

Success `data`:
```json
{
  "id": 123,
  "name": "Payments Updated",
  "status": 1
}
```

### 5) `POST /system/master/module/delete`
Request:
```json
{
  "id": 123
}
```

Behavior:
- soft delete via status change, not hard delete
- returns the deleted row snapshot with updated status

### 6) `POST /system/master/menu/add`
Request:
```json
{
  "parent_menu_id": 0,
  "module_id": 123,
  "menu_name": "Dashboard",
  "priority": 1,
  "status": 1
}
```

Rules:
- `menu_name` and `module_id` are required
- `status` defaults to active if omitted/zero

Success `data`:
```json
{
  "id": 456,
  "parent_menu_id": 0,
  "module_id": 123,
  "menu_name": "Dashboard",
  "priority": 1,
  "status": 1
}
```

### 7) `POST /system/master/menu/edit`
Request:
```json
{
  "id": 456,
  "parent_menu_id": 0,
  "module_id": 123,
  "menu_name": "Dashboard Updated",
  "priority": 2,
  "status": 1
}
```

### 8) `POST /system/master/menu/delete`
Request:
```json
{
  "id": 456
}
```

Menu row shape returned by list/add/edit/delete:
```json
{
  "id": 456,
  "parent_menu_id": 0,
  "module_id": 123,
  "menu_name": "Dashboard",
  "priority": 1,
  "status": 1
}
```

### 9) `POST /system/master/menu_action/add`
Request:
```json
{
  "menu_id": 456,
  "action_id": 12,
  "priority": 1,
  "status": 1
}
```

Rules:
- `menu_id` and `action_id` are required
- `status` defaults to active if omitted/zero

Success `data`:
```json
{
  "id": 789,
  "menu_id": 456,
  "action_id": 12,
  "priority": 1,
  "status": 1
}
```

### 10) `POST /system/master/menu_action/edit`
Request:
```json
{
  "id": 789,
  "menu_id": 456,
  "action_id": 12,
  "priority": 2,
  "status": 1
}
```

### 11) `POST /system/master/menu_action/delete`
Request:
```json
{
  "id": 789
}
```

Menu action row shape returned by list/add/edit/delete:
```json
{
  "id": 789,
  "menu_id": 456,
  "action_id": 12,
  "priority": 1,
  "status": 1
}
```

---

## SYSTEM pass-through creation endpoints

These are just SYSTEM-gated entry points into existing handlers, so the payloads are whatever those downstream handlers expect.

### 12) `POST /system/profile/add`
- Calls the normal user profile add handler.
- Use the existing profile add request shape from the `user` request models.

### 13) `POST /system/user/add`
- Calls the normal user creation handler.
- Use the existing user add request shape.

### 14) `POST /system/institution/add`
- Calls the institution profile add handler.
- Use the institution creation payload used by the institution handler.

### 15) `POST /system/institution/module/add`
- Calls the institution module add handler.
- Use the institution module request shape used by that handler.

---

## Frontend implementation notes
- All write endpoints expect `Content-Type: application/json`.
- All responses are JSON envelopes with `message`, `status`, `code`, `remark`, `api`, and optionally `data`.
- For create/edit/delete flows, success usually comes back with the full row object so the UI can optimistically refresh tables without a refetch.
- For system login, persist both `jwt_token` and `refresh_token`.
- The system login response is broader than a normal login: `full_access: true` and no menu tree.

If you want, I can turn this into a cleaner frontend-ready API spec table next, with columns for `method`, `path`, `auth`, `request`, `success data`, and `common errors`.