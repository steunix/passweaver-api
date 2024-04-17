const agent = require("superagent")
const assert = require('assert')
const fs = require('fs')

var adminJWT, userJWT
var host

before((done)=>{
  console.log("Vaulted API test before hook")
  // Read listen port from config
  console.log("Reading port from config")
  var port = JSON.parse(
    fs.readFileSync(
      'config.json'
    )
  ).listen_port
  host = `http://localhost:${port}`
  console.log(`Running tests on ${host}`)

  // Get both admin jwt and user jwt
  agent
    .post(`${host}/api/v1/login`)
    .send({"username":"admin", "password": "0"})
    .then(res=>{
      adminJWT = res.body.data.jwt
      agent
        .post(`${host}/api/v1/login`)
        .send({"username":"user1", "password": "0"})
        .then(res=>{
          userJWT = res.body.data.jwt
          done()
        })
    })
})

describe("Vaulted API tests", function() {

// Successful login
describe("Login endpoint", function() {
  it("Bad data", function(done) {
    agent
      .post(`${host}/api/v1/login`)
      .end(function(err, res){
        assert.equal( res.status, "400")
        assert.equal( res?.body?.data?.jwt, undefined)
        done()
      })
  })

  it("Invalid login", function(done) {
    agent
      .post(`${host}/api/v1/login`)
      .send({"username":"admin", "password": "1"})
      .end(function(err, res){
        assert.equal( res.status, "401")
        assert.equal( res?.body?.data?.jwt, undefined)
        done()
      })
  })

  it("Valid login", function(done) {
    agent
      .post(`${host}/api/v1/login`)
      .send({"username":"admin", "password": "0"})
      .end(function(err, res){
        assert.equal( res.status, "200")
        assert.notEqual( res?.body?.data?.jwt, undefined)
        done()
      })
  })
})

describe("Users endpoint", function() {

  describe("Users get", function() {
    it("Unauthorized", function(done) {
      agent
        .get(`${host}/api/v1/users`)
        .set("Authorization",`Bearer ${userJWT}`)
        .end(function(err, res){
          assert.equal( res.status, "403")
          done()
        })
    })

    it("Get user list", function(done) {
      agent
        .get(`${host}/api/v1/users`)
        .set("Authorization",`Bearer ${adminJWT}`)
        .end(function(err, res){
          assert.equal( res.status, "200")
          done()
        })
    })

    it("Get user", function(done) {
      agent
        .get(`${host}/api/v1/users/0`)
        .set("Authorization",`Bearer ${adminJWT}`)
        .end(function(err, res){
          assert.equal( res.status, "200")
          done()
        })
    })

  })
})

})