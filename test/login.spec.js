require("./common.js")

describe("Login", function() {
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
