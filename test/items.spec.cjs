require("./common.cjs")

describe ("Items", ()=> {
  it("Create, update and remove item", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/items`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .patch(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send({metadata: "test"})
      .catch(v=>v)

    assert.strictEqual( res2.status, 200)

    const res3 = await agent
      .delete(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res3.status, 200)
  })

  it("Create item, bad data", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/items`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.itemCreateDataBad)
      .catch(v=>v)

    assert.strictEqual(res1.status, 400)
  })

  it("Create item, unexistent folder", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/000/items`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 404)
  })

  it("Create item, unauthorized", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample2/items`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 403)
  })

  it("Create item, system folders", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/0/items`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 422)

    const res2 = await agent
      .post(`${host}/api/v1/folders/P/items`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v=>v)

    assert.strictEqual(res2.status, 422)
  })

  it("List items in folder", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/items`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .get(`${host}/api/v1/items?search`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res2.status, 200)
  })

  it("Update item, bad type", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/items`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .patch(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send({type: "01918da0-9777-7486-8aa4-aa989d5047d7"})
      .catch(v=>v)

    assert.strictEqual( res2.status, 422)

    const res3 = await agent
      .delete(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res3.status, 200)
  })

  it("Update item, bad data", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/items`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .patch(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send({"title":""})
      .catch(v=>v)

    assert.strictEqual( res2.status, 400)

    const res3 = await agent
      .delete(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res3.status, 200)
  })

  it("Get item, unexistent", async()=>{
    const res1 = await agent
      .get(`${host}/api/v1/items/000`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 404)
  })

  it("Get item activity desc", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/items`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .get(`${host}/api/v1/items/${itemid}/activity`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res2.status, 200)
    assert(res2.body.data.length > 0)

    const res3 = await agent
      .delete(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res3.status, 200)
  })

  it("Get item activity asc", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/items`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .get(`${host}/api/v1/items/${itemid}/activity?sort=1`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual( res2.status, 200)
    assert(res2.body.data.length > 0)

    const res3 = await agent
      .delete(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res3.status, 200)
  })
})