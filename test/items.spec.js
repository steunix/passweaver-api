require("./common.js")

describe ("Items", ()=> {
  it("List items", function(done) {
    agent
    .post(`${host}/api/v1/folders/sample1/items`)
    .set("Authorization",`Bearer ${global.userJWT}`)
    .send(global.itemCreateData)
    .end(function(err,res) {
      assert.strictEqual(res.status, 201)
      const itemid = res.body.data.id

      agent
      .get(`${host}/api/v1/items?search`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        done()
      })
    })
  })

  it("Create, update and remove item", function(done) {
    agent
    .post(`${host}/api/v1/folders/sample1/items`)
    .set("Authorization",`Bearer ${global.userJWT}`)
    .send(global.itemCreateData)
    .end(function(err,res) {
      assert.strictEqual(res.status, 201)
      const itemid = res.body.data.id

      agent
      .patch(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send({metadata: "test"})
      .end(function(err, res){
        assert.strictEqual( res.status, 200)

        agent
        .delete(`${host}/api/v1/items/${itemid}`)
        .set("Authorization",`Bearer ${global.userJWT}`)
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
    .set("Authorization",`Bearer ${global.userJWT}`)
    .send(global.itemCreateData)
    .end(function(err,res) {
      assert.strictEqual(res.status, 201)
      const itemid = res.body.data.id

      agent
      .patch(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send({type: "test"})
      .end(function(err, res){
        assert.strictEqual( res.status, 422)

        agent
        .delete(`${host}/api/v1/items/${itemid}`)
        .set("Authorization",`Bearer ${global.userJWT}`)
        .end(function(err, res){
          assert.strictEqual( res.status, 200)

          done()
        })
      })
    })
  })

})