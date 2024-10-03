/* global describe, it, agent, assert */

require('./common.cjs')

describe('Users', function () {
  it('Create and remove user', async () => {
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

    const res2 = await agent
      .delete(`${global.host}/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
  })

  it('Create user, bad data', async () => {
    const data = { ...global.userCreateData }
    const rnd = global.rnd()
    data.login = `${data.login}_${rnd}`
    data.authmethod = 'none'

    const res1 = await agent
      .post(`${global.host}/api/v1/users`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
  })

  it('Delete unexistent user', async () => {
    const res1 = await agent
      .delete(`${global.host}/api/v1/users/000`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 404)
  })

  it('Create duplicate login', async () => {
    const data = { ...global.userCreateData }
    const rnd = global.rnd()
    data.login = `${data.login}_${rnd}`

    const res1 = await agent
      .post(`${global.host}/api/v1/users`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    data.login = data.login.toUpperCase()
    const userId = res1.body.data.id

    const res2 = await agent
      .post(`${global.host}/api/v1/users`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v => v)

    assert.strictEqual(res2.status, 422)

    const res3 = await agent
      .delete(`${global.host}/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Get users list unauthorized', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/users`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Get user as user unauthorized', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/users/0`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Get user unexistent', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/users/000`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 404)
  })

  it('Get user list', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/users`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('Get user', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/users/0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('Update user as admin', async () => {
    const data = global.userCreateData
    const rnd = global.rnd()
    data.login = `${data.login}_${rnd}`

    const res1 = await agent
      .post(`${global.host}/api/v1/users`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(data)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const userId = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ firstname: 'test2' })
      .catch(v => v)

    assert.strictEqual(res2.status, 200)

    const res3 = await agent
      .delete(`${global.host}/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Update user as user, bad data', async () => {
    const res1 = await agent
      .patch(`${global.host}/api/v1/users/user1`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ firstname: 'test2' })
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
  })

  it('Update user as user (change password)', async () => {
    const res1 = await agent
      .patch(`${global.host}/api/v1/users/user1`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ secret: '0' })
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('Update user, unexistent', async () => {
    const res1 = await agent
      .patch(`${global.host}/api/v1/users/000`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ firstname: 'test2' })
      .catch(v => v)

    assert.strictEqual(res1.status, 404)
  })

  it('Update user, forbidden', async () => {
    const res1 = await agent
      .patch(`${global.host}/api/v1/users/0`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ firstname: 'test2' })
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Get user groups', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/users/0/groups`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('Get user groups as user, unauthorized', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/users/0/groups`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Get user own groups', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/users/user1/groups`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('Get user activity desc', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/users/0/activity`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)

    const lastid1 = res1.body.data[0].id

    const res2 = await agent
      .get(`${global.host}/api/v1/users/0/activity?lastid=${lastid1}&sort=0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    const lastid2 = res2.body.data[0].id

    assert.strictEqual(res2.status, 200)
    assert(lastid1 !== lastid2)
  })

  it('Get user activity asc', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/users/0/activity`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)

    const lastid1 = res1.body.data[0].id

    const res2 = await agent
      .get(`${global.host}/api/v1/users/0/activity?lastid=${lastid1}&sort=1`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    const lastid2 = res2.body.data[0].id

    assert.strictEqual(res2.status, 200)
    assert(lastid1 !== lastid2)
  })
})
