import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { PluginHost } from '@sub2api/host'

// An own-level viewer (account:own:read with dynweight:read, no group:read
// or account:read) opens the account list: the plugin asks nothing the core
// refuses (no console 403s); a full-level viewer gets the names and the chip.
const list = vi.fn(async () => ({ items: [{ id: 2, name: 'g' }], total: 1 }))
const get = vi.fn(async () => ({ count: 1, account_ids: [7] }))
let held: string[] = []

// Each test gets fresh modules: the catalog loads its groups once per module.
async function fresh() {
  vi.resetModules()
  const host = await import('./host')
  host.setHost({
    t: (key: string) => key,
    api: { list },
    pluginApi: { get },
    permissions: { has: (k: string) => held.includes(k) }
  } as unknown as PluginHost)
  return host
}

beforeEach(() => {
  list.mockClear()
  get.mockClear()
})
afterEach(async () => (await import('./host')).setHost(null))
enableAutoUnmount(afterEach)

describe('catalog groups', () => {
  it('are not listed without group:read', async () => {
    held = []
    await fresh()
    const { useCatalog } = await import('./catalog')
    expect(useCatalog().groupName(2)).toBe('#2')
    await flushPromises()
    expect(list).not.toHaveBeenCalled()
  })

  it('are listed with group:read', async () => {
    held = ['group:read']
    await fresh()
    const { useCatalog } = await import('./catalog')
    const catalog = useCatalog()
    await flushPromises()
    expect(list).toHaveBeenCalledTimes(1)
    expect(catalog.groupName(2)).toBe('g #2')
  })
})

describe('DegradedBadge', () => {
  const props = { ids: null, setIds: () => {} }

  it('asks nothing and stays hidden without account:read', async () => {
    held = ['account:own:read']
    await fresh()
    const { default: DegradedBadge } = await import('./DegradedBadge.vue')
    const w = mount(DegradedBadge, { props })
    await flushPromises()
    expect(get).not.toHaveBeenCalled()
    expect(w.html()).toBe('<!--v-if-->')
  })

  it('shows the count with account:read', async () => {
    held = ['account:read']
    await fresh()
    const { default: DegradedBadge } = await import('./DegradedBadge.vue')
    mount(DegradedBadge, { props })
    await flushPromises()
    expect(get).toHaveBeenCalledWith('/degraded')
  })
})
