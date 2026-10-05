import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// http.ts keeps module state (session, config): every test
// gets a fresh copy. Migrated from scripts/http-headers-test.mjs and extended
// with refresh / error-envelope cases.
type Http = typeof import('./http')
let http: Http

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(status < 400 ? { data } : { error: data }), { status, headers })

beforeEach(async () => {
  vi.resetModules()
  localStorage.clear()
  http = await import('./http')
})

afterEach(() => {
  http.session.clear()
  vi.unstubAllGlobals()
})

function stubFetch(fn: (url: string, init: RequestInit & { headers: Record<string, string> }) => Response | Promise<Response>) {
  const spy = vi.fn(fn)
  vi.stubGlobal('fetch', spy)
  return spy
}

describe('envelope', () => {
  it('unwraps data and lists, synthesising page for bare arrays', async () => {
    stubFetch((url) => {
      if (url.includes('/paged')) return new Response(JSON.stringify({ data: [1, 2], page: { page: 1, page_size: 2, total: 9 } }))
      if (url.includes('/bare')) return new Response(JSON.stringify({ data: [1, 2, 3] }))
      return json({ ok: true })
    })
    expect(await http.api.get('/x')).toEqual({ ok: true })
    const paged = await http.api.list<number>('/paged')
    expect(paged).toMatchObject({ items: [1, 2], paged: true, page: { total: 9 } })
    const bare = await http.api.list<number>('/bare')
    expect(bare).toMatchObject({ items: [1, 2, 3], paged: false, page: { page: 1, page_size: 3, total: 3 } })
  })

  it('builds query strings: drops empty values, repeats arrays', async () => {
    const f = stubFetch(() => json(null))
    await http.api.get('/q', { a: 1, b: '', c: null, d: undefined, e: ['x', 'y'], f: false })
    expect(f.mock.calls[0][0]).toBe('/api/v1/q?a=1&e=x&e=y&f=false')
  })

  it('throws ApiError with flattened localized field errors', async () => {
    http.configureHttp({ locale: () => 'zh' })
    stubFetch(() =>
      json(
        {
          code: 'invalid_argument',
          message: 'bad',
          details: { fields: [{ field: 'name', message: 'required' }, { field: 'expr', message: { en: 'syntax', zh: '语法' } }] }
        },
        400
      )
    )
    const err = await http.api.post('/x', {}).catch((e) => e)
    expect(http.isApiError(err)).toBe(true)
    expect(err.code).toBe('invalid_argument')
    expect(err.fields).toEqual({ name: 'required', expr: '语法' })
  })

  it('maps HTTP status when the body has no error code', async () => {
    stubFetch(() => new Response('oops', { status: 409 }))
    const err = await http.api.get('/x').catch((e) => e)
    expect(err.code).toBe('conflict')
  })

  it('returns null for 204', async () => {
    stubFetch(() => new Response(null, { status: 204 }))
    expect(await http.api.del('/x')).toBeNull()
  })

  it('surfaces 403 as-is without retrying', async () => {
    const f = stubFetch(() => json({ code: 'permission_denied', message: 'no' }, 403))
    await expect(http.api.post('/danger')).rejects.toMatchObject({ status: 403, code: 'permission_denied' })
    expect(f).toHaveBeenCalledTimes(1)
  })
})

describe('response headers', () => {
  it('reports headers of the final response only', async () => {
    stubFetch(() => json({ core: 'b' }, 200, { 'X-Sub2api-Entry-Node': 'gateway-a' }))
    const direct = await http.requestWithHeaders<{ core: string }>('GET', '/system/version')
    expect(direct.headers.get('x-sub2api-entry-node')).toBe('gateway-a')
    expect(direct.data.core).toBe('b')

    const cb = vi.fn()
    stubFetch(() => json({ code: 'unavailable', message: 'down' }, 503, { 'X-Sub2api-Entry-Node': 'untrusted' }))
    await expect(http.requestWithHeaders('GET', '/system/version', { onSuccessHeaders: cb })).rejects.toBeInstanceOf(http.ApiError)
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('token refresh', () => {
  it('refreshes once on 401 and retries with the new token', async () => {
    http.session.set({ access_token: 'old', refresh_token: 'r1', expires_at: Date.now() + 60_000 })
    const f = stubFetch((url, init) => {
      if (url.endsWith('/auth/refresh')) return json({ access_token: 'new', refresh_token: 'r2', expires_in: 3600 })
      if (init.headers.Authorization === 'Bearer old') return json({ code: 'unauthenticated', message: 'expired' }, 401, { 'X-Sub2api-Entry-Node': 'first' })
      return json({ ok: 1 }, 200, { 'X-Sub2api-Entry-Node': 'final' })
    })
    const r = await http.requestWithHeaders('GET', '/x')
    expect(r.headers.get('x-sub2api-entry-node')).toBe('final')
    expect(f).toHaveBeenCalledTimes(3)
    expect(http.session.get()?.refresh_token).toBe('r2')
  })

  it('shares one refresh between parallel 401s', async () => {
    http.session.set({ access_token: 'old', refresh_token: 'r1', expires_at: Date.now() + 60_000 })
    let refreshes = 0
    stubFetch(async (url, init) => {
      if (url.endsWith('/auth/refresh')) {
        refreshes++
        await new Promise((r) => setTimeout(r, 10))
        return json({ access_token: 'new', refresh_token: 'r2', expires_in: 3600 })
      }
      return init.headers.Authorization === 'Bearer new' ? json(1) : json({ code: 'unauthenticated' }, 401)
    })
    await Promise.all([http.api.get('/a'), http.api.get('/b'), http.api.get('/c')])
    expect(refreshes).toBe(1)
  })

  it('signs out when the refresh token is rejected', async () => {
    http.session.set({ access_token: 'old', refresh_token: 'r1', expires_at: Date.now() + 60_000 })
    const onUnauthenticated = vi.fn()
    http.configureHttp({ onUnauthenticated })
    stubFetch((url) => (url.endsWith('/auth/refresh') ? json({ code: 'invalid' }, 401) : json({ code: 'unauthenticated' }, 401)))
    await expect(http.api.get('/x')).rejects.toBeInstanceOf(http.ApiError)
    expect(http.session.get()).toBeNull()
    expect(onUnauthenticated).toHaveBeenCalledWith('expired')
  })

  it('keeps the session when refresh fails with a server error', async () => {
    http.session.set({ access_token: 'old', refresh_token: 'r1', expires_at: Date.now() + 60_000 })
    const onUnauthenticated = vi.fn()
    http.configureHttp({ onUnauthenticated })
    stubFetch((url) => (url.endsWith('/auth/refresh') ? new Response('', { status: 502 }) : json({ code: 'unauthenticated' }, 401)))
    await expect(http.api.get('/x')).rejects.toBeInstanceOf(http.ApiError)
    expect(http.session.get()?.refresh_token).toBe('r1')
    expect(onUnauthenticated).not.toHaveBeenCalled()
  })
})

describe('keep-alive', () => {
  let stop: () => void = () => {}
  beforeEach(() => {
    stop = http.startKeepAlive()
  })
  afterEach(() => stop())
  it('is due only within the renewal window of a session with a refresh token', () => {
    const now = 1_000_000
    expect(http.renewalDue(null, now)).toBe(false)
    expect(http.renewalDue({ access_token: 'a', refresh_token: 'r', expires_at: now + 10 * 60_000 }, now)).toBe(false)
    expect(http.renewalDue({ access_token: 'a', refresh_token: 'r', expires_at: now + 60_000 }, now)).toBe(true)
    expect(http.renewalDue({ access_token: 'a', refresh_token: '', expires_at: now }, now)).toBe(false)
  })

  it('renews a token about to expire when the page becomes visible', async () => {
    http.session.set({ access_token: 'old', refresh_token: 'r1', expires_at: Date.now() + 60_000 })
    const spy = stubFetch(() => json({ access_token: 'new', refresh_token: 'r2', expires_in: 7200 }))
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(http.session.get()?.access_token).toBe('new'))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toContain('/auth/refresh')
    expect(http.session.get()?.refresh_token).toBe('r2')
  })

  it('leaves a fresh token alone', async () => {
    http.session.set({ access_token: 'a', refresh_token: 'r', expires_at: Date.now() + 3600_000 })
    const spy = stubFetch(() => json({}))
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((r) => setTimeout(r, 20))
    expect(spy).not.toHaveBeenCalled()
  })
})
