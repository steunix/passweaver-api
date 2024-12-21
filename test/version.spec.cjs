/* global describe, it, agent, assert */

require('./common.cjs')

describe('Version', function () {
  it('Get version', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/version/`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
    assert(typeof res1.body?.version, 'string')
  })
})
