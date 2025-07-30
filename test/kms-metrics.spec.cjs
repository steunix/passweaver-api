/* global describe, it, assert */
require('./common.cjs')

// Test for the new per-KMS metrics functionality
describe('KMS Per-KMS Metrics', function () {
  it('Should create labeled counters for per-KMS metrics', async () => {
    // This test verifies that the metrics module can create and use labeled counters
    // for per-KMS tracking without requiring the full application setup
    
    const { init, createCounter, counterInc, output } = await import('../lib/metrics.mjs')
    const { METRICS_KMS_ENCRYPTIONS_PER_KMS, METRICS_KMS_DECRYPTIONS_PER_KMS } = await import('../lib/const.mjs')
    
    // Initialize metrics
    init()
    
    // Create the per-KMS counters with labels
    createCounter(METRICS_KMS_ENCRYPTIONS_PER_KMS, 'Encryptions per KMS', '', ['kms_id', 'kms_description'])
    createCounter(METRICS_KMS_DECRYPTIONS_PER_KMS, 'Decryptions per KMS', '', ['kms_id', 'kms_description'])
    
    // Increment counters with different KMS labels
    counterInc(METRICS_KMS_ENCRYPTIONS_PER_KMS, '', {
      kms_id: 'test-kms-1',
      kms_description: 'Test Local File KMS'
    })
    
    counterInc(METRICS_KMS_DECRYPTIONS_PER_KMS, '', {
      kms_id: 'test-kms-2', 
      kms_description: 'Test Google Cloud KMS'
    })
    
    // Get metrics output
    const metricsOutput = await output()
    
    // Verify the metrics exist and have the correct labels
    assert.match(metricsOutput, /kms_encryptions_per_kms_total/, 'Per-KMS encryption metric should exist')
    assert.match(metricsOutput, /kms_decryptions_per_kms_total/, 'Per-KMS decryption metric should exist')
    assert.match(metricsOutput, /kms_id="test-kms-1"/, 'Should have kms_id label')
    assert.match(metricsOutput, /kms_description="Test Local File KMS"/, 'Should have kms_description label')
    assert.match(metricsOutput, /kms_id="test-kms-2"/, 'Should have second kms_id label')
    assert.match(metricsOutput, /kms_description="Test Google Cloud KMS"/, 'Should have second kms_description label')
  })
})