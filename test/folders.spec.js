require("./common.js")

describe("Folders", function() {
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

  it("Create, bad data", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/0/folders`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({})
      .catch(v=>v)

    assert.strictEqual(res1.status, 400)
  })

  it("Update, bad data", async()=>{
    const res1 = await agent
      .patch(`${host}/api/v1/folders/sample1`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({"description": ""})
      .catch(v=>v)

    assert.strictEqual(res1.status, 400)
  })

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

  it("Delete non empty folder", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const folder = res1.body.data.id

    const res2 = await agent
      .delete(`${host}/api/v1/folders/sample1`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res2.status, 422)

    const res3 = await agent
      .delete(`${host}/api/v1/folders/${folder}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res3.status, 200)
  })

  it("Delete folder, unauthorized", async()=>{
    const res1 = await agent
      .delete(`${host}/api/v1/folders/sample2`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 403)
  })

  it("Delete system folders, unprocessable", async()=>{
    const res1 = await agent
      .delete(`${host}/api/v1/folders/0`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 422)

    const res2 = await agent
      .delete(`${host}/api/v1/folders/P`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res2.status, 422)
  })

  it("Update system folders, unprocessable", async()=>{
    const res1 = await agent
      .delete(`${host}/api/v1/folders/0`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 422)

    const res2 = await agent
      .delete(`${host}/api/v1/folders/P`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res2.status, 422)
  })
})
