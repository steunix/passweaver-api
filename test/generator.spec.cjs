/* global describe, it, agent, assert */

require('./common.cjs')

describe('Generator', function () {
  it('Generate password with symbols', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/util/generatepassword?length=25`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
    assert.strictEqual(res1.body.data.password.length, 25)
  })

  it('Generate password without symbols', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/util/generatepassword?length=25&symbols=false`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
    assert.strictEqual(res1.body.data.password.length, 25)
  })
})
