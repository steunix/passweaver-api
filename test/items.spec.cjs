/* global describe, it, agent, assert */

require('./common.cjs')

describe('Items', () => {
  it('Create, update and remove item', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ metadata: 'test' })
      .catch(v => v)

    assert.strictEqual(res2.status, 200)

    // Cleanup
    const res3 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res3.status, 200)
  })

  it('Create item, bad data', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateDataBad)
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
  })

  it('Create item, unexistent folder', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/000/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 404)
  })

  it('Create item, unauthorized as user', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample2/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Create item, unauthorized as admin', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample2/items`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Create item, system folders', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/0/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 422)

    const res2 = await agent
      .post(`${global.host}/api/v1/folders/P/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res2.status, 422)
  })

  it('List items in folder', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)

    const res2 = await agent
      .get(`${global.host}/api/v1/items?search`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
  })

  it('Update item, bad type', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ type: '01918da0-9777-7486-8aa4-aa989d5047d7' })
      .catch(v => v)

    assert.strictEqual(res2.status, 422)

    const res3 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Update item, bad data', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ title: '' })
      .catch(v => v)

    assert.strictEqual(res2.status, 400)

    const res3 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Get item, unexistent', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/items/000?key=${global.key}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 404)
  })

  it('Get item', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)

    const itemid = res1.body.data.id

    const res2 = await agent
      .get(`${global.host}/api/v1/items/${itemid}?key=${global.key}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)
    res2.body.data.data = await global.decryptBlock(res2.body.data.data, global.key)

    assert.strictEqual(res2.body.data.data, global.itemCreateData.data)

    // Cleanup
    const res3 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res3.status, 200)
  })

  it('Get item, unauthorized as admin', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .get(`${global.host}/api/v1/items/${itemid}?key=${global.key}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)
    assert.strictEqual(res2.status, 403)

    // Cleanup
    const res3 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res3.status, 200)
  })

  it('Get item activity desc', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .get(`${global.host}/api/v1/items/${itemid}/activity`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
    assert(res2.body.data.length > 0)

    const res3 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Get item activity asc', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .get(`${global.host}/api/v1/items/${itemid}/activity?sort=1`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
    assert(res2.body.data.length > 0)

    const res3 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
  })

  it('Set item favorite', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    // Set favorite
    const res2 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ favorite: true })
      .catch(v => v)
    assert.strictEqual(res2.status, 200)

    const res3 = await agent
      .get(`${global.host}/api/v1/items/${itemid}?key=${global.key}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    res3.body.data.data = await global.decryptBlock(res3.body.data.data, global.key)

    assert.strictEqual(res3.status, 200)
    assert(res3.body.data.favorite, true)

    // Get favorite items
    const res7 = await agent
      .get(`${global.host}/api/v1/folders/sample1/items?favorite=true`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res7.status, 200)
    assert(res7.body.data.length, true)
    assert(res7.body.data[0].favorite, true)

    // Unset favorite
    const res4 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ favorite: false })
      .catch(v => v)
    assert.strictEqual(res4.status, 200)

    const res5 = await agent
      .get(`${global.host}/api/v1/items/${itemid}?key=${global.key}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res5.status, 200)

    res5.body.data.data = await global.decryptBlock(res5.body.data.data, global.key)

    assert.strictEqual(res5.body.data.favorite, false)

    // Cleanup
    const res6 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res6.status, 200)
  })

  it('Get item 100 times and measure time (below 2 seconds)', async () => {
    // Create an item to fetch
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const start = Date.now()

    for (let i = 0; i < 100; i++) {
      const res = await agent
        .get(`${global.host}/api/v1/items/${itemid}?key=${global.key}`)
        .set('Authorization', `Bearer ${global.userJWT}`)
        .catch(v => v)

      assert.strictEqual(res.status, 200)
    }

    const end = Date.now()
    const elapsed = end - start
    console.log(`Fetching the item 100 times took ${elapsed} ms`)

    assert(elapsed < 2000, 'Fetching took too long')

    // Cleanup
    const res2 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res2.status, 200)
  })
})
