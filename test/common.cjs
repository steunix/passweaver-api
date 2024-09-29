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
  title: 'title',
  description: 'description',
  data: '',
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

before((done) => {
  console.log('Passweaver API test before hook')
  // Read listen port from config
  console.log('Reading port from config')
  var port = JSON.parse(
    fs.readFileSync(
      'config.json'
    )
  ).listen.port
  var ip = JSON.parse(
    fs.readFileSync(
      'config.json'
    )
  ).listen.host

  global.host = `http://${ip}:${port}`
  console.log(`Running tests on ${global.host}`)

  // Get both admin jwt and user jwt
  agent
    .post(`${global.host}/api/v1/login`)
    .send({'username':'ADMIN', 'password': '0'})
    .then(res=>{
      global.adminJWT = res.body.data.jwt
      agent
        .post(`${global.host}/api/v1/login`)
        .send({'username':'USER1', 'password': '0'})
        .then(res=>{
          global.userJWT = res.body.data.jwt
          done()
        })
    })
})

function rnd (prefix) {
  const rnd = (new Date%9e6).toString(36)
  return `${prefix}_${rnd}`
}
