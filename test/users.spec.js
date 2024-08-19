require("./common.js")

describe("Users", function() {

  it("Create and remove user", async()=> {
    var data = { ...userCreateData }
    var rnd = (new Date%9e6).toString(36)
    data.login = `${data.login}_${rnd}`

    const res1 = await agent
      .post(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v=>v)

    assert.strictEqual( res1.status, 201)
    var userId = res1.body.data.id

    const res2 = await agent
      .delete(`${host}/api/v1/users/${userId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual(res2.status, 200)
  })

  it("Create duplicate login", async()=> {
    var data = { ...userCreateData }
    var rnd = (new Date%9e6).toString(36)
    data.login = `${data.login}_${rnd}`

    const res1 = await agent
      .post(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v=>v)

    assert.strictEqual( res1.status, 201)
    data.login = data.login.toUpperCase()
    var userId = res1.body.data.id

    const res2 = await agent
      .post(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v=>v)
      .catch(v=>v)

    assert.strictEqual( res2.status, 400)

    const res3 = await agent
      .delete(`${host}/api/v1/users/${userId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res3.status, 200)
  })

  it("Get user unauthorized", async()=> {
    const res1 = await agent
      .get(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 403)
  })

  it("Get user unexistent", async()=> {
    const res1 = await agent
      .get(`${host}/api/v1/users/000`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 404 )
  })

  it("Get user list", async()=> {
    const res1 = await agent
      .get(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 200)
  })

  it("Get user", async()=> {
    const res1 = await agent
      .get(`${host}/api/v1/users/0`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 200)
  })

  it("Update user", async()=> {
    var data = userCreateData
    var rnd = (new Date%9e6).toString(36)
    data.login = `${data.login}_${rnd}`

    const res1 = await agent
      .post(`${host}/api/v1/users`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v=>v)

    assert.strictEqual( res1.status, 201)
    const userId = res1.body.data.id

    const res2 = await agent
      .patch(`${host}/api/v1/users/${userId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({"firstname": "test2"})
      .catch(v=>v)

    assert.strictEqual( res2.status, 200)

    const res3 = await agent
      .delete(`${host}/api/v1/users/${userId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res3.status, 200)
  })

  it("Update user, unexistent", async()=> {
    const res1 = await agent
      .patch(`${host}/api/v1/users/000`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({"firstname": "test2"})
      .catch(v=>v)

    assert.strictEqual( res1.status, 404)
  })

})
