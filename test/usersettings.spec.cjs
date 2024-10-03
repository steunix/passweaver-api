/* global describe, it, agent, assert */

require('./common.cjs')

describe('User settings', function () {
  it('Set settings', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/users/0/settings`)
      .send([{ setting: 'theme', value: 'dark' }])
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
  })

  it('Set settings, bad data', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/users/0/settings`)
      .send([{ setting: 'theme' }])
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 400)
  })

  it('Get settings', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/users/0/settings`)
      .send([{ setting: 'theme', value: 'dark' }])
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 201)

    const res2 = await agent
      .get(`${global.host}/api/v1/users/0/settings`)
      .set('Authorization', `Bearer ${global.adminJWT}`)
      .catch(v => v)

    assert.strictEqual(res2.status, 200)
    assert.doesNotThrow(() => { return res2.body.data.length })
  })

  it('Set settings unauthorized', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/users/0/settings`)
      .send([{ setting: 'theme', value: 'dark' }])
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })

  it('Get settings unauthorized', async () => {
    const res1 = await agent
      .get(`${global.host}/api/v1/users/0/settings`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .catch(v => v)

    assert.strictEqual(res1.status, 403)
  })
})
