// @vitest-environment node
// The billing settings of the dev mock hold to the server's (CONTRACTS §8,
// §25.8): the client disconnect policy is read, written and checked as there.
import { beforeAll, describe, expect, it } from 'vitest'
import { mockServer, type MockServer } from '@/testing/mockServer'

let call: MockServer['call'], fields: MockServer['fields']
beforeAll(async () => {
  ;({ call, fields } = await mockServer('core', 'billing'))
})

const settings = async () => (await call('GET', '/settings/billing')).body.data
const put = async (patch: object) => call('PUT', '/settings/billing', { ...(await settings()), ...patch })

describe('the billing settings in the mock', () => {
  it('carry the client disconnect policy, by default continue for 120 seconds', async () => {
    expect(await settings()).toMatchObject({ client_disconnect_policy: 'continue', client_disconnect_wait_seconds: 120 })
  })

  it('keep a policy and a wait that are saved', async () => {
    const saved = await put({ client_disconnect_policy: 'free', client_disconnect_wait_seconds: 300 })
    expect(saved.status).toBe(200)
    expect(saved.body.data).toMatchObject({ client_disconnect_policy: 'free', client_disconnect_wait_seconds: 300 })
    expect(await settings()).toMatchObject({ client_disconnect_policy: 'free', client_disconnect_wait_seconds: 300 })
  })

  it('keep the policy and the wait a body leaves out', async () => {
    const rest = { ...(await settings()) }
    delete rest.client_disconnect_policy
    delete rest.client_disconnect_wait_seconds
    expect((await call('PUT', '/settings/billing', rest)).body.data).toMatchObject({
      client_disconnect_policy: 'free',
      client_disconnect_wait_seconds: 300
    })
  })

  it('refuse an unknown policy and a wait outside 5–1800 seconds, naming each field', async () => {
    for (const [patch, field] of [
      [{ client_disconnect_policy: 'later' }, 'client_disconnect_policy'],
      [{ client_disconnect_wait_seconds: 4 }, 'client_disconnect_wait_seconds'],
      [{ client_disconnect_wait_seconds: 1801 }, 'client_disconnect_wait_seconds']
    ] as const) {
      const a = await put(patch)
      expect([a.status, a.body.error.code, fields(a)]).toEqual([400, 'invalid_argument', [field]])
    }
    // What Go cannot bind into the settings is a 400 without fields.
    for (const patch of [{ client_disconnect_wait_seconds: 10.5 }, { client_disconnect_policy: 1 }]) {
      const a = await put(patch)
      expect([a.status, a.body.error.code, fields(a)]).toEqual([400, 'invalid_argument', undefined])
    }
    expect(await settings()).toMatchObject({ client_disconnect_policy: 'free', client_disconnect_wait_seconds: 300 })
  })
})
