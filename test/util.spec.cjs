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
    global.userJWT = res3.body.data.jwt

    assert.strictEqual(res3.status, 200)

    const res4 = await agent
      .post(`${global.host}/api/v1/login`)
      .send({ username: 'ADMIN', password: '0' })
      .catch(v => v)
    global.adminJWT = res4.body.data.jwt

    assert.strictEqual(res4.status, 200)
  })

  it('Get system readonly mode', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/util/systemreadonly`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res1.status, 200)
    assert.strictEqual(res1.body.data.readonly, false)
  })

  it('Get system lock status', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/util/systemlock`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res1.status, 200)
    assert.strictEqual(res1.body.data.locked, false)
  })

  it('Set system readonly, user', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/systemreadonly`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Set system read write, user', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/systemreadwrite`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Set system readonly', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/systemreadonly`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)

    // Item
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)
    assert.strictEqual(res2.status, 409)

    // User
    const data = { ...global.userCreateData }
    const rnd = global.rnd()
    data.login = `${data.login}_${rnd}`
    const res3 = await agent
      .post(`${global.host}/api/v1/users`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v => v)
    assert.strictEqual(res3.status, 409)

    // Folder
    const res4 = await agent
      .post(`${global.host}/api/v1/folders/sample1/folders`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.folderCreateData)
      .catch(v => v)
    assert.strictEqual(res4.status, 409)

    // Group
    const res5 = await agent
      .post(`${global.host}/api/v1/groups/0/groups`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(global.groupCreateData)
      .catch(v => v)
    assert.strictEqual(res5.status, 409)

    const resx = await agent
      .post(`${global.host}/api/v1/util/systemreadwrite`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(resx.status, 200)
  })

  it('Set system readwrite', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/util/systemreadwrite`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)

    const res2 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)
    assert.strictEqual(res2.status, 201)
  })
})
