require("./common.cjs")

describe("Item types", ()=>{
  it("Create, get and delete item type", async()=>{
    const res1 = await global.agent
      .post(`${global.host}/api/v1/itemtypes`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({description:"test", icon:"fa-icon"})
      .catch(v=>v)

    assert.strictEqual( res1.status, 201)
    var itemtypeId = res1.body.data.id

    const res2 = await agent
      .get(`${global.host}/api/v1/itemtypes/${itemtypeId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res2.status, 200)

    const res3 = await agent
      .delete(`${global.host}/api/v1/itemtypes/${itemtypeId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res3.status, 200)
  })

  it("Create item type bad data", async()=>{
    const res1 = await agent
      .post(`${global.host}/api/v1/itemtypes`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({icon:"fa-icon"})
      .catch(v=>v)

    assert.strictEqual( res1.status, 400)
  })

  it("Create item type unauthorized", async()=>{
    const res1 = await agent
      .post(`${global.host}/api/v1/itemtypes`)
      .set("Authorization",`Bearer ${userJWT}`)
      .send({description:"test", icon:"fa-icon"})
      .catch(v=>v)

    assert.strictEqual( res1.status, 403)
  })

  it("Get item type, unauthorized", async()=>{
    const res1 = await agent
      .get(`${global.host}/api/v1/itemtypes/0`)
      .set("Authorization",`Bearer ${userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 403)
  })

  it("Get item type unexistent", async()=>{
    const res1 = await agent
      .get(`${global.host}/api/v1/itemtypes/01918da0-9777-7486-8aa4-aa989d5047d7`)
      .set("Authorization",`Bearer ${adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 404)
  })

  it("Update item type", async()=>{
    const res1 = await agent
      .post(`${global.host}/api/v1/itemtypes`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({description:"test", icon:"fa-icon"})
      .catch(v=>v)

    assert.strictEqual( res1.status, 201)
    var itemtypeId = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/itemtypes/${itemtypeId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({description:"test", icon:"fa-icon"})
      .catch(v=>v)

    assert.strictEqual( res2.status, 200)

    const res3 = await agent
      .delete(`${global.host}/api/v1/itemtypes/${itemtypeId}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res3.status, 200)
  })

  it("Update item type unauthorized", async()=>{
    const res1 = await agent
      .patch(`${global.host}/api/v1/itemtypes/0`)
      .set("Authorization",`Bearer ${userJWT}`)
      .send({description:"test", icon:"fa-icon"})
      .catch(v=>v)

    assert.strictEqual( res1.status, 403)
  })

  it("Update item type bad data", async()=>{
    const res1 = await agent
      .patch(`${global.host}/api/v1/itemtypes/0`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({icon:"fa-icon"})
      .catch(v=>v)

    assert.strictEqual( res1.status, 400)
  })

  it("List item types", async()=>{
    const res1 = await agent
      .get(`${global.host}/api/v1/itemtypes/`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 200)
  })

})
