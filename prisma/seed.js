const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const Const = {
  PW_USER_ADMINID: "0",
  PW_FOLDER_ROOTID: "0",
  PW_FOLDER_PERSONALROOTID: "P",
  PW_GROUP_ROOTID: "0",
  PW_GROUP_ADMINSID: "A",
  PW_GROUP_EVERYONEID: "E"
}

/**
 * Database default initialization
 */
async function main() {
  let id

  /** FOLDERS  */
  // Root
  id = Const.PW_FOLDER_ROOTID
  const rootFolder = await prisma.folders.upsert({
      where: { id: id },
      update: {},
      create: {
          id: id,
          description: "Root folder",
          parent: null
      }
  })

  // Personal folders root
  id = Const.PW_FOLDER_PERSONALROOTID
  const personalFolders = await prisma.folders.upsert({
      where: { id: id },
      update: {},
      create: {
          id: id,
          description: "Personal folders",
          parent: "0"
      }
  })

  /** GROUPS */
  // Root
  id = Const.PW_GROUP_ROOTID
  const rootGroup = await prisma.groups.upsert({
    where: { id: id },
    update: {},
    create: {
        id: "0",
        description: "Root group",
        parent: null
    }
  })

  // Admins
  id = Const.PW_GROUP_ADMINSID
  const adminsGroup = await prisma.groups.upsert({
    where: { id: id },
    update: {},
    create: {
        id: id,
        description: "Admins",
        parent: "0"
    }
  })

  // Everyone
  id = Const.PW_GROUP_EVERYONEID
  const everyoneGroup = await prisma.groups.upsert({
    where: { id: id },
    update: {},
    create: {
        id: id,
        description: "Everyone",
        parent: "0"
    }
  })

  /** USERS */
  // Admin
  id = Const.PW_USER_ADMINID
  const admin = await prisma.users.upsert({
    where: { id: id },
    update: {},
    create: {
        id: id,
        login: "admin",
        lastname: "admin",
        firstname: "",
        locale: "en_US",
        authmethod: "local",
        email: "admin",
        secret: "$2a$12$YIWFVQ9cU6Xv9Jf4jOz9VeyS7APLpAqmXqKM7ap8CybvJSc7ldLba",
        secretexpiresat: new Date(2050,1,1),
        personalsecret: null,
        active: true
    }
  })

  /** USERS GROUP ASSOCIATION */
  // Admin in Admins
  const gu1 = await prisma.groupsmembers.create({
    data: {
      groupid: Const.PW_GROUP_ADMINSID,
      userid: Const.PW_USER_ADMINID
    }
  })

  // Admin in Everyone
  const gu2 = await prisma.groupsmembers.create({
    data: {
      groupid: Const.PW_GROUP_EVERYONEID,
      userid: Const.PW_USER_ADMINID
    }
  })

  /** FOLDER GROUP PERMISSIONS */
  // Admins r/w to root
  const fg0 = await prisma.folderspermissions.create({
    data: {
      id: id,
      folderid: Const.PW_FOLDER_ROOTID,
      groupid: Const.PW_GROUP_ADMINSID,
      read: true,
      write: true
    }
  })

  /** ITEMS TYPE */
  const it0 = await prisma.itemtypes.create({
    data: {
      description: "default",
      icon: "key"
    }
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })