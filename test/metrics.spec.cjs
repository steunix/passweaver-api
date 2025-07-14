/* global describe, it, agent, assert */

require('./common.cjs')

describe('Metrics', function () {
  it('Get metrics', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/metrics`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
    assert.match(res1.text, /.+/)
  })
})
