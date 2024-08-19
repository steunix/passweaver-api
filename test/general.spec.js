require("./common.js")

describe("General", function() {
  it("Bad path", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/000`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 500)
  })
})
