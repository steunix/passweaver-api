/* global describe, it, agent, assert */

require('./common.cjs')

describe('General', function () {
  it('Bad path', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/000`)
      .catch(v => v)

    assert.strictEqual(res1.status, 500)
  })
})
