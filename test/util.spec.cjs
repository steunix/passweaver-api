/* global describe, it, agent, assert */

require('./common.cjs')

describe('Utils', function () {
  it('Reset cache', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/clearcache`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('Reset cache, unauthorized', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/clearcache`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Get info', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/util/info`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('Get info, unauthorized', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/util/info`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })
})
