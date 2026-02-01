/* global describe, it, agent, assert */

require('./common.cjs')

describe('Linked items', () => {
  it('Create, get and delete linked item', async () => {
    // Create an item
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    // Create linked item
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/sample1/linkeditems`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ linkeditemid: itemid })
      .catch(v => v)

    assert.strictEqual(res2.status, 201)
    const linkeditemid = res2.body.data.id

    // Get item via linked item
    const res3 = await agent
      .get(`${global.host}/api/v1/items/${linkeditemid}?key=${global.key}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    res3.body.data.data = await global.decryptBlock(res3.body.data.data, global.key)

    assert.strictEqual(res3.status, 200)
    assert.strictEqual(res3.body.data.data, global.itemCreateData.data)

    // Delete linked item
    const res4 = await agent
      .delete(`${global.host}/api/v1/items/${linkeditemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res4.status, 200)

    // Delete item
    const res5 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res5.status, 200)
  })

  it('Check linked items list on original', async () => {
    // Create an item
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    // Create linked item #1
    const res21 = await agent
      .post(`${global.host}/api/v1/folders/sample1/linkeditems`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ linkeditemid: itemid })
      .catch(v => v)

    assert.strictEqual(res21.status, 201)
    const linkeditemid1 = res21.body.data.id

    // Create linked item #2
    const res22 = await agent
      .post(`${global.host}/api/v1/folders/sample1/linkeditems`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ linkeditemid: itemid })
      .catch(v => v)

    assert.strictEqual(res22.status, 201)
    const linkeditemid2 = res22.body.data.id

    // Get original item and check linked items list
    const res3 = await agent
      .get(`${global.host}/api/v1/items/${itemid}?key=${global.key}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    res3.body.data.data = await global.decryptBlock(res3.body.data.data, global.key)

    assert.strictEqual(res3.status, 200)
    assert.strictEqual(res3.body.data.childrenlinkeditems.length, 2)
    assert.strictEqual(res3.body.data.childrenlinkeditems.includes(linkeditemid1), true)
    assert.strictEqual(res3.body.data.childrenlinkeditems.includes(linkeditemid2), true)

    // Delete linked item #1
    const res41 = await agent
      .delete(`${global.host}/api/v1/items/${linkeditemid1}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res41.status, 200)

    // Delete linked item #2
    const res42 = await agent
      .delete(`${global.host}/api/v1/items/${linkeditemid2}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res42.status, 200)

    // Delete item
    const res5 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res5.status, 200)
  })

  it('Create linked item and modify original title', async () => {
    // Create an item
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    // Create linked item
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/sample1/linkeditems`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ linkeditemid: itemid })
      .catch(v => v)

    assert.strictEqual(res2.status, 201)
    const linkeditemid = res2.body.data.id

    // Modify original item's title
    const newTitle = 'Modified title'
    const resMod = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ title: newTitle })
      .catch(v => v)

    assert.strictEqual(resMod.status, 200)

    // Get item via linked item
    const res3 = await agent
      .get(`${global.host}/api/v1/items/${linkeditemid}?key=${global.key}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    res3.body.data.data = await global.decryptBlock(res3.body.data.data, global.key)

    assert.strictEqual(res3.status, 200)
    assert.strictEqual(res3.body.data.title, newTitle)

    // Delete linked item
    const res4 = await agent
      .delete(`${global.host}/api/v1/items/${linkeditemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res4.status, 200)

    // Delete item
    const res5 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res5.status, 200)
  })

  it('Create linked item, and delete original item', async () => {
    // Create an item
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    // Create linked item 1
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/sample1/linkeditems`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ linkeditemid: itemid })
      .catch(v => v)

    assert.strictEqual(res2.status, 201)
    const linkeditemid1 = res2.body.data.id

    // Create linked item 2
    const res3 = await agent
      .post(`${global.host}/api/v1/folders/sample1/linkeditems`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ linkeditemid: itemid })
      .catch(v => v)

    assert.strictEqual(res3.status, 201)
    const linkeditemid2 = res3.body.data.id

    // Delete original item
    const res4 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res4.status, 200)

    // Check linked items does not exist anymore
    const res5 = await agent
      .get(`${global.host}/api/v1/items/${linkeditemid1}?key=${global.key}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res5.status, 404)

    const res6 = await agent
      .get(`${global.host}/api/v1/items/${linkeditemid2}?key=${global.key}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res6.status, 404)
  })

  it('Check title an metadata syncronization', async () => {
    const itemDataOriginal = {
      title: global.rnd('title'),
      metadata: global.rnd('metadata'),
      data: global.rnd('item data')
    }

    const itemDataModified = {
      title: global.rnd('title'),
      metadata: global.rnd('metadata'),
      data: global.rnd('item data')
    }

    // Create an item
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(itemDataOriginal)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    // Create linked item
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/sample1/linkeditems`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ linkeditemid: itemid })
      .catch(v => v)

    assert.strictEqual(res2.status, 201)

    // Search items by title, check 2 items returned (original and linked)
    const res3 = await agent
      .get(`${global.host}/api/v1/items?search=${itemDataOriginal.title}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
    assert.strictEqual(res3.body.data.length, 2)

    // Search items by metadata, check 2 items returned (original and linked)
    const res4 = await agent
      .get(`${global.host}/api/v1/items?search=${itemDataOriginal.metadata}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res4.status, 200)
    assert.strictEqual(res4.body.data.length, 2)

    // Update item with new data
    const res5 = await agent
      .patch(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(itemDataModified)
      .catch(v => v)

    assert.strictEqual(res5.status, 200)

    // Search items by title, check 2 items returned (original and linked)
    const res6 = await agent
      .get(`${global.host}/api/v1/items?search=${itemDataModified.title}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res6.status, 200)
    assert.strictEqual(res6.body.data.length, 2)

    // Search items by metadata, check 2 items returned (original and linked)
    const res7 = await agent
      .get(`${global.host}/api/v1/items?search=${itemDataModified.metadata}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res7.status, 200)
    assert.strictEqual(res7.body.data.length, 2)

    // Delete original item
    const res8 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res8.status, 200)
  })

  it('Update linked item, forbidden', async () => {
    // Create an item
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    // Create linked item
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/sample1/linkeditems`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ linkeditemid: itemid })
      .catch(v => v)

    assert.strictEqual(res2.status, 201)
    const linkeditemid = res2.body.data.id

    // Try to update linked item
    const res5 = await agent
      .patch(`${global.host}/api/v1/items/${linkeditemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ title: 'test' })
      .catch(v => v)

    assert.strictEqual(res5.status, 403)

    // Delete item
    const res6 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res6.status, 200)
  })

  it('Clone linked item', async () => {
    // Create an item
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    // Create linked item
    const res2 = await agent
      .post(`${global.host}/api/v1/folders/sample1/linkeditems`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ linkeditemid: itemid })
      .catch(v => v)

    assert.strictEqual(res2.status, 201)
    const linkeditemid = res2.body.data.id

    // Clone linked item
    const res5 = await agent
      .post(`${global.host}/api/v1/items/${linkeditemid}/clone`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res5.status, 201)
    const clonedid = res5.body.data.id

    // Get cloned item
    const res6 = await agent
      .get(`${global.host}/api/v1/items/${clonedid}?key=${global.key}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res6.status, 200)
    assert.strictEqual(res6.body.data.title, global.itemCreateData.title + ' - Copy')

    // Delete item
    const res7 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res7.status, 200)
  })
})
