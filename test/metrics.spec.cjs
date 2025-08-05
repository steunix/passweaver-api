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

    // Check that all metrics are present
    assert.match(res1.text, /login_users_total/)
    assert.match(res1.text, /login_apikeys_total/)
    assert.match(res1.text, /items_read_total/)
    assert.match(res1.text, /items_created_total/)
    assert.match(res1.text, /items_updated_total/)
    assert.match(res1.text, /items_deleted_total/)
    assert.match(res1.text, /onetimetokens_created_total/)
    assert.match(res1.text, /onetimetokens_read_total/)
    assert.match(res1.text, /kms_encryptions_total/)
    assert.match(res1.text, /kms_decryptions_total/)
    assert.match(res1.text, /kms_encryptions_per_kms_total/)
    assert.match(res1.text, /kms_decryptions_per_kms_total/)
  })
})
