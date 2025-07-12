/* global before */

global.agent = require('superagent')
global.assert = require('assert')
global.fs = require('fs')

global.adminJWT = ''
global.userJWT = ''
global.host = ''
global.key = btoa('12345678901234567890123456789012')

global.userCreateData = {
  login: 'test',
  firstname: 'test',
  lastname: 'test',
  authmethod: 'local',
  locale: 'en_US',
  email: 'me',
  secret: '123'
}

global.userCreateDataApiKey = {
  login: 'test',
  firstname: 'test',
  lastname: 'test',
  authmethod: 'apikey',
  locale: 'en_US',
  email: 'me',
  secret: '123'
}

global.itemCreateData = {
  title: 'item title',
  data: 'item data',
  metadata: 'metadata'
}

global.itemCreateDataBad = {
  title: '',
  description: 'description',
  data: '',
  metadata: ''
}

global.folderCreateData = {
  description: 'folder description'
}

global.groupCreateData = {
  description: 'group description'
}

const AUTO_TEST = process.env?.PASSWEAVER_AUTO_TEST === '1'

before((done) => {
  console.log('Passweaver API test before hook')
  // Read listen port from config
  console.log('Reading port from config')
  const port = JSON.parse(
    global.fs.readFileSync(
      AUTO_TEST ? './test/config-test.json' : 'config.json'
    )
  ).listen.port
  const ip = JSON.parse(
    global.fs.readFileSync(
      AUTO_TEST ? './test/config-test.json' : 'config.json'
    )
  ).listen.host

  global.host = `http://${ip}:${port}`
  console.log(`Running tests on ${global.host}`)

  // Get both admin jwt and user jwt
  global.agent
    .post(`${global.host}/api/v1/login`)
    .send({ username: 'ADMIN', password: '0' })
    .then(res => {
      global.adminJWT = res.body.data.jwt

      global.agent
        .post(`${global.host}/api/v1/util/systemunlock`)
        .set('Authorization', `Bearer ${global.adminJWT}`).then(res => {
          global.agent
            .post(`${global.host}/api/v1/login`)
            .send({ username: 'USER1', password: '0' })
            .then(res => {
              global.userJWT = res.body.data.jwt
              done()
            })
        })
    })
})

global.rnd = (prefix) => {
  const rnd = (new Date() % 9e6).toString(36)
  return `${prefix || 'random'}_${rnd}`
}

global.decryptBlock = async (data, key) => {
  const crypto = require('crypto')

  const parts = data.split(':')

  const iv = Buffer.from(parts[0], 'base64')
  const string = Buffer.from(parts[1], 'base64')

  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'base64'), iv)

  let decrypted = decipher.update(string, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
