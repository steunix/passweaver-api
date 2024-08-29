require("./common.js")

describe ( "Folders permissions", ()=> {
  it("Create, change and remove folders permissions", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const folder = res1.body.data.id

    // Add permissions to Everyone
    const res2 = await agent
      .post(`${host}/api/v1/folders/${folder}/groups/E`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({read: true, write: true})
      .catch(v=>v)
    assert.strictEqual(res2.status, 200)

    // Change to readonly
    const res4 = await agent
      .patch(`${host}/api/v1/folders/${folder}/groups/E`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({read: true, write: false})
      .catch(v=>v)
    assert.strictEqual(res4.status, 200)

    // Change to no access
    const res5 = await agent
      .patch(`${host}/api/v1/folders/${folder}/groups/E`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({read: false, write: false})
      .catch(v=>v)
    assert.strictEqual(res5.status, 200)

    const res6 = await agent
      .delete(`${host}/api/v1/folders/${folder}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res6.status, 200)
  })

  it("Create folders permissions, invalid permissions", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const folder = res1.body.data.id

    // Add permissions to Everyone
    const res2 = await agent
      .post(`${host}/api/v1/folders/${folder}/groups/E`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({read: false, write: true})
      .catch(v=>v)
    assert.strictEqual(res2.status, 422)

    const res6 = await agent
      .delete(`${host}/api/v1/folders/${folder}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res6.status, 200)
  })

  it("Update folders permissions, invalid permissions", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const folder = res1.body.data.id

    // Add permissions to Everyone
    const res2 = await agent
      .post(`${host}/api/v1/folders/${folder}/groups/E`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({read: true, write: true})
      .catch(v=>v)
    assert.strictEqual(res2.status, 200)

    // Invalid permissions
    const res3 = await agent
      .post(`${host}/api/v1/folders/${folder}/groups/E`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({read: false, write: true})
      .catch(v=>v)
    assert.strictEqual(res3.status, 422)

    const res6 = await agent
      .delete(`${host}/api/v1/folders/${folder}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res6.status, 200)
  })

  it("Add permissions, bad data", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const folder = res1.body.data.id

    // Add permissions to Everyone
    const res2 = await agent
      .post(`${host}/api/v1/folders/${folder}/groups/E`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({read: true})
      .catch(v=>v)

    assert.strictEqual(res2.status, 400)

    const res3 = await agent
      .delete(`${host}/api/v1/folders/${folder}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res3.status, 200)
  })

  it("Add duplicate group permissions", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const folder = res1.body.data.id

    // Add permissions to Everyone
    const res2 = await agent
      .post(`${host}/api/v1/folders/${folder}/groups/E`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({read: true, write: true})
      .catch(v=>v)
    assert.strictEqual(res2.status, 200)

    // Readd permissions to Everyone
    const res3 = await agent
      .post(`${host}/api/v1/folders/${folder}/groups/E`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({read: true, write: true})
      .catch(v=>v)
    assert.strictEqual(res3.status, 422)

    const res4 = await agent
      .delete(`${host}/api/v1/folders/${folder}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res4.status, 200)
  })

  it("Delete unexistent permissions", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const folder = res1.body.data.id

    // Delete permissions for unexistent Everyone
    const res2 = await agent
      .delete(`${host}/api/v1/folders/${folder}/groups/E`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)
    assert.strictEqual(res2.status, 404)

    const res4 = await agent
      .delete(`${host}/api/v1/folders/${folder}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res4.status, 200)
  })
})