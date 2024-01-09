const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Database default initialization
 */
async function main() {
  let id

  /** FOLDERS  */
  // Root
  id = "0"
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
  id = "P"
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
  id = "0"
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
  id = "A"
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
  id = "E"
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
  // User admin
  id = "0"
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
        secret: "$2a$12$aSf1yr1F2cxiiz8oA28zLeInQ4bcKwdLhOEHnjytaPlA0Suh7wYh.",
        secretexpiresat: new Date(2050,1,1),
        personalsecret: "$2a$12$aSf1yr1F2cxiiz8oA28zLeInQ4bcKwdLhOEHnjytaPlA0Suh7wYh.",
        active: true
    }
  })

  /** USERS GROUP ASSOCIATION */
  id = "gu0"
  const gu1 = await prisma.usersGroups.upsert({
    where: { id: id },
    update: {},
    create: {
      id: id,
      group: "A",
      user: "0"
    }
  })

  id = "gu1"
  const gu2 = await prisma.usersGroups.upsert({
    where: { id: id },
    update: {},
    create: {
      id: id,
      group: "E",
      user: "0"
    }
  })

  /** FOLDER GROUP PERMISSIONS */
  // Folder group permission
  id = "fg0"
  const fg0 = await prisma.folderGroupPermission.upsert({
    where: { id: id},
    update: {},
    create: {
      id: id,
      folder: "0",
      group: "A",
      read: true,
      write: true
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