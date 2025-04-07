/* global before */

global.agent = require('superagent')
global.assert = require('assert')
global.fs = require('fs')

global.adminJWT = ''
global.userJWT = ''
global.host = ''

global.userCreateData = {
  login: 'test',
  firstname: 'test',
  lastname: 'test',
  authmethod: 'local',
  locale: 'en_US',
  email: 'me',
  secret: '123'
}

global.itemCreateData = {
  title: 'item title',
  description: 'item description',
  data: 'item data',
  metadata: ''
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
  return `${prefix}_${rnd}`
}
