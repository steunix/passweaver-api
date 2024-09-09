require("./common.cjs")

describe("Utils", function() {

  it("Reset cache", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/util/clearcache`)
      .set("Authorization",`Bearer ${global.adminJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 200)
  })

  it("Reset cache, unauthorized", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/util/clearcache`)
      .set("Authorization",`Bearer ${global.userJWT}`)
      .catch(v=>v)

    assert.strictEqual(res1.status, 403)
  })

})
