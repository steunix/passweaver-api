require("./common.js")

describe("Users endpoints", function() {

  it("Get user unauthorized", function(done) {
    agent
      .get(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 403)
        done()
      })
  })

  it("Get user list", function(done) {
    agent
      .get(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        done()
      })
  })

  it("Get user", function(done) {
    agent
      .get(`${host}/api/v1/users/0`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
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
    .set("Authorization",`Bearer ${global.adminJWT}`)
    .send(data)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      var userId = res.body.data.id

      agent
      .delete(`${host}/api/v1/users/${userId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)

        done()
      })
    })
  })

  it("Create duplicate login", function(done) {
    var data = userCreateData
    data.login = `${data.login}_t1`

    agent
    .post(`${host}/api/v1/users`)
    .set("Authorization",`Bearer ${global.adminJWT}`)
    .send(data)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      data.login = data.login.toUpperCase()

      agent
      .post(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send(data)
      .end(function(err, res){
        assert.strictEqual( res.status, 400)

        done()
      })
    })
  })

  it("Update user", function(done) {
    var data = userCreateData
    data.login = `${data.login}_t2`

    agent
    .post(`${host}/api/v1/users`)
    .set("Authorization",`Bearer ${global.adminJWT}`)
    .send(data)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      const userId = res.body.data.id

      agent
      .patch(`${host}/api/v1/users/${userId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({"firstname": "test2"})
      .end(function(err, res){

        const update = res.status

        agent
        .delete(`${host}/api/v1/users/${userId}`)
        .set("Authorization",`Bearer ${global.adminJWT}`)
        .end(function(err, res){

          assert.strictEqual( res.status, 200)
          assert.strictEqual( update, 200)
          done()
        })

      })
    })
  })
})
