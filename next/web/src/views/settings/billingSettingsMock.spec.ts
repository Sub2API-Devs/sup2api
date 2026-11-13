// @vitest-environment node
// The billing and gateway settings of the dev mock hold to the server's
// (CONTRACTS §8, §25.8, §84.1): the client disconnect policy and the
// claude_max_tokens rule are read, written and checked as there.
import { beforeAll, describe, expect, it } from 'vitest'
import { mockServer, type MockServer } from '@/testing/mockServer'

let call: MockServer['call'], fields: MockServer['fields']
beforeAll(async () => {
  ;({ call, fields } = await mockServer('core', 'billing'))
})

const settings = async () => (await call('GET', '/settings/billing')).body.data
const put = async (patch: object) => call('PUT', '/settings/billing', { ...(await settings()), ...patch })

describe('the billing settings in the mock', () => {
  it('carry the client disconnect policy, by default continue', async () => {
    const data = await settings()
    expect(data).toMatchObject({ client_disconnect_policy: 'continue' })
    expect(data).not.toHaveProperty('client_disconnect_wait_seconds')
  })

  it('keep a policy that is saved', async () => {
    const saved = await put({ client_disconnect_policy: 'free' })
    expect(saved.status).toBe(200)
    expect(saved.body.data).toMatchObject({ client_disconnect_policy: 'free' })
    expect(await settings()).toMatchObject({ client_disconnect_policy: 'free' })
  })

  it('keep the policy a body leaves out', async () => {
    const rest = { ...(await settings()) }
    delete rest.client_disconnect_policy
    expect((await call('PUT', '/settings/billing', rest)).body.data).toMatchObject({ client_disconnect_policy: 'free' })
  })

  it('refuse an unknown policy, naming the field', async () => {
    const a = await put({ client_disconnect_policy: 'later' })
    expect([a.status, a.body.error.code, fields(a)]).toEqual([400, 'invalid_argument', ['client_disconnect_policy']])
    // What Go cannot bind into the settings is a 400 without fields.
    const b = await put({ client_disconnect_policy: 1 })
    expect([b.status, b.body.error.code, fields(b)]).toEqual([400, 'invalid_argument', undefined])
    expect(await settings()).toMatchObject({ client_disconnect_policy: 'free' })
  })
})

describe('the claude_max_tokens rule in the mock', () => {
  const gateway = async () => (await call('GET', '/settings/gateway')).body.data
  const putRule = async (rule: unknown) => call('PUT', '/settings/gateway', { ...(await gateway()), claude_max_tokens: rule })
  const codes = (a: Awaited<ReturnType<typeof call>>) => a.body.error?.details?.fields?.map((f: { code: string }) => f.code)

  it('is off by default with the suggested default row, and is replaced as a whole', async () => {
    expect((await gateway()).claude_max_tokens).toEqual({ enabled: false, models: { default: 8192 } })
    expect((await putRule({ enabled: true, models: { 'claude-x': 4096 } })).body.data.claude_max_tokens).toEqual({
      enabled: true,
      models: { 'claude-x': 4096 }
    })
    expect((await putRule({ enabled: false, models: {} })).body.data.claude_max_tokens).toEqual({ enabled: false, models: {} })
    expect((await putRule({ enabled: true })).body.data.claude_max_tokens).toEqual({ enabled: true, models: { default: 8192 } })
  })

  it('refuses bad models with the server codes on claude_max_tokens', async () => {
    const many = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`m${i}`, 1]))
    // 100 names of 200 three-byte characters compile to more than 64 KiB.
    const long = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`${i}`.padEnd(200, '模'), 1]))
    for (const [models, code] of [
      [many, 'too_many'],
      [{ ' m': 1 }, 'invalid_model'],
      [{ ['x'.repeat(201)]: 1 }, 'invalid_model'],
      [{ m: 0 }, 'out_of_range'],
      [{ m: 1048577 }, 'out_of_range'],
      [long, 'too_large']
    ] as const) {
      const a = await putRule({ enabled: true, models })
      expect([a.status, fields(a), codes(a)]).toEqual([400, ['claude_max_tokens'], [code]])
    }
    expect((await putRule({ enabled: true, models: { ['😀'.repeat(200)]: 1 } })).status).toBe(200)
  })

  it('answers what Go cannot bind with a 400 without fields', async () => {
    for (const rule of [{ enabled: 'yes' }, { enabled: true, models: { m: 1.5 } }, 'on']) {
      const a = await putRule(rule)
      expect([a.status, a.body.error.code, fields(a)]).toEqual([400, 'invalid_argument', undefined])
    }
  })
})
