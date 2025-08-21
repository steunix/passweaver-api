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

  it('Should create labeled counters for per-KMS metrics', async () => {
    // This test verifies that the metrics module can create and use labeled counters
    // for per-KMS tracking without requiring the full application setup

    const { init, createCounter, counterInc, output } = await import('../lib/metrics.mjs')
    const { METRICS_KMS_ENCRYPTIONS_PER_KMS, METRICS_KMS_DECRYPTIONS_PER_KMS } = await import('../lib/const.mjs')

    // Initialize metrics
    init()

    // Create the per-KMS counters with single label
    createCounter(METRICS_KMS_ENCRYPTIONS_PER_KMS, 'Encryptions per KMS', 'kms_description')
    createCounter(METRICS_KMS_DECRYPTIONS_PER_KMS, 'Decryptions per KMS', 'kms_description')

    // Increment counters with different KMS descriptions
    counterInc(METRICS_KMS_ENCRYPTIONS_PER_KMS, 'Test Local File KMS')
    counterInc(METRICS_KMS_DECRYPTIONS_PER_KMS, 'Test Google Cloud KMS')

    // Get metrics output
    const metricsOutput = await output()

    // Verify the metrics exist and have the correct labels
    assert.match(metricsOutput, /kms_encryptions_per_kms_total/, 'Per-KMS encryption metric should exist')
    assert.match(metricsOutput, /kms_decryptions_per_kms_total/, 'Per-KMS decryption metric should exist')
    assert.match(metricsOutput, /kms_description="Test Local File KMS"/, 'Should have kms_description label for local file')
    assert.match(metricsOutput, /kms_description="Test Google Cloud KMS"/, 'Should have kms_description label for google cloud')
  })
})
