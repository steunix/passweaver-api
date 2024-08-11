require("./common.js")

describe("User settings", function() {
  it("Set settings", function(done) {
    agent
    .post(`${host}/api/v1/users/0/settings`)
    .send([{"setting": "theme", "value": "dark"}])
    .set("Authorization",`Bearer ${global.adminJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      done()
    })
  })

  it("Get settings", function(done) {
    agent
    .post(`${host}/api/v1/users/0/settings`)
    .send([{"setting": "theme", "value": "dark"}])
    .set("Authorization",`Bearer ${global.adminJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)

      agent
      .get(`${host}/api/v1/users/0/settings`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        assert.doesNotThrow( ()=>{ res.body.data.length } )

        done()
      })
    })
  })

  it("Set settings unauthorized", function(done) {
    agent
    .post(`${host}/api/v1/users/0/settings`)
    .send([{"setting": "theme", "value": "dark"}])
    .set("Authorization",`Bearer ${global.userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 403)

      done()
    })
  })

  it("Get settings unauthorized", function(done) {
    agent
    .get(`${host}/api/v1/users/0/settings`)
    .set("Authorization",`Bearer ${global.userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 403)

      done()
    })
  })
})

