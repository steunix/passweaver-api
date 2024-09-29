/**
 * DB module
 * @module lib/db
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import { PrismaClient } from '@prisma/client'
import * as Config from './config.mjs'

const DB = new PrismaClient(Config.get().prisma_options)

export default DB
