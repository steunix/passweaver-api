/**
 * Const module
 * @module lib/const
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

export const PW_USER_ADMINID = "0"
export const PW_FOLDER_ROOTID = "0"
export const PW_FOLDER_PERSONALROOTID = "P"
export const PW_GROUP_ROOTID = "0"
export const PW_GROUP_ADMINSID = "A"
export const PW_GROUP_EVERYONEID = "E"

export const EV_ENTITY_USER          = 10
export const EV_ENTITY_USERSETTINGS  = 15
export const EV_ENTITY_FOLDER        = 20
export const EV_ENTITY_PERSONALFOLDER= 25
export const EV_ENTITY_ITEM          = 30
export const EV_ENTITY_ITEMTYPE      = 40
export const EV_ENTITY_GROUP         = 50
export const EV_ENTITY_GROUPMEMBERS  = 55
export const EV_ENTITY_ONETIMESECRET = 60
export const EV_ENTITY_PERMISSIONS   = 70

export const EV_ACTION_CREATE      = 10
export const EV_ACTION_UPDATE      = 20
export const EV_ACTION_READ        = 30
export const EV_ACTION_DELETE      = 40
export const EV_ACTION_CLONE       = 50
export const EV_ACTION_LOGIN       = 60
export const EV_ACTION_LOGINNF     = 61
export const EV_ACTION_LOGINNV     = 62
export const EV_ACTION_LOGINFAILED = 63
export const EV_ACTION_UNLOCKNF    = 70
export const EV_ACTION_UNLOCKNV    = 71
export const EV_ACTION_UNLOCK      = 72
export const EV_ACTION_PERSCREATE  = 73
export const EV_ACTION_PWDREAD     = 80
export const EV_ACTION_PWDCOPY     = 81

export const EVD_ENTITY_USER          = "User"
export const EVD_ENTITY_USERSETTINGS  = "User settings"
export const EVD_ENTITY_FOLDER        = "Folder"
export const EVD_ENTITY_PERSONALFOLDER= "Personal folder"
export const EVD_ENTITY_ITEM          = "Item"
export const EVD_ENTITY_ITEMTYPE      = "Item type"
export const EVD_ENTITY_GROUP         = "Group"
export const EVD_ENTITY_GROUPMEMBERS  = "Group member"
export const EVD_ENTITY_ONETIMESECRET = "One time secret"
export const EVD_ENTITY_PERMISSIONS   = "Folder permissions"

export const EVD_ACTION_CREATE      = "Create"
export const EVD_ACTION_UPDATE      = "Update"
export const EVD_ACTION_READ        = "Read"
export const EVD_ACTION_DELETE      = "Delete"
export const EVD_ACTION_CLONE       = "Clone"
export const EVD_ACTION_LOGIN       = "Login"
export const EVD_ACTION_LOGINNF     = "Login not found"
export const EVD_ACTION_LOGINNV     = "Login not valid"
export const EVD_ACTION_LOGINFAILED = "Login failed"
export const EVD_ACTION_UNLOCKNF    = "Personal folder password not set"
export const EVD_ACTION_UNLOCKNV    = "Personal folder password mismatch"
export const EVD_ACTION_UNLOCK      = "Personal folder unlocked"
export const EVD_ACTION_PERSCREATE  = "Personal folder password created"
export const EVD_ACTION_PWDREAD     = "Item password read"
export const EVD_ACTION_PWDCOPY     = "Item password copied"