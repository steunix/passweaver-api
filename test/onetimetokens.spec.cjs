require("./common.cjs")

describe ( "One time tokens", ()=> {
  it("Create one time token bad data", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/onetimetokens`)
      .send({data:'abc'})
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 400)
  })

  it("Create one time token, empty data", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/onetimetokens`)
      .send({data:''})
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 400)
  })

  it("Create one time token", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/onetimetokens`)
      .send({data:'abc', hours: 1})
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 201)
  })

  it("Create one time token, over hours limit", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/onetimetokens`)
      .send({data:'abc', hours: 1000})
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 400)
  })

  it("Get one time token", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/onetimetokens`)
      .send({data:'abc', hours: 1})
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const tokenid = res1.body.data.token

    const res2 = await agent
      .get(`${host}/api/v1/onetimetokens/${tokenid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res2.status, 200)
    assert.strictEqual(res2.body.data, "abc")
  })

  it("Get one time token twice", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/onetimetokens`)
      .send({data:'abc', hours: 1})
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const tokenid = res1.body.data.token

    const res2 = await agent
      .get(`${host}/api/v1/onetimetokens/${tokenid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res2.status, 200)
    assert.strictEqual( res2.body.data, "abc")

    const res3 = await agent
      .get(`${host}/api/v1/onetimetokens/${tokenid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res3.status, 404)
  })

})