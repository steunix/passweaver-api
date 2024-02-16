/**
 * Vaulted, a collaborative password manager
 *
 * (c) 2023 - Stefano Rivoir <rs4000@gmail.com>
 *
 * @module main
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import Express from "express"
import Morgan from "morgan"
import RFS from "rotating-file-stream"

import * as Config from './src/config.mjs'

export const app = Express()

import folders from "./api/v1/routes/folders.mjs"
import groups from "./api/v1/routes/groups.mjs"
import items from "./api/v1/routes/items.mjs"
import users from "./api/v1/routes/users.mjs"
import login from "./api/v1/routes/login.mjs"
import util from "./api/v1/routes/util.mjs"

import * as R from './src/response.mjs'

import rateLimitMiddleware from "./src/ratelimiter.mjs"

console.log("Vaulted "+Config.packageJson().version+" starting...")

// Checks for config
const cfg = Config.get()

if ( !cfg.master_key ) {
  console.error("Master key cannot be found: verify environment variable name and value")
  process.exit(1)
}
if ( !cfg.jwt_key ) {
  console.error("JWT key cannot be found: verify environment variable name and value")
  process.exit(2)
}
if ( !cfg.listen_port ) {
  console.error("Listen port is not defined, verify config.json")
  process.exit(2)
}

// Rate limiter
app.use(rateLimitMiddleware)

// Use json middleware
app.use(Express.json())

// Log requests
const logStream = RFS.createStream("./log/vaulted-api.log", {
  interval: "1d",
  rotate: 14
})
app.use(Morgan('combined', { stream: logStream }))

// Install routers
app.use("/api/v1/items", items)
app.use("/api/v1/folders", folders)
app.use("/api/v1/groups", groups)
app.use("/api/v1/users", users)
app.use("/api/v1/login", login)
app.use("/api/v1/util", util)

// Error handler
app.use((err, req, res, next)=> {
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

console.log("Listening on port "+cfg.listen_port)

app.listen(cfg.listen_port)
