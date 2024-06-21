require("./common.js")

describe ( "One time tokens", ()=> {
  it("Create one time token bad data", (done)=>{
    agent
    .post(`${host}/api/v1/onetimetokens`)
    .send({data:'abc'})
    .set("Authorization",`Bearer ${global.userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 400)
      done()
    })
  })

  it("Create one time token", (done)=>{
    agent
    .post(`${host}/api/v1/onetimetokens`)
    .send({data:'abc', hours: 1})
    .set("Authorization",`Bearer ${global.userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      done()
    })
  })

  it("Get one time token", (done)=>{
    agent
    .post(`${host}/api/v1/onetimetokens`)
    .send({data:'abc', hours: 1})
    .set("Authorization",`Bearer ${global.userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      const tokenid = res.body.data.token

      agent
      .get(`${host}/api/v1/onetimetokens/${tokenid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
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
    .set("Authorization",`Bearer ${global.userJWT}`)
    .end(function(err, res){
      assert.strictEqual( res.status, 201)
      const tokenid = res.body.data.token

      agent
      .get(`${host}/api/v1/onetimetokens/${tokenid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .end(function(err, res){
        assert.strictEqual( res.status, 200)
        assert.strictEqual( res.body.data, "abc")

        agent
        .get(`${host}/api/v1/onetimetokens/${tokenid}`)
        .set("Authorization",`Bearer ${global.userJWT}`)
        .end(function(err, res){
          assert.strictEqual( res.status, 404)

          done()
        })
      })
    })
  })

})