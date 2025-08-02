/* global describe, it, agent, assert */

require('./common.cjs')

describe('API keys', () => {
  it('Create, get and delete API key', async () => {
    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true, ipwhitelist: '192.160.0.0/24,fd44:9ba1:1234:aa1b::/64' })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id

    const res2 = await agent
      .get(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)

    const res3 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Create API key bad data', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01' })
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
  })

  it('Create API key bad IP whitelist', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true, ipwhitelist: 'abc' })
      .catch(v => v)
    assert.strictEqual(res1.status, 400)

    const res2 = await agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true, ipwhitelist: '192.168.0.0/24,abc' })
      .catch(v => v)
    assert.strictEqual(res2.status, 400)

    const res3 = await agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true, ipwhitelist: '192.168.0.0/24,a084:1e02:3852:e9f7:9a21' })
      .catch(v => v)
    assert.strictEqual(res3.status, 400)
  })

  it('Create API key bad user', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: 'zzz', expiresat: '2050-01-01', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
  })

  it('Create API key unauthorized', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01' })
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Get API key, unauthorized', async () => {
    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id

    const res2 = await agent
      .get(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 403)

    const res3 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Get API key unexistent', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/apikeys/0197d44b-96b2-7602-9dda-dfed2a59e862`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 404)
  })

  it('Update API key', async () => {
    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ active: false, userid: '0' })
      .catch(v => v)

    assert.strictEqual(res2.status, 200)

    const res3 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Update API key unauthorized', async () => {
    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ active: false, userid: '0' })
      .catch(v => v)

    assert.strictEqual(res2.status, 403)

    const res3 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('List API keys', async () => {
    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id

    const res2 = await agent
      .get(`${global.host}/api/v1/apikeys/`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
    const res3 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('List API keys, unauthorized', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/apikeys/`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })
})
