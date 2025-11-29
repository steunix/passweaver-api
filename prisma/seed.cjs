const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('../generated/prisma/index.js')
const adapter = new PrismaPg({ connectionString: process.env.PASSWEAVERAPI_PRISMA_URL })
const prisma = new PrismaClient({ adapter })

const Const = {
  PW_USER_ADMINID: '0',
  PW_FOLDER_ROOTID: '0',
  PW_FOLDER_PERSONALROOTID: 'P',
  PW_GROUP_ROOTID: '0',
  PW_GROUP_ADMINSID: 'A',
  PW_GROUP_EVERYONEID: 'E'
}

const AUTO_TEST = process.env?.PASSWEAVER_AUTO_TEST === '1'

/**
 * Database default initialization
 */
async function main () {
  console.log('Creating base data...')
  let id

  /** KMS */
  console.log('- KMS')
  await prisma.kms.upsert({
    where: { id: '0197d44b-96b2-7602-9dda-dfed2a59e862' },
    update: {},
    create: {
      id: '0197d44b-96b2-7602-9dda-dfed2a59e862',
      type: 1,
      description: 'Local file key',
      config: AUTO_TEST ? '{"master_key_path":"/home/runner/work/_temp/key.txt"}' : '{"master_key_path":"/etc/passweaver/passweaver-master-key.txt"}',
      active: true
    }
  })

  /** FOLDERS  */
  console.log('- Folders')
  // Root
  id = Const.PW_FOLDER_ROOTID
  await prisma.folders.upsert({
    where: { id },
    update: {},
    create: {
      id,
      description: 'Root folder',
      parent: null
    }
  })

  // Personal folders root
  id = Const.PW_FOLDER_PERSONALROOTID
  await prisma.folders.upsert({
    where: { id },
    update: {},
    create: {
      id,
      description: 'Personal folders',
      parent: '0'
    }
  })

  /** GROUPS */
  console.log('- Groups')
  // Root
  id = Const.PW_GROUP_ROOTID
  await prisma.groups.upsert({
    where: { id },
    update: {},
    create: {
      id,
      description: 'Root group',
      parent: null
    }
  })

  // Admins
  id = Const.PW_GROUP_ADMINSID
  await prisma.groups.upsert({
    where: { id },
    update: {},
    create: {
      id,
      description: 'Admins',
      parent: Const.PW_GROUP_ROOTID
    }
  })

  // Everyone
  id = Const.PW_GROUP_EVERYONEID
  await prisma.groups.upsert({
    where: { id },
    update: {},
    create: {
      id,
      description: 'Everyone',
      parent: Const.PW_GROUP_ROOTID
    }
  })

  /** USERS */
  console.log('- Users')
  // Admin
  id = Const.PW_USER_ADMINID
  await prisma.users.upsert({
    where: { id },
    update: {},
    create: {
      id,
      login: 'admin',
      lastname: 'admin',
      firstname: '',
      locale: 'en_US',
      authmethod: 'local',
      email: 'admin',
      secret: '$2a$12$YIWFVQ9cU6Xv9Jf4jOz9VeyS7APLpAqmXqKM7ap8CybvJSc7ldLba',
      secretexpiresat: new Date(2050, 1, 1),
      personalsecret: null,
      active: true
    }
  })

  /** USERS GROUP ASSOCIATION */
  console.log('- Users/groups')
  // Admin in Admins
  await prisma.groupsmembers.createMany({
    data: [{
      groupid: Const.PW_GROUP_ADMINSID,
      userid: Const.PW_USER_ADMINID
    }]
  })

  // Admin in Everyone
  await prisma.groupsmembers.createMany({
    data: [{
      groupid: Const.PW_GROUP_EVERYONEID,
      userid: Const.PW_USER_ADMINID
    }]
  })

  /** FOLDER GROUP PERMISSIONS */
  console.log('- Folders/group')
  await prisma.folderspermissions.createMany({
    data: [{
      folderid: Const.PW_FOLDER_ROOTID,
      groupid: Const.PW_GROUP_ADMINSID,
      read: true,
      write: true
    }]
  })

  /** ITEMS TYPE */
  console.log('- Item type')
  await prisma.itemtypes.createMany({
    data: [{
      description: 'default',
      icon: 'key'
    }]
  })

  /** DEVELOPMENT DATA */
  if (AUTO_TEST) {
    console.log('Creating development data...')

    // Sample folders
    console.log('- Sample folders')
    for (let i = 1; i <= 3; i++) {
      id = `sample${i}`
      await prisma.folders.upsert({
        where: { id },
        update: {},
        create: {
          id,
          description: `Sample folder ${i}`,
          parent: Const.PW_FOLDER_ROOTID
        }
      })
    }

    // Sample users
    console.log('- Sample users')
    for (let i = 1; i <= 2; i++) {
      id = `user${i}`
      await prisma.users.upsert({
        where: { id },
        update: {},
        create: {
          id,
          login: id,
          lastname: id,
          firstname: '',
          locale: 'en_US',
          authmethod: 'local',
          email: id,
          secret: '$2a$12$YIWFVQ9cU6Xv9Jf4jOz9VeyS7APLpAqmXqKM7ap8CybvJSc7ldLba',
          secretexpiresat: new Date(2050, 1, 1),
          personalsecret: null,
          active: true
        }
      })

      // Add user to Everyone
      await prisma.groupsmembers.createMany({
        data: [{
          groupid: Const.PW_GROUP_EVERYONEID,
          userid: id
        }]
      })

      // Personal folders
      await prisma.folders.upsert({
        where: { id },
        update: {},
        create: {
          id,
          description: `Personal folder for ${id}`,
          parent: Const.PW_FOLDER_PERSONALROOTID,
          personal: true,
          userid: id
        }
      })
    }

    // Folder permissions
    console.log('- Folders permissions')
    await prisma.folderspermissions.createMany({
      data: [{
        folderid: 'sample1',
        groupid: Const.PW_GROUP_EVERYONEID,
        read: true,
        write: true
      }]
    })
  }
}

main()
  .then(async () => {
    console.log('All data successfully seeded')
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
