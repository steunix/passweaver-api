/* global describe, it, agent, assert */

require('./common.cjs')

describe('Personal folders', function () {
  it('Set personal password', async () => {
    // Delete personal password. Ignore the error.
    await agent
      .delete(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    const res2 = await agent
      .post(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
  })

  it('Unlock personal folders', async () => {
    // Set personal password. Ignore the error, the password could be already set
    await agent
      .post(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    const res2 = await agent
      .post(`${global.host}/api/v1/personal/unlock`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
    assert(Object.hasOwn(res2.body.data, 'jwt'))
  })

  it('Create, update and remove personal item', async () => {
    // Delete personal password. Ignore the error.
    await agent
      .delete(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    await agent
      .post(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    const res1 = await agent
      .post(`${global.host}/api/v1/personal/unlock`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    assert.strictEqual(res1.status, 200)
    assert(Object.hasOwn(res1.body.data, 'jwt'))

    const res2 = await agent
      .post(`${global.host}/api/v1/folders/user1/items`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res2.status, 201)
    const itemid = res2.body.data.id

    const res3 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .send({ metadata: 'test' })
      .catch(v => v)

    assert.strictEqual(res3.status, 200)

    // Cleanup
    const res4 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .catch(v => v)
    assert.strictEqual(res4.status, 200)
  })

  it('Reset personal password', async () => {
    // Delete personal password. Ignore the error.
    await agent
      .delete(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    const res1 = await agent
      .post(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    assert.strictEqual(res1.status, 200)

    const res2 = await agent
      .delete(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)

    const res3 = await agent
      .post(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Set personal password when already set', async () => {
    // Delete personal password. Ignore the error.
    await agent
      .delete(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    const res1 = await agent
      .post(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    assert.strictEqual(res1.status, 200)

    const res2 = await agent
      .post(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    assert.strictEqual(res2.status, 422)
  })

  it('Move item from non personal folder to personal', async () => {
    // Set personal password. Ignore the error, the password could be already set
    await agent
      .post(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    // Unlock personal folder
    const res1 = await agent
      .post(`${global.host}/api/v1/personal/unlock`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)
    const newJWT = res1.body.data.jwt

    // Create item in non personal folder
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${newJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)
    assert.strictEqual(res2.status, 201)
    const itemid = res2.body.data.id

    // Move item to personal folder
    const res3 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${newJWT}`)
      .send({ folder: 'user1' })
      .catch(v => v)
    assert.strictEqual(res3.status, 200)

    // Verify item
    const res4 = await agent
      .get(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${newJWT}`)
      .catch(v => v)
    assert.strictEqual(res4.status, 200)
    assert.strictEqual(res4.body.data.folderid, 'user1')
    assert.strictEqual(res4.body.data.title, global.itemCreateData.title)
    assert.strictEqual(res4.body.data.description, global.itemCreateData.description)
    assert.strictEqual(res4.body.data.data, global.itemCreateData.data)
    assert.strictEqual(res4.body.data.personal, true)

    // Cleanup
    const res5 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${newJWT}`)
      .catch(v => v)
    assert.strictEqual(res5.status, 200)
  })

  it('Move item from personal folder to non personal', async () => {
    // Set personal password. Ignore the error, the password could be already set
    await agent
      .post(`${global.host}/api/v1/personal/password`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)

    // Unlock personal folder
    const res1 = await agent
      .post(`${global.host}/api/v1/personal/unlock`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ password: '123' })
      .catch(v => v)
    const newJWT = res1.body.data.jwt

    // Create item in non personal folder
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/user1/items`)
      .set('Authorization', `Bearer ${newJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)
    assert.strictEqual(res2.status, 201)
    const itemid = res2.body.data.id

    // Move item to non personal folder
    const res3 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${newJWT}`)
      .send({ folder: 'sample1' })
      .catch(v => v)
    assert.strictEqual(res3.status, 200)

    // Verify item
    const res4 = await agent
      .get(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${newJWT}`)
      .catch(v => v)
    assert.strictEqual(res4.status, 200)
    assert.strictEqual(res4.body.data.folderid, 'sample1')
    assert.strictEqual(res4.body.data.title, global.itemCreateData.title)
    assert.strictEqual(res4.body.data.description, global.itemCreateData.description)
    assert.strictEqual(res4.body.data.data, global.itemCreateData.data)
    assert.strictEqual(res4.body.data.personal, false)

    // Cleanup
    const res5 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${newJWT}`)
      .catch(v => v)
    assert.strictEqual(res5.status, 200)
  })

  it('Move item from non personal folder to personal, unlocked', async () => {
    // Create item in non personal folder
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)
    assert.strictEqual(res2.status, 201)
    const itemid = res2.body.data.id

    // Move item to personal folder
    const res3 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ folder: 'user1' })
      .catch(v => v)
    assert.strictEqual(res3.status, 417)

    // Cleanup
    const res5 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res5.status, 200)
  })
})
