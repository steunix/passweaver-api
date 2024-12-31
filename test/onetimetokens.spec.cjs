/* global describe, it, agent, assert */

require('./common.cjs')

describe('One time tokens', () => {
  it('Create one time token bad data', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ data: 'abc' })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
  })

  it('Create one time token, empty data', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 0, data: '', hours: 1 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
  })

  it('Create one time token, empty itemid', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 1, itemid: '', hours: 1 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
  })

  it('Create one time token, secret', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 0, scope: 0, data: 'abc', hours: 1 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
  })

  it('Create one time token, item', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 1, scope: 0, itemid, hours: 1 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 201)

    // Cleanup
    const res3 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res3.status, 200)
  })

  it('Create one time token, over hours limit', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 0, scope: 0, data: 'abc', hours: 1000 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 422)
  })

  it('Get one time token, secret', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 0, scope: 0, data: 'abc', hours: 1 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const tokenid = res1.body.data.token

    const res2 = await agent
      .get(`${global.host}/api/v1/onetimetokens/${tokenid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
    assert.strictEqual(res2.body.data.secret, 'abc')
  })

  it('Get one time token, item', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/folders/sample1/items`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send(global.itemCreateData)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const itemid = res1.body.data.id

    const res2 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 1, scope: 0, itemid, hours: 1 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 201)
    const tokenid = res2.body.data.token

    const res3 = await agent
      .get(`${global.host}/api/v1/onetimetokens/${tokenid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 200)
    assert.strictEqual(res3.body.data.item.data, global.itemCreateData.data)

    // Cleanup
    const res4 = await agent
      .delete(`${global.host}/api/v1/items/${itemid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)
    assert.strictEqual(res4.status, 200)
  })

  it('Get one time token twice', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 0, scope: 0, data: 'abc', hours: 1 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const tokenid = res1.body.data.token

    const res2 = await agent
      .get(`${global.host}/api/v1/onetimetokens/${tokenid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
    assert.strictEqual(res2.body.data.secret, 'abc')

    const res3 = await agent
      .get(`${global.host}/api/v1/onetimetokens/${tokenid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res3.status, 404)
  })

  it('Get one time token, scope 1, not authorized', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 0, scope: 1, data: 'abc', hours: 1 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const tokenid = res1.body.data.token

    const res2 = await agent
      .get(`${global.host}/api/v1/onetimetokens/${tokenid}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 403)
  })

  it('Get one time token, scope 2, wrong user', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 0, scope: 2, userid: '0', data: 'abc', hours: 1 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const tokenid = res1.body.data.token

    const res2 = await agent
      .get(`${global.host}/api/v1/onetimetokens/${tokenid}`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 403)
  })

  it('Get one time token, scope 2, not logged in', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 0, scope: 2, userid: '0', data: 'abc', hours: 1 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const tokenid = res1.body.data.token

    const res2 = await agent
      .get(`${global.host}/api/v1/onetimetokens/${tokenid}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 403)
  })

  it('Get one time token, scope 2, ok', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/onetimetokens`)
      .send({ type: 0, scope: 2, userid: '0', data: 'abc', hours: 1 })
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
    const tokenid = res1.body.data.token

    const res2 = await agent
      .get(`${global.host}/api/v1/onetimetokens/${tokenid}`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
  })
})
