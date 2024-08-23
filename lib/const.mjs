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

export const EV_ENTITY_USER          = 100
export const EV_ENTITY_USERSETTINGS  = 150
export const EV_ENTITY_FOLDER        = 200
export const EV_ENTITY_PERSONALFOLDER= 250
export const EV_ENTITY_ITEM          = 300
export const EV_ENTITY_ITEMTYPE      = 400
export const EV_ENTITY_GROUP         = 500
export const EV_ENTITY_GROUPMEMBERS  = 550
export const EV_ENTITY_ONETIMESECRET = 600
export const EV_ENTITY_PERMISSIONS   = 700

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