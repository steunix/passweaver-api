require("./common.js")

describe("Groups", function() {
  it("Get group", async()=>{
    const res1 = await agent
      .get(`${host}/api/v1/groups/0`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 200)
  })

  it("Get group, unexistent", async()=>{
    const res1 = await agent
      .get(`${host}/api/v1/groups/000`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 404)
  })

  it("Create, update and delete group", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/groups/0/groups`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send(global.groupCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const group = res1.body.data.id

    const res2 = await agent
      .patch(`${host}/api/v1/groups/${group}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send({ description: "updated" })
      .catch(v=>v)

    assert.strictEqual(res2.status, 200)

    const res3 = await agent
      .delete(`${host}/api/v1/groups/${group}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)

    assert.strictEqual(res3.status, 200)
  })

  it("Create, unauthorized", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/groups/0/groups`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.groupCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 403)
  })

  it("Delete non empty group", async()=>{
    // Create group
    const res1 = await agent
      .post(`${host}/api/v1/groups/0/groups`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const group = res1.body.data.id

    // Add admin
    const res2 = await agent
      .post(`${host}/api/v1/groups/${group}/users/0`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)
    assert.strictEqual(res2.status, 200)

    // Delete group
    const res3 = await agent
      .delete(`${host}/api/v1/groups/${group}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual(res3.status, 422)

    // Cleanup
    const res4 = await agent
      .delete(`${host}/api/v1/groups/${group}/users/0`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)
    assert.strictEqual(res4.status, 200)

    const res5 = await agent
      .delete(`${host}/api/v1/groups/${group}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual(res5.status, 200)
  })

  it("Add member, unauthorized", async()=>{
    // Create group
    const res1 = await agent
      .post(`${host}/api/v1/groups/0/groups`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .send(global.folderCreateData)
      .catch(v=>v)

    assert.strictEqual(res1.status, 201)
    const group = res1.body.data.id

    // Add admin
    const res2 = await agent
      .post(`${host}/api/v1/groups/${group}/users/0`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)
    assert.strictEqual(res2.status, 403)

    // Cleanup
    const res5 = await agent
      .delete(`${host}/api/v1/groups/${group}`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual(res5.status, 200)
  })
})
