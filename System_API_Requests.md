# System API Requests

All `/system/*` routes except login/refresh require:
```
Authorization: Bearer <jwt_token>   (must be a SYSTEM-type session)
Content-Type: application/json
```

Login uses HTTP Basic auth instead of a bearer token (see below).

---

## 1. Login — `POST /system/user/login`

Authenticates the SYSTEM account. Requires an additional `Authorization: Basic <base64(username:password)>` header (fixed service credentials, separate from the JSON body below).

```json
{
  "user_name": "System",
  "password": "123456"
}
```

Required: `user_name`, `password`.

---

## 2. Refresh Token — `POST /system/user/refresh_token`

No JSON body. Pass the refresh token as `Authorization: Bearer <refresh_token>`. Optionally include a `Deviceinfo` header (JSON-encoded device info).

```json
{}
```

---

## 3. Master Module

### Add — `POST /system/master/module/add`

```json
{
  "name": "Loans",
  "status": 1
}
```

Required: `name`. Optional: `status` (defaults to Undefined if omitted).

### Edit — `POST /system/master/module/edit`

```json
{
  "id": 5,
  "name": "Loans Renamed",
  "status": 1
}
```

Required: `id`. `name`/`status` optional — omitted fields keep their stored value.

### Delete — `POST /system/master/module/delete`

```json
{
  "id": 5
}
```

Required: `id`.

---

## 4. Master Menu

### Add — `POST /system/master/menu/add`

```json
{
  "parent_menu_id": 0,
  "module_id": 5,
  "menu_name": "Loan Products",
  "priority": 1,
  "status": 1
}
```

Required: `menu_name`, `module_id`. `parent_menu_id` = 0 means a top-level menu. `priority`/`status` optional.

### Edit — `POST /system/master/menu/edit`

```json
{
  "id": 12,
  "parent_menu_id": 0,
  "module_id": 5,
  "menu_name": "Loan Products Renamed",
  "priority": 2,
  "status": 1
}
```

Required: `id`. Everything else optional — omitted fields keep their stored value.

### Delete — `POST /system/master/menu/delete`

```json
{
  "id": 12
}
```

Required: `id`.

---

## 5. Master Menu Action

### Add — `POST /system/master/menu_action/add`

```json
{
  "menu_id": 12,
  "action_id": 3,
  "priority": 1,
  "status": 1
}
```

Required: `menu_id`, `action_id`. `priority`/`status` optional.

### Edit — `POST /system/master/menu_action/edit`

```json
{
  "id": 8,
  "menu_id": 12,
  "action_id": 3,
  "priority": 2,
  "status": 1
}
```

Required: `id`. Everything else optional — omitted fields keep their stored value.

### Delete — `POST /system/master/menu_action/delete`

```json
{
  "id": 8
}
```

Required: `id`.

---

## 6. System Institution

Same payloads as the corresponding `/institution/profile/*` endpoints (see `Institution_Profile_API_Requests.md`), but called by the SYSTEM user, which always self-authorizes immediately — no draft, no checker, regardless of `is_draft`.

### Add — `POST /system/institution/profile/add`

```json
{
  "code": "TESTBANK1",
  "name": "Test Bank One",
  "type": 2,
  "narration": "system-created institution"
}
```

Required: `code`, `name`, `type`.

### Edit — `POST /system/institution/profile/edit`

```json
{
  "id": 8,
  "code": "TESTBANK1",
  "name": "Test Bank One Renamed",
  "type": 2,
  "narration": "system edit"
}
```

Required: `id`. Applied immediately, no checker.

### Delete — `POST /system/institution/profile/delete`

```json
{
  "id": 8,
  "narration": "system delete"
}
```

Required: `id`. Soft-deleted immediately, no checker.

---

## 7. System Institution Module

Assigns/manages modules for an institution.

### Add — `POST /system/institution/module/add`

```json
{
  "inst_profile_id": 6,
  "modules": [
    {
      "module_id": 5,
      "effective_from": "2026-01-01",
      "effective_to": "",
      "configuration_status": "ACTIVE"
    }
  ],
  "narration": "enabling loans module"
}
```

Required: `inst_profile_id`, `modules` (non-empty array), and `modules[i].module_id` for each entry.

### Edit — `POST /system/institution/module/edit`

```json
{
  "id": 3,
  "name": "Loans Renamed",
  "status": 1
}
```

Required: `id`. `name`/`status` optional — omitted fields keep their stored value.

> **Confirmed live (2026-09-08): the example above does not match the real payload.** The endpoint actually edits the module-assignment fields (`module_id`, `effective_from`, `effective_to`, `configuration_status`), not a name/status pair — that shape belongs to master module's edit, not this one. More importantly, **omitting `module_id` from the request silently zeroes it out on the stored record** instead of leaving it unchanged, unlike every other edit endpoint in this doc. Always send the row's current `module_id` on every edit call, not just the fields that changed.

### Delete — `POST /system/institution/module/delete`

```json
{
  "id": 3
}
```

Required: `id`.

---

## 8. System User Profile (role/permission profile)

This is `urmg.profile` — a role/permission set — distinct from `institution/profile`.

### Add — `POST /system/user/profile/add`

```json
{
  "profile_info": {
    "profile_id": 0,
    "profile_name": "Branch Teller",
    "inst_profile_id": 6
  },
  "menu_info": [
    {
      "menu_id": 12,
      "actions": [1, 2, 3],
      "is_configuration_only": 0
    }
  ]
}
```

Required: `profile_info.profile_name`, `menu_info` (non-empty array). `profile_info.inst_profile_id` optional — defaults to the caller's own institution if omitted/0. `is_configuration_only` is accepted but confirmed live to make no observable difference either way — safe to omit.

### Edit — `POST /system/user/profile/edit`

```json
{
  "profile_info": {
    "profile_id": 9,
    "profile_name": "Branch Teller Renamed",
    "inst_profile_id": 6
  },
  "menu_info": [
    {
      "menu_id": 12,
      "actions": [1, 2, 3, 4],
      "is_configuration_only": 0
    }
  ]
}
```

Required: `profile_info.profile_id`, `menu_info` (non-empty array).

> **Note:** `/user/profile/list` (the list source) doesn't return `menu_actions`, so building this payload for an existing profile requires first fetching its current assignments — confirmed live via `POST /user/profile/get` `{ profile_id }` (no `/system` prefix), which does include `menu_actions`.

### Delete — `POST /system/user/profile/delete`

```json
{
  "profile_id": 9,
  "inst_profile_id": 6,
  "del_narration": "no longer needed"
}
```

Required: `profile_id`, `inst_profile_id`. Confirmed live that `profile_id` alone is actually sufficient.

---

## 9. System User

Creates/manages a `urmg.user` record.

### Add — `POST /system/user/add`

```json
{
  "username": "teller1",
  "password_hash": "123456",
  "profile_id": 9,
  "inst_profile_id": 6,
  "pwd_policy": 1,
  "narration": "new branch teller"
}
```

Required: `username`, `password_hash`, `profile_id`, `inst_profile_id`, `pwd_policy`. `narration` optional.

### Edit — `POST /system/user/edit`

```json
{
  "user_id": 12,
  "username": "teller1",
  "password_hash": "",
  "profile_id": 9,
  "pwd_policy": 1,
  "narration": "updated role"
}
```

Required: `user_id`. Everything else optional — omitted fields keep their stored value. An empty/omitted `password_hash` leaves the current password unchanged.

### Delete — `POST /system/user/delete`

```json
{
  "user_id": 12,
  "narration": "offboarded"
}
```

Required: `user_id`.
