/**
 * PassWeaver, a collaborative password manager
 *
 * (c) 2023 - Stefano Rivoir <rs4000@gmail.com>
 *
 * @module main
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import Express from "express"
import compression from "compression"
import Morgan from "morgan"
import * as RFS from "rotating-file-stream"
import FS from "fs"
import helmet from 'helmet'
import https from 'https'

import * as Config from './lib/config.mjs'

export const app = Express()

// Routes
import folders from "./api/v1/routes/folders.mjs"
import groups from "./api/v1/routes/groups.mjs"
import items from "./api/v1/routes/items.mjs"
import users from "./api/v1/routes/users.mjs"
import login from "./api/v1/routes/login.mjs"
import util from "./api/v1/routes/util.mjs"
import events from "./api/v1/routes/events.mjs"
import personal from "./api/v1/routes/personal.mjs"
import itemtypes from "./api/v1/routes/itemtypes.mjs"
import onetimetokens from "./api/v1/routes/onetimetokens.mjs"

import * as R from './lib/response.mjs'

import rateLimitMiddleware from "./lib/ratelimiter.mjs"

console.log(`PassWeaver API ${Config.packageJson().version} starting...`)

// Checks for config
const cfg = Config.get()

// Rate limiter
app.use(rateLimitMiddleware)

// Use json middleware
app.use(Express.json())

// Compression
app.use(compression())

// HSTS
if ( cfg?.https?.hsts ) {
  app.use(helmet.hsts())
}

if ( !FS.existsSync(cfg.log_dir) ) {
  FS.mkdirSync(cfg.log_dir)
}

// Log requests
const logAccess = RFS.createStream(`${cfg.log_dir}/passweaver-api-access.log`, {
  interval: "1d",
  rotate: 14
})
app.use(
  Morgan(`:remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :total-time[0]`,
  { stream: logAccess })
)

// Log errors
const logErrors = RFS.createStream(`${cfg.log_dir}/passweaver-api-errors.log`, {
  interval: "1d",
  rotate: 14
})

// Install routers
app.use("/api/v1/items", items)
app.use("/api/v1/folders", folders)
app.use("/api/v1/groups", groups)
app.use("/api/v1/users", users)
app.use("/api/v1/login", login)
app.use("/api/v1/util", util)
app.use("/api/v1/events", events)
app.use("/api/v1/personal", personal)
app.use("/api/v1/itemtypes", itemtypes)
app.use("/api/v1/onetimetokens", onetimetokens)

// Error handler
app.use((err, req, res, next)=> {
  logErrors.write(`[${(new Date()).toString()}]\n`)
  logErrors.write(`${req.method} ${req.originalUrl}\n`)
  logErrors.write(`${err.stack}\n`)
  logErrors.write(`${err.message}\n`)
  res.status(500).send(R.ko("Internal error"))
})

// Error handler for invalid path/method
app.all("*", (_req, res, _next) => {
  res.status(500).send({
    status: "failed",
    message: "Path not found, or invalid method",
    data: {}
  })
})


// HTTP(S) server startup
if ( cfg.https.enabled ) {
  https.createServer({
    key: FS.readFileSync(cfg.https.private_key),
    cert: FS.readFileSync(cfg.https.certificate)
  },app).listen(cfg.listen_port)
  console.log(`Listening on port ${cfg.listen_port} (https)`)
} else {
  console.log(`Listening on port ${cfg.listen_port} (http)`)
  app.listen(cfg.listen_port)
}