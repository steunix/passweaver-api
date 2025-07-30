/**
 * PassWeaver, a collaborative password manager
 *
 * @module main
 * @author Stefano Rivoir <rs4000@gmail.com>
 * @licence MIT
 * @copyright (c) 2023-2025 - Stefano Rivoir <rs4000@gmail.com>
 */

import Express from 'express'
import compression from 'compression'
import Morgan from 'morgan'
import * as RFS from 'rotating-file-stream'
import FS from 'fs'
import helmet from 'helmet'
import https from 'https'
import rateLimitMiddleware from './lib/ratelimiter.mjs'

import * as Config from './lib/config.mjs'
import * as Cache from './lib/cache.mjs'
import * as R from './lib/response.mjs'
import * as Const from './lib/const.mjs'
import * as Metrics from './lib/metrics.mjs'

// Routes
import folders from './api/v1/routes/folders.mjs'
import groups from './api/v1/routes/groups.mjs'
import items from './api/v1/routes/items.mjs'
import users from './api/v1/routes/users.mjs'
import login from './api/v1/routes/login.mjs'
import util from './api/v1/routes/util.mjs'
import events from './api/v1/routes/events.mjs'
import personal from './api/v1/routes/personal.mjs'
import itemtypes from './api/v1/routes/itemtypes.mjs'
import onetimetokens from './api/v1/routes/onetimetokens.mjs'
import kms from './api/v1/routes/kms.mjs'
import apikeys from './api/v1/routes/apikeys.mjs'
import version from './api/v1/routes/version.mjs'
import metrics from './api/v1/routes/metrics.mjs'

export const app = Express()

console.log(`PassWeaver API ${Config.packageJson().version} starting...`)

// Read config
const cfg = Config.get()

// Init cache
await Cache.init()

// Set readonly flag in cache
Cache.set(Const.PW_USER_ADMINID, 'readonly', Config.get().readonly)

// Rate limiter
app.use(rateLimitMiddleware)

// Use json middleware
app.use(Express.json())

// Compression
app.use(compression({ threshold: 10240 }))

// HSTS
if (cfg?.https?.hsts) {
  app.use(helmet.hsts())
}

if (!FS.existsSync(cfg.log.dir)) {
  FS.mkdirSync(cfg.log.dir)
}

// Log requests
const logAccess = RFS.createStream(`${cfg.log.dir}/passweaver-api-access.log`, {
  interval: cfg.log.rotation,
  rotate: cfg.log.retention
})
app.use(
  Morgan(':remote-addr - :remote-user [:date[clf]] \':method :url HTTP/:http-version\' :status :res[content-length] :total-time[0]',
    { stream: logAccess }
  )
)

// Log errors
const logErrors = RFS.createStream(`${cfg.log.dir}/passweaver-api-errors.log`, {
  interval: cfg.log.rotation,
  rotate: cfg.log.retention
})

// Install routers
app.use('/api/v1/items', items)
app.use('/api/v1/folders', folders)
app.use('/api/v1/groups', groups)
app.use('/api/v1/users', users)
app.use('/api/v1/login', login)
app.use('/api/v1/util', util)
app.use('/api/v1/events', events)
app.use('/api/v1/personal', personal)
app.use('/api/v1/itemtypes', itemtypes)
app.use('/api/v1/onetimetokens', onetimetokens)
app.use('/api/v1/kms', kms)
app.use('/api/v1/apikeys', apikeys)
app.use('/api/v1/version', version)
app.use('/api/v1/metrics', metrics)

// Error handler
app.use((err, req, res, next) => {
  logErrors.write(`[${(new Date()).toString()}]\n`)
  logErrors.write(`${req.method} ${req.originalUrl}\n`)
  logErrors.write(`${err.stack}\n`)
  logErrors.write(`${err.message}\n`)
  res.status(R.INTERNAL_SERVER_ERROR).send(R.ko('Internal error'))
})

// Error handler for invalid path/method
app.all(/.*/, (_req, res, _next) => {
  res.status(R.INTERNAL_SERVER_ERROR).send({
    status: 'failed',
    message: 'Path not found, or invalid method',
    data: {}
  })
})

// Setup metrics
if (cfg?.enable_metrics) {
  Metrics.init()
  Metrics.createCounter(Const.METRICS_LOGIN_USERS, 'User logins')
  Metrics.createCounter(Const.METRICS_LOGIN_APIKEYS, 'API keys logins')
  Metrics.createCounter(Const.METRICS_ITEMS_CREATED, 'New items')
  Metrics.createCounter(Const.METRICS_ITEMS_DELETED, 'Deleted items')
  Metrics.createCounter(Const.METRICS_ITEMS_UPDATED, 'Updated items')
  Metrics.createCounter(Const.METRICS_ITEMS_READ, 'Read items')
  Metrics.createCounter(Const.METRICS_KMS_ENCRYPTIONS, 'Encryptions')
  Metrics.createCounter(Const.METRICS_KMS_DECRYPTIONS, 'Decryptions')
  Metrics.createCounter(Const.METRICS_KMS_ENCRYPTIONS_PER_KMS, 'Encryptions per KMS', 'kms_description')
  Metrics.createCounter(Const.METRICS_KMS_DECRYPTIONS_PER_KMS, 'Decryptions per KMS', 'kms_description')
}

// HTTP(S) server start
if (cfg.https.enabled) {
  https.createServer({
    key: FS.readFileSync(cfg.https.private_key),
    cert: FS.readFileSync(cfg.https.certificate)
  }, app).listen(cfg.listen.port, cfg.listen.host)
  console.log(`Listening on '${cfg.listen.host}' port ${cfg.listen.port} (https)`)
} else {
  console.log(`Listening on '${cfg.listen.host}' port ${cfg.listen.port} (http)`)
  app.listen(cfg.listen.port, cfg.listen.host)
}
