require("./common.js")

describe("Folders", function() {
  it("Get folder", async()=>{
    const res1 = await agent
      .get(`${host}/api/v1/folders/sample1`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 200)
  })

  it("Get folder, unexistent", async()=>{
    const res1 = await agent
      .get(`${host}/api/v1/folders/000`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 404)
  })

  it("Create, update and delete folder", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const folder = res1.body.data.id

    const res2 = await agent
      .patch(`${host}/api/v1/folders/${folder}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send({ description: "updated" })
      .catch(v=>v)

    assert.strictEqual(res2.status, 200)

    const res3 = await agent
      .delete(`${host}/api/v1/folders/${folder}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res3.status, 200)
  })

  it("Create, unauthorized", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/0/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 403)
  })

  it("Delete non empty folder", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)

    const res2 = await agent
      .delete(`${host}/api/v1/folders/sample1`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res2.status, 422)
  })

})
