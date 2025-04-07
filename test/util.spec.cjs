/* global describe, it, agent, assert */

require('./common.cjs')

describe('Utils', function () {
  it('Reset cache', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/clearcache`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('Reset cache, unauthorized', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/clearcache`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Get info', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/util/info`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('Get info, unauthorized', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/util/info`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Lock system, unauthorized', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/systemlock`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Unlock system, unauthorized', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/systemunlock`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Lock system', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/systemlock`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)

    const res2 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ username: 'admin', password: '0' })
      .catch(v => v)

    global.adminJWT = res2.body.data.jwt

    const res3 = await agent
      .get(`${global.host}/api/v1/users/0/settings`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    for (const item of res3?.body?.data) {
      if (item.setting === 'systemlock') {
        assert.strictEqual(item.value, '1')
      }
    }

    const res4 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ username: 'USER1', password: '0' })
      .catch(v => v)

    assert.strictEqual(res4.status, 401)
  })

  it('Unlock system unauthorized', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/systemunlock`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)

    const res2 = await agent
      .get(`${global.host}/api/v1/users/0/settings`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    for (const item of res2?.body?.data) {
      if (item.setting === 'systemlock') {
        assert.strictEqual(item.value, '0')
      }
    }

    const res3 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ username: 'USER1', password: '0' })
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })
})
