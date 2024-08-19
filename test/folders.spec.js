require("./common.js")

describe("Folders", function() {
  it("Create, update and delete folder", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)

    assert.strictEqual(res1.status, 201)
    const folder = res1.body.data.id

    const res2 = await agent
      .patch(`${host}/api/v1/folders/${folder}`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send({ description: "updated" })

    assert.strictEqual(res2.status, 200)

    const res3 = await agent
      .delete(`${host}/api/v1/folders/${folder}`)
      .set("Authorization",`Bearer ${global.userJWT}`)

    assert.strictEqual(res3.status, 200)
  })

  it("Create, unauthorized", async()=>{
    try {
      const res1 = await agent
        .post(`${host}/api/v1/folders/0/folders`)
        .set("Authorization",`Bearer ${global.userJWT}`)
        .send(global.folderCreateData)

      throw("Failed, folder created")
    } catch (err) {
      assert.strictEqual(err.status, 403)
    }
  })

  it("Delete non empty folder", async()=>{
    const res1 = await agent
      .post(`${host}/api/v1/folders/sample1/folders`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .send(global.folderCreateData)

    assert.strictEqual(res1.status, 201)

    try {
      const res2 = await agent
        .delete(`${host}/api/v1/folders/sample1`)
        .set("Authorization",`Bearer ${global.userJWT}`)

        throw("Failed, folder deleted")
    } catch ( err ) {
      assert.strictEqual(err.status, 422)
    }
  })

})
