/* global describe, it, agent, assert */

require('./common.cjs')

describe('Login', function () {
  it('Login bad data', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/login`)
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
    assert.strictEqual(res1?.body?.data?.jwt, undefined)
  })

  it('Invalid login', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ username: 'admin', password: '1' })
      .catch(v => v)

    assert.strictEqual(res1.status, 401)
    assert.strictEqual(res1?.body?.data?.jwt, undefined)
  })

  it('Valid login', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ username: 'admin', password: '0' })
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
    assert.notStrictEqual(res1?.body?.data?.jwt, undefined)
  })

  it('Valid login via API', async function () {
    const data = { ...global.userCreateDataApiKey }
    const rnd = global.rnd()
    data.login = `${data.login}_${rnd}`

    const res0 = await agent
      .post(`${global.host}/api/v1/users`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v => v)
    assert.strictEqual(res0.status, 201)
    const userId = res0.body.data.id

    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: userId, expiresat: '2050-01-01', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id
    const secret = res1.body.data.secret

    const res2 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ apikey: apikId, secret })
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
    const jwt = res2.body.data.jwt

    const res3 = await agent
      .get(`${global.host}/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .catch(v => v)
    assert.strictEqual(res3.status, 200)

    const res4 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res4.status, 200)

    const res5 = await agent
      .delete(`${global.host}/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res5.status, 200)
  })

  it('Login via API, bad API key', async function () {
    const apikId = '0197d44b-96b2-7602-9dda-dfed2a59e862'
    const secret = '0197d44b-96b2-7602-9dda-dfed2a59e862'

    const res2 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ apikey: apikId, secret })
      .catch(v => v)

    assert.strictEqual(res2.status, 401)
  })

  it('Login via API, IP not whitelisted', async function () {
    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true, ipwhitelist: '1.1.1.1/32' })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id
    const secret = res1.body.data.secret

    const res2 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ apikey: apikId, secret })
      .catch(v => v)

    assert.strictEqual(res2.status, 401)

    const res3 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Login via API, time not whitelisted', async function () {
    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true, timewhitelist: 'SUN:0100-0200' })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id
    const secret = res1.body.data.secret

    const res2 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ apikey: apikId, secret })
      .catch(v => v)

    assert.strictEqual(res2.status, 401)

    const res3 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Login via API, bad secret', async function () {
    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id
    const secret = 'nosecret'

    const res2 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ apikey: apikId, secret })
      .catch(v => v)

    assert.strictEqual(res2.status, 401)

    const res4 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res4.status, 200)
  })

  it('Login via API, expired', async function () {
    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2020-01-01', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id
    const secret = res1.body.data.secret

    const res2 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ apikey: apikId, secret })
      .catch(v => v)

    assert.strictEqual(res2.status, 401)

    const res4 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res4.status, 200)
  })

  it('Login via API, not active', async function () {
    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: false })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id
    const secret = res1.body.data.secret

    const res2 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ apikey: apikId, secret })
      .catch(v => v)

    assert.strictEqual(res2.status, 401)

    const res4 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res4.status, 200)
  })

  it('Login via API, user not active', async function () {
    // Create inactive user
    const data = { ...global.userCreateData }
    data.active = false
    const rnd = global.rnd()
    data.login = `${data.login}_${rnd}`

    const res0 = await agent
      .post(`${global.host}/api/v1/users`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v => v)
    assert.strictEqual(res0.status, 201)
    const userid = res0.body.data.id

    // Create API key
    const res1 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid, expiresat: '2050-01-01', active: true })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const apikId = res1.body.data.id
    const secret = res1.body.data.secret

    // Login and ensure API key is not allowed
    const res2 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ apikey: apikId, secret })
      .catch(v => v)

    assert.strictEqual(res2.status, 401)

    // Cleanup API key
    const res4 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res4.status, 200)

    // Cleanup user
    const res5 = await agent
      .delete(`${global.host}/api/v1/users/${userid}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res5.status, 200)
  })

  it('Login user, apikey auth method mismatch', async function () {
    const data = { ...global.userCreateDataApiKey }
    const rnd = global.rnd()
    data.login = `${data.login}_${rnd}`

    const res1 = await agent
      .post(`${global.host}/api/v1/users`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v => v)
    assert.strictEqual(res1.status, 201)
    const userId = res1.body.data.id

    const res3 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ username: data.login, password: global.userCreateDataApiKey.password })
      .catch(v => v)
    assert.strictEqual(res3.status, 401)

    const res5 = await agent
      .delete(`${global.host}/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res5.status, 200)
  })

  it('Login user, local auth method mismatch', async function () {
    const data = { ...global.userCreateData }
    const rnd = global.rnd()
    data.login = `${data.login}_${rnd}`

    const res1 = await agent
      .post(`${global.host}/api/v1/users`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v => v)
    assert.strictEqual(res1.status, 201)
    const userId = res1.body.data.id

    const res2 = await global.agent
      .post(`${global.host}/api/v1/apikeys`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'test api key', userid: '0', expiresat: '2050-01-01', active: true })
      .catch(v => v)

    assert.strictEqual(res2.status, 201)
    const apikId = res2.body.data.id
    const secret = res2.body.data.secret

    const res3 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ apikey: apikId, secret })
      .catch(v => v)
    assert.strictEqual(res3.status, 401)

    const res4 = await agent
      .delete(`${global.host}/api/v1/apikeys/${apikId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res4.status, 200)

    const res5 = await agent
      .delete(`${global.host}/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res5.status, 200)
  })
})
