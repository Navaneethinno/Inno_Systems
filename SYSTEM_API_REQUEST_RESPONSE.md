# System APIs — Request/Response Reference

Captured live against the local dev server (`http://localhost:15003`) on 2026-09-04.
All routes (except login) require `Authorization: Bearer <jwt_token>` from the SYSTEM user's login response.

---

## 1. POST /system/user/login

Auth: HTTP Basic `system` / `123456` (separate from the bearer-token gate used by every other route).

**Request**
```json
{
  "user_name": "System",
  "password": "123456"
}
```

**Response**
```json
{
  "api": "/system/user/login",
  "code": 1,
  "status": "Success",
  "message": "system user login successful",
  "remark": "system user login successful",
  "data": {
    "user_details": {
      "id": 1,
      "username": "System",
      "profile_id": 1,
      "profile_name": "SYSTEM",
      "inst_profile_id": 1,
      "institution_name": "SYSTEM INTERNAL",
      "pwd_policy": 1,
      "policy_name": "DEFAULT",
      "is_force_pwd": 0,
      "status": 1,
      "process_status": 1,
      "auth_status": "AUTHORIZED",
      "created_by": "System",
      "created_userid": 1,
      "created_username": "System",
      "created_time": "2026-09-04T20:37:19.113541+04:30",
      "updated_by": "System",
      "updated_userid": 1,
      "updated_username": "System",
      "updated_time": "2026-09-04T20:37:19.113541+04:30",
      "deauth_narration": "Undefined",
      "audit_key": "Undefined",
      "is_system": true
    },
    "user_session_info": {
      "user_id": 1,
      "last_login": "2026-09-04T21:48:23.563896446+04:30",
      "jwt_token": "<jwt>",
      "refresh_token": "<jwt>",
      "status": 1
    },
    "full_access": true
  }
}
```

---

## 2. POST /system/user/refresh_token

Auth: `Authorization: Bearer <refresh_token>` (from login). No request body.

**Request**
```
(empty body)
```

**Response**
```json
{
  "api": "/system/user/refresh_token",
  "code": 1,
  "status": "Success",
  "message": "Token refreshed successfully",
  "remark": "Token refreshed successfully",
  "data": {
    "user_id": 1,
    "last_login": "0001-01-01T00:00:00Z",
    "jwt_token": "<jwt>",
    "refresh_token": "<jwt>",
    "status": 1
  }
}
```
Note: `last_login` is always the zero value here — this endpoint doesn't re-read the user row, so it's an unused/dead field on this response.

---

## 3. POST /system/master/module/add

**Request** (all columns `master.module` accepts on create)
```json
{
  "name": "DocModuleFull",
  "status": 1
}
```

**Response**
```json
{
  "api": "/system/master/module/add",
  "code": 1,
  "status": "Success",
  "message": "module added successfully",
  "remark": "module added successfully",
  "data": {
    "id": 8,
    "name": "DocModuleFull",
    "status": 1
  }
}
```

---

## 4. POST /system/master/module/edit

**Request**
```json
{
  "id": 6,
  "name": "DocModuleEdited"
}
```

**Response**
```json
{
  "api": "/system/master/module/edit",
  "code": 1,
  "status": "Success",
  "message": "module edited successfully",
  "remark": "module edited successfully",
  "data": {
    "id": 6,
    "name": "DocModuleEdited",
    "status": 1
  }
}
```

---

## 5. POST /system/master/module/delete

**Request**
```json
{
  "id": 7
}
```

**Response**
```json
{
  "api": "/system/master/module/delete",
  "code": 1,
  "status": "Success",
  "message": "module deleted successfully",
  "remark": "module deleted successfully",
  "data": {
    "id": 7,
    "name": "DocModuleToDelete",
    "status": 7
  }
}
```
Note: delete is a soft-delete — `status: 7` is the deleted-status code, row still exists.

---

## 6. POST /system/master/menu/add

**Request** (all columns `master.menu` accepts on create)
```json
{
  "parent_menu_id": 0,
  "module_id": 8,
  "menu_name": "DocMenuFull",
  "priority": 1,
  "status": 1
}
```

**Response**
```json
{
  "api": "/system/master/menu/add",
  "code": 1,
  "status": "Success",
  "message": "menu added successfully",
  "remark": "menu added successfully",
  "data": {
    "id": 10,
    "menu_name": "DocMenuFull",
    "module_id": 8,
    "module_name": "DocModuleFull",
    "parent_menu_id": 0,
    "priority": 1,
    "status": 1
  }
}
```

---

## 7. POST /system/master/menu/edit

**Request**
```json
{
  "id": 8,
  "menu_name": "DocMenuEdited"
}
```

**Response**
```json
{
  "api": "/system/master/menu/edit",
  "code": 1,
  "status": "Success",
  "message": "menu edited successfully",
  "remark": "menu edited successfully",
  "data": {
    "id": 8,
    "menu_name": "DocMenuEdited",
    "module_id": 6,
    "module_name": "DocModuleEdited",
    "parent_menu_id": 0,
    "priority": 1,
    "status": 1
  }
}
```

---

## 8. POST /system/master/menu/delete

**Request**
```json
{
  "id": 9
}
```

**Response**
```json
{
  "api": "/system/master/menu/delete",
  "code": 1,
  "status": "Success",
  "message": "menu deleted successfully",
  "remark": "menu deleted successfully",
  "data": {
    "id": 9,
    "menu_name": "DocMenuToDelete",
    "module_id": 6,
    "module_name": "DocModuleEdited",
    "parent_menu_id": 0,
    "priority": 1,
    "status": 7
  }
}
```

---

## 9. POST /system/master/menu_action/add

**Request**
```json
{
  "menu_id": 8,
  "action_id": 1,
  "priority": 1
}
```

**Response**
```json
{
  "api": "/system/master/menu_action/add",
  "code": 1,
  "status": "Success",
  "message": "menu action added successfully",
  "remark": "menu action added successfully",
  "data": {
    "id": 21,
    "menu_id": 8,
    "menu_name": "DocMenuEdited",
    "action_id": 1,
    "action_name": "Add",
    "priority": 1,
    "status": 1
  }
}
```

---

## 10. POST /system/master/menu_action/edit

**Request**
```json
{
  "id": 21,
  "action_id": 2
}
```

**Response**
```json
{
  "api": "/system/master/menu_action/edit",
  "code": 1,
  "status": "Success",
  "message": "menu action edited successfully",
  "remark": "menu action edited successfully",
  "data": {
    "id": 21,
    "menu_id": 8,
    "menu_name": "DocMenuEdited",
    "action_id": 2,
    "action_name": "View",
    "priority": 1,
    "status": 1
  }
}
```

---

## 11. POST /system/master/menu_action/delete

**Request**
```json
{
  "id": 22
}
```

**Response**
```json
{
  "api": "/system/master/menu_action/delete",
  "code": 1,
  "status": "Success",
  "message": "menu action deleted successfully",
  "remark": "menu action deleted successfully",
  "data": {
    "id": 22,
    "menu_id": 8,
    "menu_name": "DocMenuEdited",
    "action_id": 3,
    "action_name": "Edit",
    "priority": 1,
    "status": 7
  }
}
```

---

## 12. POST /system/profile/add

Creates a `urmg.profile` (role) with its menu/action assignments in one call.

**Request**
```json
{
  "profile_info": {
    "profile_name": "DocProfile",
    "inst_profile_id": 1
  },
  "menu_info": [
    { "menu_id": 1, "actions": [1, 2], "is_configuration_only": 0 }
  ]
}
```

**Response**
```json
{
  "api": "/system/profile/add",
  "code": 1,
  "status": "Success",
  "message": "Profile added successfully",
  "remark": "Profile added successfully",
  "data": {
    "profile_id": 3,
    "profile_name": "DocProfile"
  }
}
```

---

## 13. POST /system/profile/edit

**Request**
```json
{
  "profile_info": {
    "profile_id": 3,
    "profile_name": "DocProfileEdited",
    "inst_profile_id": 1
  },
  "menu_info": [
    { "menu_id": 1, "actions": [1, 2], "is_configuration_only": 0 }
  ]
}
```

**Response**
```json
{
  "api": "/system/profile/edit",
  "code": 1,
  "status": "Success",
  "message": "Profile edited successfully",
  "remark": "Profile edited successfully",
  "data": {
    "profile_id": 3
  }
}
```

---

## 14. POST /system/user/add

**Request** (all columns `urmg.user` + `urmg.user_kyc` accept on create)
```json
{
  "user_name": "docuser2",
  "user_fname": "Doc",
  "user_mname": "Middle",
  "user_lname": "User2",
  "user_pwd": "Passw0rd123",
  "inst_id": 1,
  "profile_id": 1,
  "employee_id": "EMP002",
  "email": "docuser2@example.com",
  "mobile": "9800000002",
  "gender": "Male",
  "address": "Kathmandu",
  "alternate_mob": "9811111111",
  "alternate_email": "docuser2.alt@example.com",
  "pwd_policy": "1"
}
```

**Response**
```json
{
  "api": "/system/user/add",
  "code": 1,
  "status": "Success",
  "message": "user added successfully",
  "remark": "user added successfully",
  "data": {
    "user_id": 3
  }
}
```

---

## 15. POST /system/institution/add

**Request** (all columns `institution.profile` accepts on create)
```json
{
  "code": "DOCINST3",
  "name": "Doc Verify Institution 3",
  "type": 1,
  "timezone": "Asia/Kathmandu",
  "language": {"default": "en", "supported": ["en", "ne"]},
  "date_format": "YYYY-MM-DD",
  "has_branch": true,
  "max_branches_allowed": 10,
  "kyc_enabled": true,
  "total_kyc_levels": 3,
  "allow_downgrade_kyc": false,
  "auto_approve_kyc_level": false,
  "allowed_login_identifiers": {"identifiers": ["username", "email", "mobile"]},
  "primary_login_identifier": "username",
  "is_login_pin_enabled": true,
  "login_pin_length": 6,
  "login_pin_type": "numeric",
  "allow_biometric_login": true,
  "is_txn_pin_enabled": true,
  "txn_pin_length": 4,
  "is_same_login_txn_pin_allowed": false
}
```

**Response**
```json
{
  "api": "/system/institution/add",
  "code": 1,
  "status": "Success",
  "message": "profile add successful",
  "remark": "profile add successful",
  "data": {
    "id": 7,
    "code": "DOCINST3",
    "name": "Doc Verify Institution 3",
    "type": 1,
    "type_name": "Service Provider",
    "timezone": "Asia/Kathmandu",
    "language": {"default": "en", "supported": ["en", "ne"]},
    "date_format": "YYYY-MM-DD",
    "has_branch": true,
    "max_branches_allowed": 10,
    "kyc_enabled": true,
    "total_kyc_levels": 3,
    "allow_downgrade_kyc": false,
    "auto_approve_kyc_level": false,
    "allowed_login_identifiers": {"identifiers": ["username", "email", "mobile"]},
    "primary_login_identifier": "username",
    "is_login_pin_enabled": true,
    "login_pin_length": 6,
    "login_pin_type": "numeric",
    "allow_biometric_login": true,
    "is_txn_pin_enabled": true,
    "txn_pin_length": 4,
    "is_same_login_txn_pin_allowed": false,
    "status": 1,
    "process_status": 1,
    "auth_status": "AUTHORIZED",
    "created_by": "1",
    "created_userid": 1,
    "created_username": "System",
    "created_time": "2026-09-04T22:16:54Z",
    "updated_by": "1",
    "updated_userid": 1,
    "updated_username": "System",
    "updated_time": "2026-09-04T22:16:54Z",
    "deauth_narration": "UNDEFINED",
    "audit_key": "17885440148718604351269960914240"
  }
}
```

---

## 16. POST /system/institution/module/add

Assigns a `master.module` to an institution.

**Request**
```json
{
  "inst_profile_id": 6,
  "module_id": 1,
  "effective_from": "2026-09-04",
  "effective_to": "2027-09-04",
  "configuration_status": "ACTIVE"
}
```

**Response**
```json
{
  "api": "/system/institution/module/add",
  "code": 1,
  "status": "Success",
  "message": "Module add successful",
  "remark": "Module add successful",
  "data": {
    "id": 3,
    "inst_profile_id": 6,
    "institution_name": "Doc Verify Institution 2",
    "module_id": 1,
    "module_name": "INSTITUTION",
    "effective_from": "2026-09-04T00:00:00Z",
    "effective_to": "2027-09-04T00:00:00Z",
    "configuration_status": "ACTIVE",
    "status": 1,
    "process_status": 1,
    "auth_status": "AUTHORIZED",
    "created_by": "1",
    "created_userid": 1,
    "created_username": "System",
    "created_time": "2026-09-04T21:51:19Z",
    "updated_by": "1",
    "updated_userid": 1,
    "updated_username": "System",
    "updated_time": "2026-09-04T21:51:19Z",
    "deauth_narration": "UNDEFINED",
    "audit_key": "XRdJ4nSj4lTJNcwIm8oFXifSlkl1DXJn"
  }
}
```
