import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fileURLToPath, URL } from 'node:url'
import type { UIPlugin } from '@/api/types'

const mocks = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('@sub2api/host', async (importOriginal) => {
  const real = await importOriginal<typeof import('@sub2api/host')>()
  const ctx = { i18n: { t: (k: string) => k, addMessages: () => undefined }, permissions: { has: () => true } }
  return { ...real, api: { ...real.api, get: mocks.get }, useHost: () => ctx }
})

import { usePluginStore } from './plugins'

// Native entries are real modules under __fixtures__ (asset_base points there).
const fixtures = fileURLToPath(new URL('./__fixtures__', import.meta.url))
const FAST = 'fast'
const SLOW = 'slow'
const plugin = (key: string, entry: string): UIPlugin =>
  ({ key, version: '1.0.0', name: key, asset_base: fixtures, native_entry: entry, trust: 'official', host_ui_compat: '*', menus: [], pages: {}, slots: [] }) as unknown as UIPlugin

const release = () => (globalThis as { __releaseSlowPlugin?: () => void }).__releaseSlowPlugin
const until = async (cond: () => unknown) => {
  for (let i = 0; i < 300 && !cond(); i++) await new Promise((r) => setTimeout(r, 10))
}

describe('plugin store loading', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.get.mockReset()
  })

  it('publishes the list before the native modules finish and tracks each plugin on its own', async () => {
    mocks.get.mockResolvedValue([plugin(FAST, 'fast-plugin.ts'), plugin(SLOW, 'slow-plugin.ts')])
    const store = usePluginStore()
    const done = store.refresh()

    await store.whenListed()
    expect(store.listed).toBe(true)
    expect(store.uiPlugins.map((p) => p.key)).toEqual([FAST, SLOW])
    expect(store.ready).toBe(false)

    await until(() => store.component(FAST, 'FastPage') && release())
    expect(store.component(FAST, 'FastPage')).toBeTruthy()
    expect(store.pending[FAST]).toBeUndefined()
    expect(store.pending[SLOW]).toBe(true)
    expect(store.ready).toBe(false)

    release()!()
    await done
    expect(store.component(SLOW, 'SlowPage')).toBeTruthy()
    expect(store.pending[SLOW]).toBeUndefined()
    expect(store.ready).toBe(true)
  })

  it('lists and becomes ready when GET /ui/plugins fails', async () => {
    mocks.get.mockRejectedValue(new Error('down'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const store = usePluginStore()
    await store.refresh()
    expect(store.listed).toBe(true)
    expect(store.ready).toBe(true)
    expect(store.uiPlugins).toEqual([])
  })

  it('whenListed resolves at once when no refresh is running', async () => {
    const store = usePluginStore()
    await expect(store.whenListed()).resolves.toBeUndefined()
  })
})
