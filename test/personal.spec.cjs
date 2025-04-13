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
})
