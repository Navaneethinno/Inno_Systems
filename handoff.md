**Common**
All body-based APIs expect:

```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

`/system/user/login` is the exception: it uses `Authorization: Basic ...`.

**Auth APIs**
`POST /system/user/login`

```json
{
  "user_name": "string",
  "password": "string"
}
```

`POST /system/user/refresh_token`

```json
{}
```

No body is required. Send refresh token in header:

```http
Authorization: Bearer <refresh_token>
```

**Master Module**
`POST /system/master/module/add`

```json
{
  "name": "string",
  "status": 1
}
```

`POST /system/master/module/edit`

```json
{
  "id": 1,
  "name": "string",
  "status": 1
}
```

`POST /system/master/module/delete`

```json
{
  "id": 1
}
```

**Master Menu**
`POST /system/master/menu/add`

```json
{
  "parent_menu_id": 0,
  "module_id": 1,
  "menu_name": "string",
  "priority": 1,
  "status": 1
}
```

`POST /system/master/menu/edit`

```json
{
  "id": 1,
  "parent_menu_id": 0,
  "module_id": 1,
  "menu_name": "string",
  "priority": 1,
  "status": 1
}
```

`POST /system/master/menu/delete`

```json
{
  "id": 1
}
```

**Master Menu Action**
`POST /system/master/menu_action/add`

```json
{
  "menu_id": 1,
  "action_id": 1,
  "priority": 1,
  "status": 1
}
```

`POST /system/master/menu_action/edit`

```json
{
  "id": 1,
  "menu_id": 1,
  "action_id": 1,
  "priority": 1,
  "status": 1
}
```

`POST /system/master/menu_action/delete`

```json
{
  "id": 1
}
```

**System Profile/User Creation**
`POST /system/profile/add`

```json
{
  "profile_info": {
    "profile_id": 0,
    "profile_name": "string",
    "inst_profile_id": 1
  },
  "menu_info": [
    {
      "menu_id": 1,
      "actions": [1, 2, 3],
      "is_configuration_only": 0
    }
  ]
}
```

`POST /system/user/add`

```json
{
  "user_name": "string",
  "user_fname": "string",
  "user_lname": "string",
  "user_mname": null,
  "user_pwd": "string",
  "inst_id": 1,
  "profile_id": 1,
  "employee_id": "string",
  "email": "user@example.com",
  "mobile": "string",
  "gender": "string",
  "address": "string",
  "alternate_mob": null,
  "alternate_email": null,
  "pwd_policy": null
}
```

**System Institution Creation**
`POST /system/institution/add`

```json
{
  "code": "string",
  "name": "string",
  "type": 1,
  "timezone": "Asia/Kolkata",
  "language": ["en"],
  "date_format": "YYYY-MM-DD",
  "has_branch": true,
  "max_branches_allowed": 10,
  "kyc_enabled": true,
  "total_kyc_levels": 3,
  "allow_downgrade_kyc": false,
  "auto_approve_kyc_level": false,
  "allowed_login_identifiers": ["mobile", "email"],
  "primary_login_identifier": "mobile",
  "is_login_pin_enabled": true,
  "login_pin_length": 4,
  "login_pin_type": "NUMERIC",
  "allow_biometric_login": true,
  "is_txn_pin_enabled": true,
  "txn_pin_length": 4,
  "is_same_login_txn_pin_allowed": false
}
```

`POST /system/institution/module/add`

```json
{
  "inst_profile_id": 1,
  "module_id": 1,
  "effective_from": "2026-09-04",
  "effective_to": "2026-12-31",
  "configuration_status": "ACTIVE"
}
```
