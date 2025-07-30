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

  it('Check per-KMS metrics are included', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/metrics`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
    // Check that the new per-KMS metrics are included in the output
    assert.match(res1.text, /kms_encryptions_per_kms_total/)
    assert.match(res1.text, /kms_decryptions_per_kms_total/)
  })
})
