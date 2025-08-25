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

  it('Check global metrics', async () => {
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
    assert.match(res1.text, /login_apikeys_per_key_total/)
  })

  it('Check per-KMS metrics', async () => {
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

  it('Check per-API metrics', async () => {
    // This test verifies that the metrics module can create and use labeled counters
    // for per-API key tracking without requiring the full application setup

    const { init, createCounter, counterInc, output } = await import('../lib/metrics.mjs')
    const { METRICS_LOGIN_APIKEYS_PER_KEY } = await import('../lib/const.mjs')

    // Initialize metrics
    init()

    // Create the per-API key counter with single label
    createCounter(METRICS_LOGIN_APIKEYS_PER_KEY, 'Login per API key', 'apikey_description')

    // Increment counters with different API key descriptions
    counterInc(METRICS_LOGIN_APIKEYS_PER_KEY, 'Test API Key 1')
    counterInc(METRICS_LOGIN_APIKEYS_PER_KEY, 'Test API Key 2')
    counterInc(METRICS_LOGIN_APIKEYS_PER_KEY, 'Test API Key 1') // Increment again to test counting

    // Get metrics output
    const metricsOutput = await output()

    // Verify the metrics exist and have the correct labels and counts
    assert.match(metricsOutput, /login_apikeys_per_key_total/, 'Per-API key login metric should exist')
    assert.match(metricsOutput, /apikey_description="Test API Key 1"/, 'Should have apikey_description label for Test API Key 1')
    assert.match(metricsOutput, /apikey_description="Test API Key 2"/, 'Should have apikey_description label for Test API Key 2')
    assert.match(metricsOutput, /login_apikeys_per_key_total{apikey_description="Test API Key 1"} 2/, 'Test API Key 1 should have count of 2')
    assert.match(metricsOutput, /login_apikeys_per_key_total{apikey_description="Test API Key 2"} 1/, 'Test API Key 2 should have count of 1')
  })
})
