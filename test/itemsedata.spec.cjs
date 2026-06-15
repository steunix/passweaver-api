/* global describe, it, agent, assert */

require('./common.cjs')

describe('Items enterprise data', () => {
  it('Add enterprise data to enterprise personal item', async () => {
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

    // Create item
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/user1/items`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res2.status, 201)
    const itemid = res2.body.data.id

    // Set enterprise flag
    const res3 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .send({ enterprise: true })
      .catch(v => v)
    assert.strictEqual(res3.status, 200)

    // Add enterprise data
    const edata = {
      data: 'abc'
    }

    const res4 = await agent
      .post(`${global.host}/api/v1/items/${itemid}/edata`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .send(edata)
      .catch(v => v)

    assert.strictEqual(res4.status, 201)

    // Get enterprise data
    const res5 = await agent
      .get(`${global.host}/api/v1/items/${itemid}/edata?key=${global.key}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res5.status, 200)
    res5.body.data.data = await global.decryptBlock(res5.body.data.data, global.key)

    assert.strictEqual(res5.body.data.data.length, edata.data.length)
    assert.strictEqual(res5.body.data.data, edata.data)

    // Cleanup
    const res6 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .catch(v => v)

    assert.strictEqual(res6.status, 200)
  })

  it('Add enterprise data to non enterprise personal item', async () => {
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

    // Create item
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/user1/items`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res2.status, 201)
    const itemid = res2.body.data.id

    // Add enterprise data
    const edata = {
      data: 'abc'
    }

    const res4 = await agent
      .post(`${global.host}/api/v1/items/${itemid}/edata`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .send(edata)
      .catch(v => v)

    assert.strictEqual(res4.status, 422)

    // Cleanup
    const res6 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .catch(v => v)

    assert.strictEqual(res6.status, 200)
  })

  it('Add enterprise data to non-personal item', async () => {
    // Create item
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    // Add enterprise data
    const edata = {
      data: 'abc'
    }

    const res2 = await agent
      .post(`${global.host}/api/v1/items/${itemid}/edata`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(edata)
      .catch(v => v)

    assert.strictEqual(res2.status, 403)

    // Cleanup
    const res3 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res3.status, 200)
  })

  it('Set enterprise flag to non-personal item', async () => {
    // Create item
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    // Set enterprise flag
    const res2 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ enterprise: true })
      .catch(v => v)

    assert.strictEqual(res2.status, 422)

    // Cleanup
    const res3 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res3.status, 200)
  })

  it('Read enterprise data as non admin', async () => {
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

    // Create item
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/user1/items`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res2.status, 201)
    const itemid = res2.body.data.id

    // Set enterprise flag
    const res3 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .send({ enterprise: true })
      .catch(v => v)
    assert.strictEqual(res3.status, 200)

    // Add enterprise data
    const edata = {
      data: 'abc'
    }

    const res4 = await agent
      .post(`${global.host}/api/v1/items/${itemid}/edata`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .send(edata)
      .catch(v => v)

    assert.strictEqual(res4.status, 201)

    // Get enterprise data
    const res5 = await agent
      .get(`${global.host}/api/v1/items/${itemid}/edata?key=${global.key}`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .catch(v => v)

    assert.strictEqual(res5.status, 403)

    // Cleanup
    const res6 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${res1.body.data.jwt}`)
      .catch(v => v)

    assert.strictEqual(res6.status, 200)
  })
})
