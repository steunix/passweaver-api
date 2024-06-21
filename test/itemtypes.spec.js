require("./common.js")

describe("Item types", ()=>{
  it("Get item type", (done)=>{
    global.agent
    .post(`${global.host}/api/v1/itemtypes`)
    .set("Authorization",`Bearer ${global.adminJWT}`)
    .send({description:"test", icon:"fa-icon"})
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      var itemtypeId = res.body.data.id

      agent
      .get(`${global.host}/api/v1/itemtypes/${itemtypeId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        done()
      })
    })
  })

  it("Get unauthorized", (done)=>{
    agent
    .get(`${global.host}/api/v1/itemtypes/0`)
    .set("Authorization",`Bearer ${userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 403)
      done()
    })
  })

  it("Create and remove", (done)=>{
    agent
    .post(`${global.host}/api/v1/itemtypes`)
    .set("Authorization",`Bearer ${global.adminJWT}`)
    .send({description:"test", icon:"fa-icon"})
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      var itemtypeId = res.body.data.id

      agent
      .delete(`${global.host}/api/v1/itemtypes/${itemtypeId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)

        done()
      })
    })
  })

  it("Create itemtype unauthorized", (done)=>{
    agent
      .post(`${global.host}/api/v1/itemtypes`)
      .set("Authorization",`Bearer ${userJWT}`)
      .send({description:"test", icon:"fa-icon"})
      .end(function(err, res){
        assert.strictEqual( res.status, 403)
        done()
      })
  })

  it("Update itemtype", (done)=>{
    agent
    .post(`${global.host}/api/v1/itemtypes`)
    .set("Authorization",`Bearer ${global.adminJWT}`)
    .send({description:"test", icon:"fa-icon"})
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      var itemtypeId = res.body.data.id

      agent
      .patch(`${global.host}/api/v1/itemtypes/${itemtypeId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({description:"test", icon:"fa-icon"})
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        done()
      })
    })
  })

  it("Update itemtype unauthorized", (done)=>{
    agent
      .patch(`${global.host}/api/v1/itemtypes/0`)
      .set("Authorization",`Bearer ${userJWT}`)
      .send({description:"test", icon:"fa-icon"})
      .end(function(err, res){
        assert.strictEqual( res.status, 403)
        done()
      })
  })

  it("Update itemtype bad data", (done)=>{
    agent
      .patch(`${global.host}/api/v1/itemtypes/0`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({icon:"fa-icon"})
      .end(function(err, res){
        assert.strictEqual( res.status, 400)
        done()
      })
  })

  it("Create itemtype bad data", (done)=>{
    agent
      .post(`${global.host}/api/v1/itemtypes`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({icon:"fa-icon"})
      .end(function(err, res){
        assert.strictEqual( res.status, 400)
        done()
      })
  })

  it("List itemtype", (done)=>{
    agent
      .get(`${global.host}/api/v1/itemtypes/?search=e`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        done()
      })
  })

})
