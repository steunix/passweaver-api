/**
 * Const module
 * @module lib/const
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

export const PW_USER_ADMINID = '0'
export const PW_FOLDER_ROOTID = '0'
export const PW_FOLDER_PERSONALROOTID = 'P'
export const PW_GROUP_ROOTID = '0'
export const PW_GROUP_ADMINSID = 'A'
export const PW_GROUP_EVERYONEID = 'E'

export const EV_ENTITY_USER = 10
export const EV_ENTITY_USERSETTINGS = 15
export const EV_ENTITY_FOLDER = 20
export const EV_ENTITY_PERSONALFOLDER = 25
export const EV_ENTITY_ITEM = 30
export const EV_ENTITY_ITEMTYPE = 40
export const EV_ENTITY_GROUP = 50
export const EV_ENTITY_GROUPMEMBERS = 55
export const EV_ENTITY_ONETIMESECRET = 60
export const EV_ENTITY_ONETIMESHARE = 65
export const EV_ENTITY_PERMISSIONS = 70
export const EV_ENTITY_KMS = 80

export const EV_ACTION_CREATE = 10
export const EV_ACTION_UPDATE = 20
export const EV_ACTION_READ = 30
export const EV_ACTION_READVIATOKEN = 35
export const EV_ACTION_DELETE = 40
export const EV_ACTION_CLONE = 50
export const EV_ACTION_LOGIN = 60
export const EV_ACTION_LOGINNF = 61
export const EV_ACTION_LOGINNV = 62
export const EV_ACTION_LOGINFAILED = 63
export const EV_ACTION_UNLOCKNF = 70
export const EV_ACTION_UNLOCKNV = 71
export const EV_ACTION_UNLOCK = 72
export const EV_ACTION_PERSCREATE = 73
export const EV_ACTION_PERSRESET = 74
export const EV_ACTION_PWDREAD = 80
export const EV_ACTION_PWDCOPY = 81
export const EV_ACTION_PWDUPDATE = 82
export const EV_ACTION_ITEMSHARE = 90

export const entityDescriptions = {
  10: 'User',
  15: 'User settings',
  20: 'Folder',
  25: 'Personal folder',
  30: 'Item',
  40: 'Item type',
  50: 'Group',
  55: 'Group member',
  60: 'One time secret',
  65: 'One time item share',
  70: 'Folder permissions'
}

export const actionDescriptions = {
  10: 'Create',
  20: 'Update',
  30: 'Read',
  35: 'Read via one time token',
  40: 'Delete',
  50: 'Clone',
  60: 'Login',
  61: 'Login not found',
  62: 'Login not valid',
  63: 'Login failed',
  70: 'Personal folder password not set',
  71: 'Personal folder password mismatch',
  72: 'Personal folder unlocked',
  73: 'Personal folder password created',
  80: 'Password read',
  81: 'Password copied',
  82: 'Password changed',
  90: 'One-time share created'
}

export const OTT_TYPE_SECRET = 0
export const OTT_TYPE_ITEM = 1

export const OTT_SCOPE_ANYONE = 0
export const OTT_SCOPE_LOGGEDIN = 1
export const OTT_SCOPE_USER = 2

export const KMS_TYPE_NODEK = 0
export const KMS_TYPE_LOCALFILE = 1
export const KMS_TYPE_GOOGLECLOUD = 2
