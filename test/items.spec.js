require("./common.js")

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

    assert.strictEqual(res1.status, 401)
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
      .send({type: "test"})
      .catch(v=>v)

    assert.strictEqual( res2.status, 422)

    const res3 = await agent
      .delete(`${host}/api/v1/items/${itemid}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual( res3.status, 200)
  })

  it("Get item, unexistent", async()=>{
    const res1 = await agent
      .patch(`${host}/api/v1/items/000`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send({type: "test"})
      .catch(v=>v)

    assert.strictEqual( res1.status, 404)
  })
})