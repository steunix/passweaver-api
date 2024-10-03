/* global describe, it, agent, assert */

require('./common.cjs')

describe('Groups', function () {
  it('Create, update and delete group', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/groups/0/groups`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(global.groupCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const group = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/groups/${group}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'updated' })
      .catch(v => v)

    assert.strictEqual(res2.status, 200)

    const res3 = await agent
      .delete(`${global.host}/api/v1/groups/${group}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)

    assert.strictEqual(res3.status, 200)
  })

  it('Create, unauthorized', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/groups/0/groups`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.groupCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Create, bad data', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/groups/0/groups`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({})
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
  })

  it('Get group', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/groups/0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
  })

  it('Get group, unexistent', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/groups/000`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 404)
  })

  it('Delete, unauthorized', async () => {
    // Create group
    const res1 = await agent
      .post(`${global.host}/api/v1/groups/0/groups`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(global.groupCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const group = res1.body.data.id

    // Delete
    const res2 = await agent
      .delete(`${global.host}/api/v1/groups/${group}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res2.status, 403)

    // Cleanup
    const res5 = await agent
      .delete(`${global.host}/api/v1/groups/${group}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res5.status, 200)
  })

  it('Delete non empty group', async () => {
    // Create group
    const res1 = await agent
      .post(`${global.host}/api/v1/groups/0/groups`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(global.groupCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const group = res1.body.data.id

    // Add admin
    const res2 = await agent
      .post(`${global.host}/api/v1/groups/${group}/users/0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res2.status, 200)

    // Delete group
    const res3 = await agent
      .delete(`${global.host}/api/v1/groups/${group}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res3.status, 422)

    // Cleanup
    const res4 = await agent
      .delete(`${global.host}/api/v1/groups/${group}/users/0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res4.status, 200)

    const res5 = await agent
      .delete(`${global.host}/api/v1/groups/${group}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res5.status, 200)
  })

  it('Add and remove member', async () => {
    // Create group
    const res1 = await agent
      .post(`${global.host}/api/v1/groups/0/groups`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(global.groupCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const group = res1.body.data.id

    // Add user
    const res2 = await agent
      .post(`${global.host}/api/v1/groups/${group}/users/0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)

    // Remove user
    const res3 = await agent
      .delete(`${global.host}/api/v1/groups/${group}/users/0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res3.status, 200)
  })

  it('Add member, unauthorized', async () => {
    // Create group
    const res1 = await agent
      .post(`${global.host}/api/v1/groups/0/groups`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(global.groupCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const group = res1.body.data.id

    // Add admin
    const res2 = await agent
      .post(`${global.host}/api/v1/groups/${group}/users/0`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 403)

    // Cleanup
    const res5 = await agent
      .delete(`${global.host}/api/v1/groups/${group}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res5.status, 200)
  })

  it('Add member to Everyone, unprocessable', async () => {
    const res1 = await agent
      .delete(`${global.host}/api/v1/groups/E/users/0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 422)
  })

  it('Add member to Root, unprocessable', async () => {
    const res1 = await agent
      .delete(`${global.host}/api/v1/groups/0/users/0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 422)
  })

  it('Remove admin from Admins, unprocessable', async () => {
    const res1 = await agent
      .delete(`${global.host}/api/v1/groups/A/users/0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 422)
  })

  it('Remove admin from Everyone, unprocessable', async () => {
    const res1 = await agent
      .delete(`${global.host}/api/v1/groups/E/users/0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 422)
  })

  it('Update system groups, unprocessable', async () => {
    const res1 = await agent
      .patch(`${global.host}/api/v1/groups/0`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'description' })
      .catch(v => v)

    assert.strictEqual(res1.status, 422)

    const res2 = await agent
      .patch(`${global.host}/api/v1/groups/A`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'description' })
      .catch(v => v)

    assert.strictEqual(res2.status, 422)

    const res3 = await agent
      .patch(`${global.host}/api/v1/groups/E`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'description' })
      .catch(v => v)

    assert.strictEqual(res3.status, 422)
  })

  it('Update group, bad data', async () => {
    // Create group
    const res1 = await agent
      .post(`${global.host}/api/v1/groups/0/groups`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(global.groupCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const group = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/groups/${group}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: '' })
      .catch(v => v)

    assert.strictEqual(res2.status, 400)

    const res3 = await agent
      .delete(`${global.host}/api/v1/groups/${group}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send({ description: 'description' })
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })
})
