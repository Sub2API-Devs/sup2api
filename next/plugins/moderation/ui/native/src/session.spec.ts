import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { ApiError, session, type PluginHost } from '@sub2api/host'
import { useCatalog } from './catalog'
import { errorMessage, jsonBytes, MAX_PLUGIN_BODY_BYTES, recentFrom, runTest, setHost } from './host'
import { unwatchSession, watchSession } from './session'

// A plugin host whose t() returns the key with its params, and whose plugin
// API answers from `answer`.
let answer: (method: string, path: string, body?: unknown) => Promise<unknown>
function fakeHost(): PluginHost {
  const call = (method: string) => (path: string, body?: unknown) => answer(method, path, body)
  return {
    plugin: { key: 'moderation', version: '0', assetBase: '', trust: 'official' },
    pluginApi: { get: call('GET'), post: call('POST'), put: call('PUT'), patch: call('PATCH'), del: call('DELETE'), list: call('LIST') },
    api: { get: call('CORE GET'), list: async () => ({ items: [], page: { page: 1, page_size: 0, total: 0 }, paged: false }) },
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
    permissions: { superuser: () => true, has: () => true, any: () => true },
    can: () => true,
    toast: () => undefined
  } as unknown as PluginHost
}

beforeEach(() => {
  answer = async () => []
  setHost(fakeHost())
})
afterEach(() => {
  unwatchSession()
  setHost(null)
})

describe('request body size', () => {
  it('counts UTF-8 bytes of the JSON body', () => {
    expect(jsonBytes({ text: '审核' })).toBe(JSON.stringify({ text: '' }).length + 6)
  })

  it('refuses a body over 1 MiB before sending it', async () => {
    const post = vi.fn(async () => ({}))
    answer = post
    await expect(runTest('x'.repeat(MAX_PLUGIN_BODY_BYTES), [])).rejects.toThrow(/^bodyTooLarge /)
    expect(post).not.toHaveBeenCalled()
    await runTest('small', [])
    expect(post).toHaveBeenCalledOnce()
  })

  it('names the core 413 instead of the generic failure', () => {
    const e = new ApiError(413, { code: 'payload_too_large', message: 'request body too large' })
    expect(errorMessage(e, 'actionFailed')).toMatch(/^bodyTooLargeServer /)
    expect(errorMessage(new ApiError(400, { code: 'invalid_argument', message: 'bad' }), 'actionFailed')).toBe('bad')
  })
})

describe('recentFrom', () => {
  it('is 30 days back, RFC 3339 without fractions', () => {
    expect(recentFrom(Date.UTC(2026, 9, 31, 12, 0, 0, 123))).toBe('2026-10-01T12:00:00Z')
  })
})

describe('session end', () => {
  it('drops the catalog, and a load of the old session writes nothing', async () => {
    let release: (v: unknown) => void = () => undefined
    answer = async (_m, path) => (path === '/flows' ? [{ id: 1, name: 'f', version: 1 }] : [])
    session.set({ access_token: 'a', refresh_token: 'r', expires_at: Date.now() + 3600_000 })
    watchSession()
    const catalog = useCatalog()
    await catalog.refresh()
    expect(catalog.state.flows).toHaveLength(1)

    // a reload that answers only after the session ended
    answer = (_m, path) => (path === '/flows' ? new Promise((r) => (release = r)) : Promise.resolve([]))
    const pending = catalog.refresh(['flows'])
    session.clear()
    expect(catalog.state.flows).toHaveLength(0)
    expect(catalog.state.loaded).toBe(false)
    release([{ id: 2, name: 'old', version: 1 }])
    await pending
    await nextTick()
    expect(catalog.state.flows).toHaveLength(0)
  })
})
