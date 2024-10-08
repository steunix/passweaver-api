/* global describe, it, agent, assert */

require('./common.cjs')

describe('Personal folders', function () {
  it('Set personal password', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('Unlock personal folders', async () => {
    // Set personal password. Ignore the error, the password could be already set
    await agent
      .post(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    const res2 = await agent
      .post(`${global.host}/api/v1/personal/unlock`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
    assert(Object.hasOwn(res2.body.data, 'jwt'))
  })
})
