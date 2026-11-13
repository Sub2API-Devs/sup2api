import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Me } from '@/api/types'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@sub2api/host', async importOriginal => {
  const real = await importOriginal<typeof import('@sub2api/host')>()
  return { ...real, api: { ...real.api, get: mocks.get } }
})
vi.mock('./app', () => ({ refreshShell: vi.fn(async () => undefined) }))

import { ApiError } from '@sub2api/host'
import { useAuthStore } from './auth'
import { createAuthzWatch, watchPermissions } from './authzWatch'

describe('createAuthzWatch', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = (known: number | null = 5) => {
    const refresh = vi.fn(async () => undefined)
    let now = 0
    const w = createAuthzWatch({ known: () => known, refresh, now: () => now })
    return { w, refresh, tick: (ms: number) => (now += ms) }
  }

  it('reloads once for a version above the one in hand, debounced', () => {
    const { w, refresh } = setup()
    w.version(6)
    w.version(6)
    w.version(7)
    vi.advanceTimersByTime(999)
    expect(refresh).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(refresh).toHaveBeenCalledTimes(1)
    // Another node still answering with 6 or 7 triggers nothing again.
    w.version(6)
    w.version(7)
    vi.advanceTimersByTime(2000)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('ignores versions not above the one in hand, and any before /me', () => {
    const { w, refresh } = setup()
    w.version(5)
    w.version(3)
    vi.advanceTimersByTime(2000)
    expect(refresh).not.toHaveBeenCalled()
    const none = setup(null)
    none.w.version(9)
    none.w.forbidden()
    vi.advanceTimersByTime(2000)
    expect(none.refresh).not.toHaveBeenCalled()
  })

  it('skips a pending reload once the /me in hand caught up, or after sign-out', () => {
    let known: number | null = 5
    const refresh = vi.fn(async () => undefined)
    const w = createAuthzWatch({ known: () => known, refresh })
    w.version(6)
    known = 7 // the reload of another trigger read a newer /me
    vi.advanceTimersByTime(1000)
    w.version(8)
    known = null
    vi.advanceTimersByTime(1000)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('throttles reloads after permission denials to one per 10s', () => {
    const { w, refresh, tick } = setup()
    w.forbidden()
    w.forbidden()
    expect(refresh).toHaveBeenCalledTimes(1)
    tick(9_999)
    w.forbidden()
    expect(refresh).toHaveBeenCalledTimes(1)
    tick(1)
    w.forbidden()
    expect(refresh).toHaveBeenCalledTimes(2)
  })
})

describe('refreshPermissions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.get.mockReset()
  })

  it('a call during a reload gets one more reload after it, shared by later calls', async () => {
    let release!: () => void
    mocks.get.mockImplementationOnce(() => new Promise(r => (release = () => r({ id: 1, permissions: [] }))))
    mocks.get.mockResolvedValue({ id: 1, permissions: ['user:read'] })
    const auth = useAuthStore()
    const first = auth.refreshPermissions()
    const second = auth.refreshPermissions()
    const third = auth.refreshPermissions()
    release()
    await Promise.all([first, second, third])
    expect(mocks.get.mock.calls.filter(c => c[0] === '/me')).toHaveLength(2)
    expect(auth.me?.permissions).toEqual(['user:read'])
    expect(auth.permissionsEpoch).toBe(2)
  })
})

describe('watchPermissions', () => {
  const page = defineComponent({ template: '<div />' })
  const me = (permissions: string[], authz_version: number): Me =>
    ({ id: 2, email: 'a@x', display_name: 'a', roles: ['admin'], permissions, superuser: false, authz_version }) as Me

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    mocks.get.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('leaves the current page for /forbidden when the reload drops its permission', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/users', component: page, meta: { perm: 'user:read' } },
        { path: '/forbidden', component: page }
      ]
    })
    const auth = useAuthStore()
    auth.me = me(['user:read'], 4)
    await router.push('/users')
    const hooks = watchPermissions(router)
    mocks.get.mockImplementation(async (path: string) => (path === '/me' ? me([], 5) : {}))

    hooks.onAuthzVersion!(5)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/forbidden'))
    expect(router.currentRoute.value.query.perm).toBe('user:read')
    expect(mocks.get.mock.calls.filter(c => c[0] === '/me')).toHaveLength(1)

    // Only permission_denied reloads; a step-up demand does not.
    hooks.onForbidden!(new ApiError(403, { code: 'verification_required', message: '' }))
    await vi.advanceTimersByTimeAsync(0)
    expect(mocks.get.mock.calls.filter(c => c[0] === '/me')).toHaveLength(1)
    hooks.onForbidden!(new ApiError(403, { code: 'permission_denied', message: '' }))
    await vi.waitFor(() => expect(mocks.get.mock.calls.filter(c => c[0] === '/me')).toHaveLength(2))
  })
})
