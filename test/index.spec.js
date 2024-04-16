const agent = require("superagent");
const assert = require('assert');

var adminJWT, userJWT

const host = "http://localhost:3000"

before((done)=>{
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
})

})