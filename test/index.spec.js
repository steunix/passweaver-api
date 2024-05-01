const agent = require("superagent")
const assert = require('assert')
const fs = require('fs')

var adminJWT, userJWT
var host

const userCreateData = {
  "login": "test",
  "firstname": "test",
  "lastname": "test",
  "authmethod": "local",
  "locale": "en_US",
  "email": "me",
  "secret": "123"
}

before((done)=>{
  console.log("Passweaver API test before hook")
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

describe("PassWeaver API tests", function() {

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

describe("Users endpoints", function() {

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

  describe("User create and remove", function() {
    it("Create and remove", function(done) {
      agent
      .post(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .send(userCreateData)
      .end(function(err, res){
        assert.equal( res.status, "201")
        var userId = res.body.data.id

        agent
        .delete(`${host}/api/v1/users/${userId}`)
        .set("Authorization",`Bearer ${adminJWT}`)
        .end(function(err, res){
          assert.equal( res.status, "200")

          done()
        })
      })
    })
  })

  describe("User update", function() {
    it("Update", function(done) {
      agent
      .post(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .send(userCreateData)
      .end(function(err, res){
        assert.equal( res.status, "201")
        var userId = res.body.data.id

        agent
        .patch(`${host}/api/v1/users/${userId}`)
        .set("Authorization",`Bearer ${adminJWT}`)
        .send({"firstname": "test2"})
        .end(function(err, res){
          assert.equal( res.status, "200")

          done()
        })
      })
    })
  })
})

describe ("Items endpoints", ()=> {
  it("List items", function(done) {
    agent
    .get(`${host}/api/v1/items?search`)
    .set("Authorization",`Bearer ${userJWT}`)
    .end(function(err, res){
      assert.equal( res.status, "200")
      done()
    })
  })
})

})