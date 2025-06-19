/**
 * DB module
 * @module lib/db
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/index.js'

const adapter = new PrismaPg({
  connectionString: process.env.PASSWEAVERAPI_PRISMA_URL
})

const DB = new PrismaClient({ adapter })

export default DB
