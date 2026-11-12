// @vitest-environment node
// The group pricing endpoints of the dev mock (web/mock, vite --mode mock)
// hold to what the server answers (CONTRACTS §97.6): the shape of a list
// price, who may read what, and the errors. The mock is node code outside
// the app's type program, so it is loaded by path and its answers are untyped.
import { beforeAll, describe, expect, it } from 'vitest'

type Answer = { status: number; body: any }
type Route = { method: string; re: RegExp; keys: string[]; handler: (req: unknown) => unknown }

const mockFile = (name: string) => new URL(`../../../mock/${name}.ts`, import.meta.url).pathname
let routes: Route[] = []

beforeAll(async () => {
  routes = (await import(/* @vite-ignore */ mockFile('router'))).routes
  for (const area of ['core', 'accounts', 'resources', 'billing', 'pricing']) await import(/* @vite-ignore */ mockFile(area))
})

/** Answers a request as the mock server does: a plain value is wrapped in {data}. */
async function call(method: string, url: string, body?: unknown, token?: string): Promise<Answer> {
  const u = new URL(url, 'http://mock')
  for (const r of routes) {
    const m = r.method === method ? r.re.exec(u.pathname) : null
    if (!m) continue
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]))
    const out: any = await r.handler({ method, path: u.pathname, params, query: Object.fromEntries(u.searchParams), body, headers: token ? { authorization: `Bearer ${token}` } : {} })
    return out && typeof out === 'object' && '__status' in out ? { status: out.__status, body: out.body } : { status: 200, body: { data: out } }
  }
  throw new Error(`no mock route for ${method} ${url}`)
}

/** The access token of a mock identity (password admin). */
async function signIn(email: string): Promise<string> {
  return (await call('POST', '/auth/login', { email, password: 'admin' })).body.data.access_token
}

const fields = (a: Answer) => a.body.error?.details?.fields?.map((f: { field: string }) => f.field)

describe('the list price of a multiplier rule in the mock', () => {
  it('is the global price as it is with the multiplier beside it, in the model prices of a group', async () => {
    const { body } = await call('GET', '/groups/1/model-prices')
    const row = body.data.models.find((m: { model: string }) => m.model === 'gpt-4o')
    expect(row.group_rule).toEqual({ kind: 'multiplier', multiplier: '1.2' })
    expect(row.list_price).toEqual({ ...row.base, multiplier: '1.2' })
  })

  it('is the same in the caller’s own prices of a group and in a quote', async () => {
    const mine = (await call('GET', '/me/prices?group_id=1')).body.data
    const own = mine.prices.find((p: { model: string }) => p.model === 'gpt-4o-mini')
    const base = (await call('GET', '/groups/1/model-prices')).body.data.models.find((m: { model: string }) => m.model === 'gpt-4o-mini').base
    expect(own).toMatchObject({ ...base, multiplier: '0.8', source: 'segment' })

    const quote = (await call('POST', '/pricing/quote', { user_id: 1, group_id: 1, model: 'gpt-4o-mini', usage: { p: 1_000_000, c: 0, cc1h: 0 } })).body.data
    expect(quote.list_price).toEqual({ ...base, multiplier: '0.8' })
    expect(Number(quote.list_cost)).toBeCloseTo(Number(base.config.p) * 0.8, 8)
  })

  it('keeps a custom price a price of its own, without a multiplier', async () => {
    const row = (await call('GET', '/groups/1/model-prices')).body.data.models.find((m: { model: string }) => m.model === 'web-search')
    expect(row.list_price).toMatchObject({ mode: 'per_request', config: { price: 0.008 } })
    expect(row.list_price.multiplier).toBeUndefined()
  })
})

describe('the quote in the mock', () => {
  it('takes exactly one of a user and a user group, as a 400 on user_id', async () => {
    const both = await call('POST', '/pricing/quote', { user_id: 1, segment_id: 2, group_id: 1, model: 'gpt-4o', usage: { p: 1, c: 1 } })
    const neither = await call('POST', '/pricing/quote', { group_id: 1, model: 'gpt-4o', usage: { p: 1, c: 1 } })
    for (const a of [both, neither]) {
      expect(a.status).toBe(400)
      expect(a.body.error.code).toBe('invalid_argument')
      expect(fields(a)).toEqual(['user_id'])
    }
  })

  it('answers a usage the price cannot be evaluated with by a 400 without fields', async () => {
    const a = await call('POST', '/pricing/quote', { segment_id: 2, group_id: 1, model: 'gpt-4o', usage: { p: -1_000_000, c: 0 } })
    expect(a.status).toBe(400)
    expect(a.body.error.code).toBe('invalid_argument')
    expect(a.body.error.details?.fields).toBeUndefined()
  })
})

describe('what a caller without user:read sees in the mock', () => {
  let pricer = ''
  beforeAll(async () => {
    pricer = await signIn('pricer@example.com')
  })

  it('names a personal user group by its user id, without the user, and does not search users', async () => {
    const list = (await call('GET', '/segments?kind=personal', undefined, pricer)).body.data.data
    expect(list.map((s: { name: string }) => s.name)).toEqual(['#104', '#107'])
    expect(list.every((s: object) => !('user' in s))).toBe(true)
    expect((await call('GET', '/segments?kind=personal&q=user5', undefined, pricer)).body.data.data).toEqual([])

    const admin = (await call('GET', '/segments?kind=personal&q=user5')).body.data.data
    expect(admin.map((s: { name: string; user: { id: number } }) => [s.name, s.user.id])).toEqual([['user5@example.org', 104]])
  })

  it('masks it in the rows of a group and in a quote too', async () => {
    const rows = (await call('GET', '/groups/2/segments', undefined, pricer)).body.data
    expect(rows.filter((r: { segment: { kind: string } }) => r.segment.kind === 'personal').map((r: { segment: { name: string } }) => r.segment.name)).toEqual(['#104', '#107'])
    const quote = (await call('POST', '/pricing/quote', { user_id: 104, group_id: 2, model: 'claude-sonnet-4-5', usage: { p: 1, c: 1 } }, pricer)).body.data
    expect(quote.segment).toEqual({ id: 11, kind: 'personal', name: '#104', user_id: 104 })
  })

  it('may not list the members of a user group, nor put a new user in one', async () => {
    const members = await call('GET', '/segments/2/members', undefined, pricer)
    expect(members.status).toBe(403)
    expect(members.body.error.details).toEqual({ permission: 'user:read' })
    const created = await call('POST', '/users', { email: 'x@example.com', password: 'longenough', segment_id: 2 }, pricer)
    expect(created.status).toBe(403)
    expect(created.body.error.details).toEqual({ permission: 'segment:manage' })
  })
})

describe('the rest of the group pricing mock', () => {
  it('lists who may use a private group only', async () => {
    const rows = (await call('GET', '/groups?page_size=200')).body.data.data
    const access = (id: number) => rows.find((g: { id: number }) => g.id === id).access
    expect(access(1)).toEqual({ segments: [], personal_count: 0 })
    expect(access(2).segments.map((s: { name: string }) => s.name)).toEqual(['VIP', '企业客户'])
    expect(access(2).personal_count).toBe(2)
  })

  it('gives the caller’s groups the fields of the server, no more', async () => {
    const [first] = (await call('GET', '/me/groups')).body.data
    expect(Object.keys(first).sort()).toEqual(['description', 'effective_rate', 'exclusive', 'id', 'model_allowlist', 'model_filter_mode', 'name', 'platforms', 'rate_multiplier', 'rate_source'])
  })

  it('keeps the names of user groups unique without regard to case, and at most 100 characters', async () => {
    const taken = await call('POST', '/segments', { name: 'vip' })
    expect([taken.status, fields(taken)]).toEqual([400, ['name']])
    const long = await call('POST', '/segments', { name: 'x'.repeat(101) })
    expect([long.status, fields(long)]).toEqual([400, ['name']])
  })
})
