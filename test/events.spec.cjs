/* global describe, it, agent, assert */

require('./common.cjs')

describe('Events', function () {
  it('Add event', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/events`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ event: 1, entity: 1, entityid: '1' })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
  })

  it('Add event with note', async () => {
    const res1 = await agent
      .post(`${global.host}/api/v1/events`)
      .set('Authorization', `Bearer ${global.userJWT}`)
      .send({ event: 1, entity: 1, entityid: '1', note: 'note' })
      .catch(v => v)

    assert.strictEqual(res1.status, 201)
  })
})
