/* global describe, it, agent, assert */

require('./common.cjs')

describe('Generator', function () {
  it('Generator', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/util/generatepassword`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })
})
