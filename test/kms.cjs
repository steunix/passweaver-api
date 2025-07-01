/* global describe, it, agent, assert */

require('./common.cjs')

describe('KMS', () => {
  it('Create, get and delete KMS', async () => {
    const res1 = await global.agent
      .post(`${global.host}/api/v1/kms`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ type: 0, description: 'test', config: '{ "key": "value" }', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const kmsId = res1.body.data.id

    const res2 = await agent
      .get(`${global.host}/api/v1/kms/${kmsId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)

    const res3 = await agent
      .delete(`${global.host}/api/v1/kms/${kmsId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Create KMS bad data', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/kms`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ type: 0 })
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
  })

  it('Create KMS unauthorized', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/kms`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ type: 0, description: 'test', config: '{ "key": "value" }', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Get KMS, unauthorized', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/kms/0`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Get KMS unexistent', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/kms/01918da0-9777-7486-8aa4-aa989d5047d7`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 404)
  })

  it('Update KMS', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/kms`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ type: 0, description: 'test', config: '{ "key": "value" }', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const kmsId = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/kms/${kmsId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test2', config: '{ "key": "value2" }' })
      .catch(v => v)

    assert.strictEqual(res2.status, 200)

    const res3 = await agent
      .delete(`${global.host}/api/v1/kms/${kmsId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Update KMS unauthorized', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/kms`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ type: 0, description: 'test', config: '{ "key": "value" }', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const kmsId = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/kms/${kmsId}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ description: 'test', config: '{ "key": "value" }' })
      .catch(v => v)

    assert.strictEqual(res2.status, 403)

    const res3 = await agent
      .delete(`${global.host}/api/v1/kms/${kmsId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res3.status, 200)
  })

  it('Update KMS bad data', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/kms`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ type: 0, description: 'test', config: '{ "key": "value" }', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const kmsId = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/kms/${kmsId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ type: 'aaa' })
      .catch(v => v)

    assert.strictEqual(res2.status, 400)

    const res3 = await agent
      .delete(`${global.host}/api/v1/kms/${kmsId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res3.status, 200)
  })

  it('List KMSs', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/kms/`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('List KMS, unauthorized', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/kms/`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })
})
