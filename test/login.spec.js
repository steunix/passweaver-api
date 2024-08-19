require("./common.js")

describe("Login", function() {
  it("Login bad data", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/login`)
      .catch(v=>v)

    assert.strictEqual( res1.status, 400)
    assert.strictEqual( res1?.body?.data?.jwt, undefined)
  })

  it("Invalid login", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/login`)
      .send({"username":"admin", "password": "1"})
      .catch(v=>v)

    assert.strictEqual( res1.status, 401)
    assert.strictEqual( res1?.body?.data?.jwt, undefined)
  })

  it("Valid login", async()=> {
    const res1 = await agent
      .post(`${host}/api/v1/login`)
      .send({"username":"admin", "password": "0"})
      .catch(v=>v)

    assert.strictEqual(res1.status, 200)
    assert.notStrictEqual(res1?.body?.data?.jwt, undefined)
  })
})
