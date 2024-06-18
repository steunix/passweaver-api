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

const itemCreateData = {
  "title": "title",
  "description": "description",
  "data": "",
  "metadata": ""
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
  it("Login bad data", function(done) {
    agent
      .post(`${host}/api/v1/login`)
      .end(function(err, res){
        assert.strictEqual( res.status, 400)
        assert.strictEqual( res?.body?.data?.jwt, undefined)
        done()
      })
  })

  it("Invalid login", function(done) {
    agent
      .post(`${host}/api/v1/login`)
      .send({"username":"admin", "password": "1"})
      .end(function(err, res){
        assert.strictEqual( res.status, 401)
        assert.strictEqual( res?.body?.data?.jwt, undefined)
        done()
      })
  })

  it("Valid login", function(done) {
    agent
      .post(`${host}/api/v1/login`)
      .send({"username":"admin", "password": "0"})
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        assert.notStrictEqual( res?.body?.data?.jwt, undefined)
        done()
      })
  })
})

describe("Users endpoints", function() {

  it("Get user unauthorized", function(done) {
    agent
      .get(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${userJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 403)
        done()
      })
  })

  it("Get user list", function(done) {
    agent
      .get(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        done()
      })
  })

  it("Get user", function(done) {
    agent
      .get(`${host}/api/v1/users/0`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        done()
      })
  })

  it("Create and remove user", function(done) {
    var data = userCreateData
    data.login = `${data.login}_t1`

    agent
    .post(`${host}/api/v1/users`)
    .set("Authorization",`Bearer ${adminJWT}`)
    .send(data)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      var userId = res.body.data.id

      agent
      .delete(`${host}/api/v1/users/${userId}`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)

        done()
      })
    })
  })

  it("Update user", function(done) {
    var data = userCreateData
    data.login = `${data.login}_t2`

    agent
    .post(`${host}/api/v1/users`)
    .set("Authorization",`Bearer ${adminJWT}`)
    .send(data)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      const userId = res.body.data.id

      agent
      .patch(`${host}/api/v1/users/${userId}`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .send({"firstname": "test2"})
      .end(function(err, res){

        const update = res.status

        agent
        .delete(`${host}/api/v1/users/${userId}`)
        .set("Authorization",`Bearer ${adminJWT}`)
        .end(function(err, res){

          assert.strictEqual( res.status, 200)
          assert.strictEqual( update, 200)
          done()
        })

      })
    })
  })
})

describe("User settings endpoints", function() {
  it("Set settings", function(done) {
    agent
    .post(`${host}/api/v1/users/0/settings`)
    .send([{"setting": "theme", "value": "dark"}])
    .set("Authorization",`Bearer ${adminJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      done()
    })
  })

  it("Get settings", function(done) {
    agent
    .post(`${host}/api/v1/users/0/settings`)
    .send([{"setting": "theme", "value": "dark"}])
    .set("Authorization",`Bearer ${adminJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)

      agent
      .get(`${host}/api/v1/users/0/settings`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        assert.doesNotThrow( ()=>{ res.body.data.length } )

        done()
      })
    })
  })
})

describe ( "One time tokens", ()=> {
  it("Create one time token bad data", (done)=>{
    agent
    .post(`${host}/api/v1/onetimetokens`)
    .send({data:'abc'})
    .set("Authorization",`Bearer ${userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 400)
      done()
    })
  })

  it("Create one time token", (done)=>{
    agent
    .post(`${host}/api/v1/onetimetokens`)
    .send({data:'abc', hours: 1})
    .set("Authorization",`Bearer ${userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      done()
    })
  })

  it("Get one time token", (done)=>{
    agent
    .post(`${host}/api/v1/onetimetokens`)
    .send({data:'abc', hours: 1})
    .set("Authorization",`Bearer ${userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      const tokenid = res.body.data.token

      agent
      .get(`${host}/api/v1/onetimetokens/${tokenid}`)
      .set("Authorization",`Bearer ${userJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        assert.strictEqual( res.body.data, "abc")
        done()
      })
    })
  })

  it("Get one time token twice", (done)=>{
    agent
    .post(`${host}/api/v1/onetimetokens`)
    .send({data:'abc', hours: 1})
    .set("Authorization",`Bearer ${userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      const tokenid = res.body.data.token

      agent
      .get(`${host}/api/v1/onetimetokens/${tokenid}`)
      .set("Authorization",`Bearer ${userJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        assert.strictEqual( res.body.data, "abc")

        agent
        .get(`${host}/api/v1/onetimetokens/${tokenid}`)
        .set("Authorization",`Bearer ${userJWT}`)
        .end(function(err, res){
          assert.strictEqual( res.status, 404)

          done()
        })
      })
    })
  })

})

describe ("Items endpoints", ()=> {
  it("List item", function(done) {
    agent
    .post(`${host}/api/v1/folders/sample1/items`)
    .set("Authorization",`Bearer ${userJWT}`)
    .send(itemCreateData)
    .end(function(err,res) {
      assert.strictEqual(res.status, 201)
      const itemid = res.body.data.id

      agent
      .get(`${host}/api/v1/items?search`)
      .set("Authorization",`Bearer ${userJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        done()
      })
    })
  })

  it("Create, update and remove item", function(done) {
    agent
    .post(`${host}/api/v1/folders/sample1/items`)
    .set("Authorization",`Bearer ${userJWT}`)
    .send(itemCreateData)
    .end(function(err,res) {
      assert.strictEqual(res.status, 201)
      const itemid = res.body.data.id

      agent
      .patch(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${userJWT}`)
      .send({metadata: "test"})
      .end(function(err, res){
        assert.strictEqual( res.status, 200)

        agent
        .delete(`${host}/api/v1/items/${itemid}`)
        .set("Authorization",`Bearer ${userJWT}`)
        .end(function(err, res){
          assert.strictEqual( res.status, 200)

          done()
        })
      })
    })
  })

  it("Update item, bad type", function(done) {
    agent
    .post(`${host}/api/v1/folders/sample1/items`)
    .set("Authorization",`Bearer ${userJWT}`)
    .send(itemCreateData)
    .end(function(err,res) {
      assert.strictEqual(res.status, 201)
      const itemid = res.body.data.id

      agent
      .patch(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${userJWT}`)
      .send({type: "test"})
      .end(function(err, res){
        assert.strictEqual( res.status, 422)

        agent
        .delete(`${host}/api/v1/items/${itemid}`)
        .set("Authorization",`Bearer ${userJWT}`)
        .end(function(err, res){
          assert.strictEqual( res.status, 200)

          done()
        })
      })
    })
  })

})

describe("Item types", ()=>{
  it("Get item type", (done)=>{
    agent
    .post(`${host}/api/v1/itemtypes`)
    .set("Authorization",`Bearer ${adminJWT}`)
    .send({description:"test", icon:"fa-icon"})
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      var itemtypeId = res.body.data.id

      agent
      .get(`${host}/api/v1/itemtypes/${itemtypeId}`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        done()
      })
    })
  })

  it("Get unauthorized", (done)=>{
    agent
    .get(`${host}/api/v1/itemtypes/0`)
    .set("Authorization",`Bearer ${userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 403)
      done()
    })
  })

  it("Create and remove", (done)=>{
    agent
    .post(`${host}/api/v1/itemtypes`)
    .set("Authorization",`Bearer ${adminJWT}`)
    .send({description:"test", icon:"fa-icon"})
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      var itemtypeId = res.body.data.id

      agent
      .delete(`${host}/api/v1/itemtypes/${itemtypeId}`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)

        done()
      })
    })
  })

  it("Create itemtype unauthorized", (done)=>{
    agent
      .post(`${host}/api/v1/itemtypes`)
      .set("Authorization",`Bearer ${userJWT}`)
      .send({description:"test", icon:"fa-icon"})
      .end(function(err, res){
        assert.strictEqual( res.status, 403)
        done()
      })
  })

  it("Update itemtype", (done)=>{
    agent
    .post(`${host}/api/v1/itemtypes`)
    .set("Authorization",`Bearer ${adminJWT}`)
    .send({description:"test", icon:"fa-icon"})
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      var itemtypeId = res.body.data.id

      agent
      .patch(`${host}/api/v1/itemtypes/${itemtypeId}`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .send({description:"test", icon:"fa-icon"})
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        done()
      })
    })
  })

  it("Update itemtype unauthorized", (done)=>{
    agent
      .patch(`${host}/api/v1/itemtypes/0`)
      .set("Authorization",`Bearer ${userJWT}`)
      .send({description:"test", icon:"fa-icon"})
      .end(function(err, res){
        assert.strictEqual( res.status, 403)
        done()
      })
  })

  it("Update itemtype bad data", (done)=>{
    agent
      .patch(`${host}/api/v1/itemtypes/0`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .send({icon:"fa-icon"})
      .end(function(err, res){
        assert.strictEqual( res.status, 400)
        done()
      })
  })

  it("Create itemtype bad data", (done)=>{
    agent
      .post(`${host}/api/v1/itemtypes`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .send({icon:"fa-icon"})
      .end(function(err, res){
        assert.strictEqual( res.status, 400)
        done()
      })
  })

  it("List itemtype", (done)=>{
    agent
      .get(`${host}/api/v1/itemtypes/?search=e`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        done()
      })
  })

})

})