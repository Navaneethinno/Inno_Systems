# System API Guide

Every request and response below was captured from a running server, not written by hand.

There are 16 system endpoints. They all use `POST`, they all send and receive JSON,
and they all return the same envelope.

---

## Before you start

**Only a system account can call these.** Every endpoint except login and refresh
checks the `is_system` flag on the logged-in user and returns `403 Access Denied`
if it is false. A normal user's token will not work here, even a valid one.

**Two different passwords are involved.** Login needs both:

| What | Value | Where it goes |
|---|---|---|
| Gateway credentials | `system` / `123456` | HTTP Basic Auth header |
| Account credentials | `System` / `123456` | Request body |

They are different things that happen to share a password today. The gateway
credentials are the same for every caller; the account credentials identify a
person.

**Everything after login needs the token** from the login response, sent as:

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## The response envelope

Every response has the same seven fields, always in this order:

```json
{
  "api": "/system/master/module/add",
  "code": 1,
  "data": [ { } ],
  "pagination": { },
  "message": "Module Added Successfully",
  "remark": "module added completed",
  "status": "Success"
}
```

| Field | What it means |
|---|---|
| `api` | The endpoint you called |
| `code` | `1` worked, `0` did not |
| `data` | **Always a list**, even for one record. Empty list if there is nothing |
| `pagination` | Only on list endpoints. Absent everywhere else |
| `message` | Short text you can show a user as-is |
| `remark` | Detail for developers and logs. Do not show this to users |
| `status` | `Success` or `Fail` |

**Check the HTTP status, not just `code`.** `200` means it worked, `400` means
your request was wrong, `403` means you are not allowed, `404` means the record
does not exist, `500` means something broke on the server.

---

## 1. Log in

`POST /system/user/login`

Basic Auth `system:123456`, plus:

```json
{
  "user_name": "System",
  "password": "123456"
}
```

Response — trimmed, the two tokens are long:

```json
{
  "api": "/system/user/login",
  "code": 1,
  "data": [
    {
      "user_details": {
        "id": 1,
        "username": "System",
        "profile_id": 1,
        "profile_name": "SYSTEM",
        "inst_profile_id": 1,
        "inst_profile_name": "SYSTEM INTERNAL",
        "pwd_policy": 1,
        "policy_name": "DEFAULT",
        "is_force_pwd": 0,
        "status": 1,
        "process_status": 1,
        "auth_status": "AUTHORIZED",
        "created_by": "System",
        "created_userid": 1,
        "created_time": "2026-09-06T11:51:02.395362+04:30",
        "updated_by": "System",
        "updated_userid": 1,
        "updated_time": "2026-09-06T11:51:02.395362+04:30",
        "deauth_narration": "Undefined",
        "audit_key": "SYSTEM-BOOTSTRAP-USER-1",
        "is_system": true
      },
      "user_session_info": {
        "user_id": 1,
        "last_login": "2026-09-06T22:52:53Z",
        "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
        "status": 1
      },
      "full_access": true
    }
  ],
  "message": "Login Successful",
  "remark": "login successful",
  "status": "Success"
}
```

Keep `jwt_token` for every following call, and `refresh_token` for step 2.

A non-system account calling this gets `403`. That account must use `/user/login`
instead — the two logins are mutually exclusive on purpose.

---

## 2. Refresh the token

`POST /system/user/refresh_token`

Send the **refresh token** in the Authorization header, not the normal one:

```
Authorization: Bearer <refresh_token>
```

Body is empty: `{}`

```json
{
  "api": "/system/user/refresh_token",
  "code": 1,
  "data": [
    {
      "user_id": 1,
      "last_login": "0001-01-01T00:00:00Z",
      "jwt_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
      "status": 1
    }
  ],
  "message": "Session Refreshed Successfully",
  "remark": "refresh token issued",
  "status": "Success"
}
```

Only the newest refresh token works. If you log in again, any older refresh token
stops working and returns `401`.

---

## 3. Modules

A module is a top-level area of the product, such as `INSTITUTION` or
`USER MANAGEMENT`. Menus live inside modules.

### Add

`POST /system/master/module/add`

```json
{ "name": "SAMPLE MODULE", "status": 1 }
```

`name` is required. `status` is optional and defaults to `1` (active).

```json
{
  "api": "/system/master/module/add",
  "code": 1,
  "data": [ { "id": 11, "name": "SAMPLE MODULE", "status": 1 } ],
  "message": "Module Added Successfully",
  "remark": "module added completed",
  "status": "Success"
}
```

### Edit

`POST /system/master/module/edit`

```json
{ "id": 11, "name": "SAMPLE MODULE V2", "status": 1 }
```

Only `id` is required. Leave out any field you do not want to change.

```json
"data": [ { "id": 11, "name": "SAMPLE MODULE V2", "status": 1 } ]
```

### Delete

`POST /system/master/module/delete`

```json
{ "id": 11 }
```

```json
"data": [ { "id": 11, "name": "SAMPLE MODULE V2", "status": 7 } ]
```

Nothing is actually removed. `status` becomes `7`, which means deleted. The row
still appears in `/master/module`, so filter on status if you do not want it.

---

## 4. Menus

`POST /system/master/menu/add`

```json
{
  "parent_menu_id": 0,
  "module_id": 11,
  "menu_name": "Sample Menu",
  "priority": 5,
  "status": 1
}
```

`menu_name` and `module_id` are required. `parent_menu_id` of `0` means a
top-level menu; any other number nests this menu under that one.

```json
"data": [
  {
    "id": 12,
    "parent_menu_id": 0,
    "parent_menu_name": "",
    "module_id": 11,
    "module_name": "SAMPLE MODULE V2",
    "menu_name": "Sample Menu",
    "priority": 5,
    "status": 1
  }
]
```

`parent_menu_name` is empty here because the menu has no parent. When it does
have one, you get the parent's name filled in.

### Edit

`POST /system/master/menu/edit` — only `id` required:

```json
{ "id": 12, "menu_name": "Sample Menu V2", "priority": 6 }
```

### Delete

`POST /system/master/menu/delete` — `{ "id": 12 }`, sets `status` to `7`.

---

## 5. Menu actions

A menu action says "this menu supports this action" — for example, the User menu
supports Add. Actions come from a fixed list: 1 Add, 2 View, 3 Edit, 4 Delete,
5 Authorise, 6 Self.

`POST /system/master/menu_action/add`

```json
{ "menu_id": 12, "action_id": 1, "priority": 1, "status": 1 }
```

```json
"data": [
  {
    "id": 28,
    "menu_id": 12,
    "menu_name": "Sample Menu V2",
    "action_id": 1,
    "action_name": "Add",
    "priority": 1,
    "status": 1
  }
]
```

**A menu can only hold each action once.** Sending the same pair twice returns
`400 Menu Action Already Exists`. So a menu can have at most six rows, one per
action. Deleting a pair frees it up to be added again.

### Edit and delete

`POST /system/master/menu_action/edit` — `{ "id": 28, "priority": 3 }`
`POST /system/master/menu_action/delete` — `{ "id": 28 }`

---

## 6. Create an institution

`POST /system/institution/add`

This is the big one. An institution is a bank or company using the platform.

```json
{
  "code": "SAMPLEBANK",
  "name": "Sample Bank Ltd",
  "type": 2,
  "timezone": "Asia/Kathmandu",
  "language": ["en"],
  "date_format": "YYYY-MM-DD",
  "has_branch": true,
  "max_branches_allowed": 25,
  "kyc_enabled": true,
  "total_kyc_levels": 3,
  "allow_downgrade_kyc": false,
  "auto_approve_kyc_level": false,
  "allowed_login_identifiers": ["MOBILE", "EMAIL"],
  "primary_login_identifier": "MOBILE",
  "is_login_pin_enabled": true,
  "login_pin_length": 4,
  "login_pin_type": "NUMERIC",
  "allow_biometric_login": true,
  "is_txn_pin_enabled": true,
  "txn_pin_length": 4,
  "is_same_login_txn_pin_allowed": false
}
```

`code` and `name` are required. `type` comes from `/master/institution_type`:
1 Service Provider, 2 Bank, 3 FinTech.

The response returns the whole record. The tail of it:

```json
{
  "id": 20,
  "code": "SAMPLEBANK",
  "name": "Sample Bank Ltd",
  "type": 2,
  "type_name": "Bank",
  "...": "all the fields you sent, echoed back",
  "status": 1,
  "process_status": 1,
  "auth_status": "AUTHORIZED",
  "created_by": "System",
  "created_userid": 1,
  "created_time": "2026-09-06T22:52:53Z",
  "updated_by": "System",
  "updated_userid": 1,
  "updated_time": "2026-09-06T22:52:53Z",
  "deauth_narration": "UNDEFINED",
  "audit_key": "17887189735777607904488774044380"
}
```

Note `auth_status` is already `AUTHORIZED`. A system user approves their own
work, so there is no second step. When a **normal** user creates an institution
through `/institution/profile/add`, it comes back as `AUTH WAIT` and someone else
has to approve it.

Keep the `id` — you need it for the next three steps.

---

## 7. Give the institution some modules

`POST /system/institution/module/add`

You can assign several at once:

```json
{
  "inst_profile_id": 20,
  "modules": [
    {
      "module_id": 1,
      "effective_from": "2026-01-01",
      "effective_to": "2026-12-31",
      "configuration_status": "PENDING"
    },
    { "module_id": 2 }
  ]
}
```

Only `module_id` is required inside each entry. The dates and status are
optional, as the second entry shows.

```json
"data": [
  {
    "id": 10,
    "inst_profile_id": 20,
    "inst_profile_name": "Sample Bank Ltd",
    "module_id": 1,
    "module_name": "INSTITUTION",
    "effective_from": "2026-01-01",
    "effective_to": "2026-12-31",
    "configuration_status": "PENDING",
    "status": 1,
    "process_status": 1,
    "auth_status": "AUTHORIZED",
    "created_by": "System",
    "created_userid": 1,
    "created_time": "2026-09-06T22:52:53Z",
    "updated_by": "System",
    "updated_userid": 1,
    "updated_time": "2026-09-06T22:52:53Z",
    "deauth_narration": "UNDEFINED",
    "audit_key": "6e2bSr4KS5BcfvyxwlxuGaIWjd4AfG3C"
  },
  {
    "id": 11,
    "module_id": 2,
    "module_name": "USER MANAGEMENT",
    "...": "same shape"
  }
]
```

**It is all or nothing.** The whole list is checked before anything is saved, so
if one entry is bad, none of them are assigned. You will not end up with half a
batch.

It refuses: an unknown `module_id`, the same `module_id` twice in one request, a
module the institution already has, and an end date before a start date. The
error names which entry is at fault.

---

## 8. Create a permission profile

`POST /system/user/profile/add`

A profile is a role: a named bundle of "which menus, and what can you do in
them". Users are assigned a profile rather than individual permissions.

```json
{
  "profile_info": {
    "profile_name": "Sample Bank Admin",
    "inst_profile_id": 20
  },
  "menu_info": [
    { "menu_id": 1, "actions": [1, 2, 3] },
    { "menu_id": 2, "actions": [1, 2] }
  ]
}
```

Note the two nested objects — the profile's own details go in `profile_info`,
and its permissions in `menu_info`. This reads as: on menu 1 you may Add, View
and Edit; on menu 2 you may Add and View.

```json
"data": [
  {
    "profile_id": 14,
    "profile_name": "Sample Bank Admin",
    "inst_profile_id": 20,
    "inst_profile_name": "Sample Bank Ltd",
    "status": 1,
    "process_status": 1,
    "auth_status": "AUTHORIZED",
    "created_by": "System",
    "created_userid": 1,
    "created_time": "2026-09-06T22:52:53Z",
    "updated_by": "System",
    "updated_userid": 1,
    "updated_time": "2026-09-06T22:52:53Z",
    "deauth_narration": "UNDEFINED",
    "audit_key": "1788718973694c58eb2e1e331c565624",
    "audit_action": "SELF",
    "menu_actions": [
      { "menu_id": 1, "actions": [1, 2, 3] },
      { "menu_id": 2, "actions": [1, 2] }
    ]
  }
]
```

### Edit

`POST /system/user/profile/edit`

```json
{
  "profile_info": {
    "profile_id": 14,
    "profile_name": "Sample Bank Admin V2"
  },
  "menu_info": [ { "menu_id": 1, "actions": [1, 2] } ]
}
```

`profile_id` is required. Leaving out `inst_profile_id` keeps the profile where
it is — you **cannot** move a profile to a different institution, and trying
returns `400`.

The reply here is thin, unlike add:

```json
"data": [ { "profile_id": 14 } ]
```

Call `/user/profile/get` afterwards if you need the updated record.

---

## 9. Create a user

`POST /system/user/add`

```json
{
  "username": "sample.admin",
  "password_hash": "Passw0rd",
  "profile_id": 14,
  "inst_profile_id": 20,
  "pwd_policy": 1
}
```

**All five are required.** Leave any of them out and you get a `400` naming the
one that is missing.

```json
"data": [
  {
    "id": 12,
    "username": "sample.admin",
    "profile_id": 14,
    "profile_name": "Sample Bank Admin",
    "inst_profile_id": 20,
    "inst_profile_name": "Sample Bank Ltd",
    "pwd_policy": 1,
    "policy_name": "DEFAULT",
    "is_force_pwd": 0,
    "status": 1,
    "process_status": 1,
    "auth_status": "AUTHORIZED",
    "created_by": "System",
    "created_userid": 1,
    "created_time": "2026-09-06T22:52:53.795527872+04:30",
    "updated_by": "System",
    "updated_userid": 1,
    "updated_time": "2026-09-06T22:52:53.795527872+04:30",
    "deauth_narration": "UNDEFINED",
    "audit_key": "1788718973795a6c1e4d8eedcaf15987",
    "is_system": false
  }
]
```

`is_system` is `false`, so this account logs in at `/user/login`, not
`/system/user/login`.

**This account can only work inside its own institution.** Every user, profile
and institution record it touches must belong to institution 20; anything else
returns `403 Access Denied`. That applies to reading, editing, approving and
deleting alike. System accounts are the exception — they work across all
institutions, which is why they are the ones that set tenants up.

**It also cannot approve its own work.** Outside the system account, changes go
through maker-checker: one person requests, a *different* person approves. So a
new institution needs at least two user accounts before anyone can get anything
authorised. Creating only one leaves it able to request changes but never
complete them.

---

## Setting up a new institution, start to finish

The four calls in order. Each one feeds the next:

```
1. POST /system/institution/add          -> gives you inst_profile_id (20)
2. POST /system/institution/module/add   -> uses 20
3. POST /system/user/profile/add         -> uses 20, gives you profile_id (14)
4. POST /system/user/add                 -> uses both 20 and 14
5. POST /system/user/add                 -> a second user, same 20 and 14
```

After step 4 the new user can log in at `/user/login` and start working.

Step 5 is not optional in practice. Ordinary users cannot approve their own
changes, so a single account can raise requests but never get them approved.
Create at least two before handing the institution over.

---

## When something goes wrong

The `message` is safe to show a user. The `remark` tells you what actually
happened.

```json
{
  "api": "/system/user/add",
  "code": 0,
  "message": "Username Required",
  "remark": "missing required field 'username'",
  "status": "Fail"
}
```

Common ones:

| HTTP | Meaning | Typical cause |
|---|---|---|
| 400 | Bad request | A required field is missing, or a value is not valid |
| 401 | Not logged in | Token missing, expired, or malformed |
| 403 | Not allowed | Not a system account, or the record belongs to another institution |
| 404 | Not found | No record with that id |
| 500 | Server problem | Not your fault — check the server log |

---

## Things that catch people out

**A misspelled endpoint returns `200`.** The server answers unknown paths with a
health-check page instead of `404`, so a typo looks like success. If a response
does not have the usual fields, check your URL first.

**Sending a field name the API does not know is silently ignored.** Edit
endpoints treat a missing field as "leave it alone", so a wrong field name looks
like a request that worked but changed nothing. Check the response body rather
than trusting the `200`.

**Zero is a real value, not "empty".** On edit endpoints, leaving a field out
means "do not change it", but sending `0` sets it to `0`. Status `0` is a valid
status called Undefined.

**Delete never removes anything.** It sets `status` to `7`. Deleted rows still
come back from list endpoints.

**A password is stored exactly as you send it.** There is no hashing yet,
despite the field being called `password_hash`. Do not use a real password on a
shared environment.
